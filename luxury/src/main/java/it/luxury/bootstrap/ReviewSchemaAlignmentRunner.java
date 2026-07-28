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

/**
 * Colonne moderazione recensioni e distacco identità (GDPR): allineamento idempotente su DB esistenti
 * quando {@code ddl-auto=update} non le ha ancora create.
 */
@Component
@Order(0)
public class ReviewSchemaAlignmentRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(ReviewSchemaAlignmentRunner.class);
	private static final String TABLE = "reviews";

	private final DataSource dataSource;

	public ReviewSchemaAlignmentRunner(DataSource dataSource) {
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) throws SQLException {
		try (Connection c = dataSource.getConnection()) {
			if (!tableExists(c, TABLE)) {
				return;
			}
			ensureReviewerIdentityDetached(c);
			ensureHiddenAt(c);
		}
	}

	private void ensureReviewerIdentityDetached(Connection c) throws SQLException {
		if (columnExists(c, TABLE, "reviewer_identity_detached")) {
			return;
		}
		String sql = addReviewerIdentityDetachedSql(c);
		if (sql == null) {
			return;
		}
		log.info("Schema alignment: aggiungo colonna {}.reviewer_identity_detached", TABLE);
		try (Statement st = c.createStatement()) {
			st.execute(sql);
		}
	}

	private void ensureHiddenAt(Connection c) throws SQLException {
		if (columnExists(c, TABLE, "hidden_at")) {
			return;
		}
		String sql = addHiddenAtSql(c);
		if (sql == null) {
			return;
		}
		log.info("Schema alignment: aggiungo colonna {}.hidden_at", TABLE);
		try (Statement st = c.createStatement()) {
			st.execute(sql);
		}
	}

	private static String addReviewerIdentityDetachedSql(Connection c) throws SQLException {
		String p = databaseProduct(c);
		if (p.contains("postgresql")) {
			return "ALTER TABLE " + TABLE + " ADD COLUMN reviewer_identity_detached BOOLEAN NOT NULL DEFAULT FALSE";
		}
		if (p.contains("mysql") || p.contains("mariadb")) {
			return "ALTER TABLE " + TABLE
					+ " ADD COLUMN reviewer_identity_detached TINYINT(1) NOT NULL DEFAULT 0";
		}
		if (p.contains("h2")) {
			return "ALTER TABLE " + TABLE + " ADD COLUMN reviewer_identity_detached BOOLEAN NOT NULL DEFAULT FALSE";
		}
		return null;
	}

	private static String addHiddenAtSql(Connection c) throws SQLException {
		String p = databaseProduct(c);
		if (p.contains("postgresql")) {
			return "ALTER TABLE " + TABLE + " ADD COLUMN hidden_at TIMESTAMPTZ NULL";
		}
		if (p.contains("mysql") || p.contains("mariadb")) {
			return "ALTER TABLE " + TABLE + " ADD COLUMN hidden_at DATETIME(6) NULL";
		}
		if (p.contains("h2")) {
			return "ALTER TABLE " + TABLE + " ADD COLUMN hidden_at TIMESTAMP NULL";
		}
		return null;
	}

	private static String databaseProduct(Connection c) throws SQLException {
		String name = c.getMetaData().getDatabaseProductName();
		return name == null ? "" : name.toLowerCase();
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
		if (existsColumn(md, catalog, table, column)) {
			return true;
		}
		return existsColumn(md, catalog, table.toUpperCase(), column.toUpperCase());
	}

	private static boolean existsColumn(DatabaseMetaData md, String catalog, String table, String column)
			throws SQLException {
		try (ResultSet rs = md.getColumns(catalog, null, table, column)) {
			return rs.next();
		}
	}
}
