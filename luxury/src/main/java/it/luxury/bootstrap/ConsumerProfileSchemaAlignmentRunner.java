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
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

@Component
@Order(0)
public class ConsumerProfileSchemaAlignmentRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(ConsumerProfileSchemaAlignmentRunner.class);
	private static final String TABLE = "consumer_profiles";
	private final DataSource dataSource;

	public ConsumerProfileSchemaAlignmentRunner(DataSource dataSource) {
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) throws SQLException {
		try (Connection c = dataSource.getConnection()) {
			if (!tableExists(c, TABLE)) {
				return;
			}
			renameLegacyAuthSubColumn(c);
			ensureColumn(c, "notification_inbox_sent_ack_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN notification_inbox_sent_ack_at TIMESTAMP NULL");
			ensureColumn(c, "notification_inbox_ack_booking_confirmation_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN notification_inbox_ack_booking_confirmation_at TIMESTAMP NULL");
			ensureColumn(c, "notification_inbox_ack_booking_updated_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN notification_inbox_ack_booking_updated_at TIMESTAMP NULL");
			ensureColumn(c, "notification_inbox_ack_booking_cancelled_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN notification_inbox_ack_booking_cancelled_at TIMESTAMP NULL");
			ensureColumn(c, "notification_inbox_ack_system_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN notification_inbox_ack_system_at TIMESTAMP NULL");
			ensureColumn(
					c,
					"notification_inbox_ack_support_request_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN notification_inbox_ack_support_request_at TIMESTAMP NULL");
			ensureColumn(c, "country", "ALTER TABLE " + TABLE + " ADD COLUMN country VARCHAR(2) NULL");
			ensureColumn(c, "email_verified_at", "ALTER TABLE " + TABLE + " ADD COLUMN email_verified_at TIMESTAMP NULL");
			ensureColumn(
					c,
					"email_verification_token_hash",
					"ALTER TABLE " + TABLE + " ADD COLUMN email_verification_token_hash VARCHAR(64) NULL");
			ensureColumn(
					c,
					"email_verification_expires_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN email_verification_expires_at TIMESTAMP NULL");
			backfillLegacyEmailVerification(c);
		}
	}

	/**
	 * Account creati prima della conferma email obbligatoria (salone demo, seed, import): considerati verificati.
	 * Idempotente: non tocca profili già verificati né registrazioni in sospeso senza password.
	 */
	private static void backfillLegacyEmailVerification(Connection c) throws SQLException {
		if (!columnExists(c, TABLE, "email_verified_at") || !columnExists(c, TABLE, "password_hash")) {
			return;
		}
		String sql = """
				UPDATE consumer_profiles
				SET email_verified_at = COALESCE(email_verified_at, created_at, CURRENT_TIMESTAMP)
				WHERE email_verified_at IS NULL
				  AND password_hash IS NOT NULL
				""";
		try (Statement st = c.createStatement()) {
			int updated = st.executeUpdate(sql);
			if (updated > 0) {
				log.info(
						"Schema alignment: {} profili legacy con password marcate email verificata su {}",
						updated,
						TABLE);
			}
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

	/** Migrazione naming legacy {@code keycloak_sub} → {@code auth_sub} (idempotente). */
	private static void renameLegacyAuthSubColumn(Connection c) throws SQLException {
		if (!columnExists(c, TABLE, "keycloak_sub") || columnExists(c, TABLE, "auth_sub")) {
			return;
		}
		String sql = renameColumnSql(c.getMetaData().getDatabaseProductName(), TABLE, "keycloak_sub", "auth_sub",
				"VARCHAR(256) NOT NULL");
		log.info("Schema alignment: rinomino {}.keycloak_sub → auth_sub", TABLE);
		try (Statement st = c.createStatement()) {
			st.execute(sql);
		}
	}

	private static String renameColumnSql(
			String databaseProductName,
			String table,
			String oldColumn,
			String newColumn,
			String mariadbColumnDef) {
		String p = databaseProductName == null ? "" : databaseProductName.toLowerCase();
		if (p.contains("mysql") || p.contains("mariadb")) {
			return "ALTER TABLE " + table + " CHANGE COLUMN " + oldColumn + " " + newColumn + " " + mariadbColumnDef;
		}
		if (p.contains("h2")) {
			return "ALTER TABLE " + table + " ALTER COLUMN " + oldColumn + " RENAME TO " + newColumn;
		}
		return "ALTER TABLE " + table + " RENAME COLUMN " + oldColumn + " TO " + newColumn;
	}
}
