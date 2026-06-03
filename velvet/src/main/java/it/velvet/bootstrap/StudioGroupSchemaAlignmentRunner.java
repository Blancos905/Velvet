package it.velvet.bootstrap;

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

/**
 * Allinea tabelle legacy a {@link it.velvet.studio.domain.StudioGroup}: colonne introdotte dopo la prima installazione.
 * <p>
 * Hibernate con {@code ddl-auto=update} di solito aggiunge colonne mancanti, ma su DB già in produzione o con deploy
 * parziali può restare uno schema indietro. Questo runner è idempotente (controlla {@code DatabaseMetaData}).
 */
@Component
@Order(0)
public class StudioGroupSchemaAlignmentRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(StudioGroupSchemaAlignmentRunner.class);

	private static final String TABLE = "studio_groups";

	private final DataSource dataSource;

	public StudioGroupSchemaAlignmentRunner(DataSource dataSource) {
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) throws SQLException {
		try (Connection c = dataSource.getConnection()) {
			if (!tableExists(c, TABLE)) {
				return;
			}
			ensureColumn(c, "owner_email", "ALTER TABLE " + TABLE + " ADD COLUMN owner_email VARCHAR(320) NULL");
			ensureColumn(c, "owner_keycloak_sub", "ALTER TABLE " + TABLE + " ADD COLUMN owner_keycloak_sub VARCHAR(64) NULL");
			ensureColumn(
					c,
					"plan_tier",
					"ALTER TABLE " + TABLE + " ADD COLUMN plan_tier VARCHAR(16) NOT NULL DEFAULT 'BASE'");
			ensureColumn(
					c,
					"statistics_pin_hash",
					"ALTER TABLE " + TABLE + " ADD COLUMN statistics_pin_hash VARCHAR(120) NULL");
			ensureColumn(
					c,
					"provider",
					"ALTER TABLE " + TABLE + " ADD COLUMN provider TINYINT(1) NOT NULL DEFAULT 0");
			migrateBetaTesterToProviderIfPresent(c);
			ensureColumn(
					c,
					"notification_inbox_ack_booking_confirmation_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN notification_inbox_ack_booking_confirmation_at TIMESTAMP NULL");
			ensureColumn(
					c,
					"notification_inbox_ack_booking_updated_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN notification_inbox_ack_booking_updated_at TIMESTAMP NULL");
			ensureColumn(
					c,
					"notification_inbox_ack_booking_cancelled_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN notification_inbox_ack_booking_cancelled_at TIMESTAMP NULL");
			ensureColumn(
					c,
					"notification_inbox_ack_system_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN notification_inbox_ack_system_at TIMESTAMP NULL");
			ensureUniqueIndex(c, "uq_studio_groups_owner_email", "owner_email");
			ensureUniqueIndex(c, "uq_studio_groups_owner_keycloak_sub", "owner_keycloak_sub");
		}
	}

	private static boolean tableExists(Connection c, String table) throws SQLException {
		DatabaseMetaData md = c.getMetaData();
		String catalog = c.getCatalog();
		try (ResultSet rs = md.getTables(catalog, null, table, new String[] { "TABLE" })) {
			if (rs.next()) {
				return true;
			}
		}
		try (ResultSet rs = md.getTables(catalog, null, table.toUpperCase(), new String[] { "TABLE" })) {
			return rs.next();
		}
	}

	private static boolean columnExists(Connection c, String table, String column) throws SQLException {
		DatabaseMetaData md = c.getMetaData();
		String catalog = c.getCatalog();
		if (existsColumns(md, catalog, table, column)) {
			return true;
		}
		return existsColumns(md, catalog, table.toUpperCase(), column.toUpperCase());
	}

	private static boolean existsColumns(DatabaseMetaData md, String catalog, String table, String column)
			throws SQLException {
		try (ResultSet rs = md.getColumns(catalog, null, table, column)) {
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

	/** Migrazione una tantum da naming precedente {@code beta_tester}. */
	private static void migrateBetaTesterToProviderIfPresent(Connection c) throws SQLException {
		if (!columnExists(c, TABLE, "beta_tester") || !columnExists(c, TABLE, "provider")) {
			return;
		}
		log.info("Schema alignment: copio valori beta_tester → provider su {}", TABLE);
		try (Statement st = c.createStatement()) {
			st.execute("UPDATE " + TABLE + " SET provider = 1 WHERE beta_tester = 1 AND provider = 0");
		}
	}

	private static void ensureUniqueIndex(Connection c, String indexName, String column) throws SQLException {
		if (indexExists(c, TABLE, indexName)) {
			return;
		}
		if (!columnExists(c, TABLE, column)) {
			return;
		}
		String sql = addUniqueConstraintSql(c.getMetaData().getDatabaseProductName(), indexName, column);
		log.info("Schema alignment: aggiungo indice unico {} su {}.{}", indexName, TABLE, column);
		try (Statement st = c.createStatement()) {
			st.execute(sql);
		}
		catch (SQLException e) {
			if (isDuplicateIndexName(e)) {
				log.debug("Schema alignment: indice {} già presente ({}): {}", indexName, e.getSQLState(), e.getMessage());
				return;
			}
			throw e;
		}
	}

	/**
	 * MySQL/MariaDB: {@code ADD UNIQUE KEY name (col)}. H2 e altri: vincolo SQL-92 {@code ADD CONSTRAINT name UNIQUE (col)}.
	 */
	private static String addUniqueConstraintSql(String databaseProductName, String indexName, String column) {
		String p = databaseProductName == null ? "" : databaseProductName.toLowerCase();
		if (p.contains("mysql") || p.contains("mariadb")) {
			return "ALTER TABLE " + TABLE + " ADD UNIQUE KEY " + indexName + " (" + column + ")";
		}
		return "ALTER TABLE " + TABLE + " ADD CONSTRAINT " + indexName + " UNIQUE (" + column + ")";
	}

	private static boolean indexExists(Connection c, String table, String indexName) throws SQLException {
		DatabaseMetaData md = c.getMetaData();
		String catalog = c.getCatalog();
		try (ResultSet rs = md.getIndexInfo(catalog, null, table, false, false)) {
			while (rs.next()) {
				String name = rs.getString("INDEX_NAME");
				if (name != null && indexName.equalsIgnoreCase(name)) {
					return true;
				}
			}
		}
		try (ResultSet rs = md.getIndexInfo(catalog, null, table.toUpperCase(), false, false)) {
			while (rs.next()) {
				String name = rs.getString("INDEX_NAME");
				if (name != null && indexName.equalsIgnoreCase(name)) {
					return true;
				}
			}
		}
		return false;
	}

	private static boolean isDuplicateIndexName(SQLException e) {
		/* MySQL / MariaDB: ER_DUP_KEYNAME */
		if (e.getErrorCode() == 1061) {
			return true;
		}
		String m = e.getMessage();
		if (m == null) {
			return false;
		}
		String lower = m.toLowerCase();
		return lower.contains("duplicate key name")
				|| lower.contains("already exists")
				|| lower.contains("duplicate index");
	}
}
