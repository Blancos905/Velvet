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
public class PendingRegistrationSchemaAlignmentRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(PendingRegistrationSchemaAlignmentRunner.class);
	private static final String TABLE = "pending_registrations";
	private final DataSource dataSource;

	public PendingRegistrationSchemaAlignmentRunner(DataSource dataSource) {
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) throws SQLException {
		try (Connection c = dataSource.getConnection()) {
			if (!tableExists(c, TABLE)) {
				return;
			}
			ensureColumn(c, "email_verified_at", "ALTER TABLE " + TABLE + " ADD COLUMN email_verified_at TIMESTAMP NULL");
			ensureColumn(
					c,
					"checkout_token_hash",
					"ALTER TABLE " + TABLE + " ADD COLUMN checkout_token_hash VARCHAR(64) NULL");
			ensureColumn(
					c,
					"checkout_token_expires_at",
					"ALTER TABLE " + TABLE + " ADD COLUMN checkout_token_expires_at TIMESTAMP NULL");
			ensureColumn(
					c,
					"stripe_checkout_customer_id",
					"ALTER TABLE " + TABLE + " ADD COLUMN stripe_checkout_customer_id VARCHAR(255) NULL");
			ensureColumn(
					c,
					"verification_token_plain",
					"ALTER TABLE " + TABLE + " ADD COLUMN verification_token_plain VARCHAR(64) NULL");
			ensureColumn(
					c,
					"checkout_token_plain",
					"ALTER TABLE " + TABLE + " ADD COLUMN checkout_token_plain VARCHAR(64) NULL");
			ensureColumn(
					c,
					"poll_sync_secret_hash",
					"ALTER TABLE " + TABLE + " ADD COLUMN poll_sync_secret_hash VARCHAR(64) NULL");
			clearPlainVerificationTokens(c);
		}
	}

	/** Il token di conferma non resta in chiaro: le righe già salvate vengono azzerate. */
	private static void clearPlainVerificationTokens(Connection c) throws SQLException {
		if (!columnExists(c, TABLE, "verification_token_plain")) {
			return;
		}
		try (Statement st = c.createStatement()) {
			int updated = st.executeUpdate(
					"UPDATE " + TABLE + " SET verification_token_plain = NULL WHERE verification_token_plain IS NOT NULL");
			if (updated > 0) {
				log.info("Schema alignment: azzerati {} token di verifica in chiaro su {}", updated, TABLE);
			}
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
		try (ResultSet rs = md.getColumns(catalog, null, table, column)) {
			if (rs.next()) {
				return true;
			}
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
}
