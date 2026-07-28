package it.luxury.bootstrap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Locale;

@Component
@Order(0)
public class ScheduledNotificationSchemaAlignmentRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(ScheduledNotificationSchemaAlignmentRunner.class);
	private static final String TABLE = "scheduled_notifications";
	private final DataSource dataSource;

	public ScheduledNotificationSchemaAlignmentRunner(DataSource dataSource) {
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) throws SQLException {
		try (Connection c = dataSource.getConnection()) {
			if (!tableExists(c, TABLE)) {
				return;
			}
			ensureColumn(
					c,
					"owner_deleted_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN owner_deleted_at TIMESTAMP NULL");
			ensureColumn(
					c,
					"staff_deleted_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN staff_deleted_at TIMESTAMP NULL");
			ensureColumn(
					c,
					"consumer_deleted_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN consumer_deleted_at TIMESTAMP NULL");
			/* Messaggi piattaforma (super admin) senza appuntamento: colonne + appointment_id nullable. */
			ensureStudioGroupIdColumn(c);
			ensureColumn(
					c,
					"platform_message_subject",
					"ALTER TABLE " + TABLE + " ADD COLUMN platform_message_subject VARCHAR(200) NULL");
			ensureColumn(
					c,
					"platform_message_body",
					"ALTER TABLE " + TABLE + " ADD COLUMN platform_message_body VARCHAR(4000) NULL");
			tryMakeAppointmentIdNullable(c);
			ensureColumn(
					c,
					"whatsapp_sent_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN whatsapp_sent_at TIMESTAMP NULL");
			ensureRecipientConsumerIdColumn(c);
			ensureColumn(
					c,
					"recipient_consumer_deleted_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN recipient_consumer_deleted_at TIMESTAMP NULL");
			ensureColumn(
					c,
					"support_request_from_salon",
					"ALTER TABLE " + TABLE + " ADD COLUMN support_request_from_salon TINYINT(1) NULL");
			ensureColumn(
					c,
					"previous_appointment_start",
					"ALTER TABLE " + TABLE + " ADD COLUMN previous_appointment_start TIMESTAMP NULL");
		}
	}

	private static boolean tableExists(Connection c, String table) throws SQLException {
		DatabaseMetaData md = c.getMetaData();
		String catalog = c.getCatalog();
		try (ResultSet rs = md.getTables(catalog, null, table, new String[] { "TABLE" })) {
			if (rs.next()) return true;
		}
		try (ResultSet rs = md.getTables(catalog, null, table.toUpperCase(), new String[] { "TABLE" })) {
			return rs.next();
		}
	}

	private static boolean columnExists(Connection c, String table, String column) throws SQLException {
		DatabaseMetaData md = c.getMetaData();
		String catalog = c.getCatalog();
		try (ResultSet rs = md.getColumns(catalog, null, table, column)) {
			if (rs.next()) return true;
		}
		try (ResultSet rs = md.getColumns(catalog, null, table.toUpperCase(), column.toUpperCase())) {
			return rs.next();
		}
	}

	private static void ensureColumn(Connection c, String column, String alterSql) throws SQLException {
		if (columnExists(c, TABLE, column)) {
			return;
		}
		log.info("Schema alignment: aggiungo colonna {}.{}", TABLE, column);
		try (Statement st = c.createStatement()) {
			st.execute(alterSql);
		}
	}

	/** Stesso tipo di {@code studio_groups.id} così Hibernate/JDBC non mischanano UUID. */
	private static void ensureStudioGroupIdColumn(Connection c) throws SQLException {
		if (columnExists(c, TABLE, "studio_group_id")) {
			return;
		}
		String idType = readStudioGroupsIdColumnType(c);
		String alter = "ALTER TABLE " + TABLE + " ADD COLUMN studio_group_id " + idType + " NULL";
		log.info("Schema alignment: aggiungo colonna {}.studio_group_id ({})", TABLE, idType);
		try (Statement st = c.createStatement()) {
			st.execute(alter);
		}
	}

	/** Stesso tipo di {@code consumer_profiles.id} per FK {@code recipient_consumer_id}. */
	private static void ensureRecipientConsumerIdColumn(Connection c) throws SQLException {
		if (columnExists(c, TABLE, "recipient_consumer_id")) {
			return;
		}
		String idType = readConsumerProfilesIdColumnType(c);
		String alter = "ALTER TABLE " + TABLE + " ADD COLUMN recipient_consumer_id " + idType + " NULL";
		log.info("Schema alignment: aggiungo colonna {}.recipient_consumer_id ({})", TABLE, idType);
		try (Statement st = c.createStatement()) {
			st.execute(alter);
		}
	}

	private static String readConsumerProfilesIdColumnType(Connection c) {
		String postgresType = readPostgresColumnType(c, "consumer_profiles", "id");
		if (postgresType != null) {
			return postgresType;
		}
		try (PreparedStatement ps = c.prepareStatement(
				"""
				SELECT COLUMN_TYPE
				FROM INFORMATION_SCHEMA.COLUMNS
				WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = 'consumer_profiles'
				AND COLUMN_NAME = 'id'
				""");
				ResultSet rs = ps.executeQuery()) {
			if (rs.next()) {
				String t = rs.getString(1);
				if (t != null && !t.isBlank() && isSafeSqlColumnTypeToken(t)) {
					return t.trim();
				}
			}
		}
		catch (SQLException e) {
			log.warn("Schema alignment: tipo consumer_profiles.id non letto, uso BINARY(16): {}", e.getMessage());
		}
		return "BINARY(16)";
	}

	private static String readStudioGroupsIdColumnType(Connection c) {
		String postgresType = readPostgresColumnType(c, "studio_groups", "id");
		if (postgresType != null) {
			return postgresType;
		}
		try (PreparedStatement ps = c.prepareStatement(
				"""
				SELECT COLUMN_TYPE
				FROM INFORMATION_SCHEMA.COLUMNS
				WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = 'studio_groups'
				AND COLUMN_NAME = 'id'
				""");
				ResultSet rs = ps.executeQuery()) {
			if (rs.next()) {
				String t = rs.getString(1);
				if (t != null && !t.isBlank() && isSafeSqlColumnTypeToken(t)) {
					return t.trim();
				}
			}
		}
		catch (SQLException e) {
			log.warn("Schema alignment: tipo studio_groups.id non letto, uso BINARY(16): {}", e.getMessage());
		}
		return "BINARY(16)";
	}

	/** Consente solo definizioni tipo MariaDB da INFORMATION_SCHEMA.COLUMN_TYPE (no SQL arbitrario). */
	private static boolean isSafeSqlColumnTypeToken(String raw) {
		if (raw.length() > 120) {
			return false;
		}
		for (int i = 0; i < raw.length(); i++) {
			char ch = raw.charAt(i);
			boolean ok = (ch >= 'a' && ch <= 'z')
					|| (ch >= 'A' && ch <= 'Z')
					|| (ch >= '0' && ch <= '9')
					|| ch == '('
					|| ch == ')'
					|| ch == ' '
					|| ch == '_'
					|| ch == '-'
					|| ch == ',';
			if (!ok) {
				return false;
			}
		}
		return true;
	}

	/**
	 * I messaggi {@code ADMIN_PLATFORM_MESSAGE} non hanno appuntamento: {@code appointment_id} deve essere NULL in DB.
	 */
	private static void tryMakeAppointmentIdNullable(Connection c) {
		try {
			if (!columnExists(c, TABLE, "appointment_id")) {
				return;
			}
		}
		catch (SQLException e) {
			log.warn("Schema alignment: verifica colonna {}.appointment_id fallita: {}", TABLE, e.getMessage());
			return;
		}
		String db = databaseProductName(c);
		if (isPostgres(db)) {
			tryMakeAppointmentIdNullablePostgres(c);
			return;
		}
		tryMakeAppointmentIdNullableMariaDb(c);
	}

	private static void tryMakeAppointmentIdNullablePostgres(Connection c) {
		String nullable = null;
		try (PreparedStatement ps = c.prepareStatement(
				"""
				SELECT is_nullable
				FROM information_schema.columns
				WHERE table_schema = current_schema()
				AND table_name = ?
				AND column_name = 'appointment_id'
				""")) {
			ps.setString(1, TABLE);
			try (ResultSet rs = ps.executeQuery()) {
				if (!rs.next()) {
					return;
				}
				nullable = rs.getString(1);
			}
		}
		catch (SQLException e) {
			log.warn("Schema alignment: lettura metadata {}.appointment_id fallita (PostgreSQL): {}", TABLE, e.getMessage());
			return;
		}
		if (nullable != null && "YES".equalsIgnoreCase(nullable.trim())) {
			return;
		}
		String alter = "ALTER TABLE " + TABLE + " ALTER COLUMN appointment_id DROP NOT NULL";
		log.info("Schema alignment: {} (appointment_id nullable)", alter);
		try (Statement st = c.createStatement()) {
			st.execute(alter);
		}
		catch (SQLException e) {
			log.warn("Schema alignment: appointment_id DROP NOT NULL fallito (PostgreSQL): {}", e.getMessage());
		}
	}

	private static void tryMakeAppointmentIdNullableMariaDb(Connection c) {
		String colType = null;
		String nullable = null;
		try (PreparedStatement ps = c.prepareStatement(
				"""
				SELECT IS_NULLABLE, COLUMN_TYPE
				FROM INFORMATION_SCHEMA.COLUMNS
				WHERE TABLE_SCHEMA = DATABASE()
				AND TABLE_NAME = ?
				AND COLUMN_NAME = 'appointment_id'
				""")) {
			ps.setString(1, TABLE);
			try (ResultSet rs = ps.executeQuery()) {
				if (!rs.next()) {
					return;
				}
				nullable = rs.getString(1);
				colType = rs.getString(2);
			}
		}
		catch (SQLException e) {
			log.warn("Schema alignment: lettura metadata {}.appointment_id fallita: {}", TABLE, e.getMessage());
			return;
		}
		if (nullable != null && "YES".equalsIgnoreCase(nullable.trim())) {
			return;
		}
		if (colType == null || colType.isBlank()) {
			return;
		}
		String alter = "ALTER TABLE " + TABLE + " MODIFY COLUMN appointment_id " + colType + " NULL";
		log.info("Schema alignment: {} (appointment_id nullable)", alter);
		try (Statement st = c.createStatement()) {
			st.execute(alter);
		}
		catch (SQLException e) {
			log.warn(
					"Schema alignment: MODIFY appointment_id NULL fallito (tipo DB={}). Avvia manualmente su MariaDB: {} — errore: {}",
					colType,
					alter,
					e.getMessage());
		}
	}

	private static String databaseProductName(Connection c) {
		try {
			return c.getMetaData().getDatabaseProductName();
		}
		catch (SQLException e) {
			return "";
		}
	}

	private static boolean isPostgres(String databaseProductName) {
		return databaseProductName != null && databaseProductName.toLowerCase(Locale.ROOT).contains("postgresql");
	}

	/** Tipo colonna PostgreSQL (es. {@code uuid}) per ADD COLUMN allineato a Hibernate. */
	private static String readPostgresColumnType(Connection c, String table, String column) {
		if (!isPostgres(databaseProductName(c))) {
			return null;
		}
		try (PreparedStatement ps = c.prepareStatement(
				"""
				SELECT udt_name
				FROM information_schema.columns
				WHERE table_schema = current_schema()
				AND table_name = ?
				AND column_name = ?
				""")) {
			ps.setString(1, table);
			ps.setString(2, column);
			try (ResultSet rs = ps.executeQuery()) {
				if (!rs.next()) {
					return "UUID";
				}
				String udt = rs.getString(1);
				if (udt == null || udt.isBlank()) {
					return "UUID";
				}
				return udt.trim().toUpperCase(Locale.ROOT);
			}
		}
		catch (SQLException e) {
			log.warn(
					"Schema alignment: tipo {}.{} non letto (PostgreSQL), uso UUID: {}",
					table,
					column,
					e.getMessage());
			return "UUID";
		}
	}
}
