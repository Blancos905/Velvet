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
@Order(1)
public class StaffOperatorSchemaAlignmentRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(StaffOperatorSchemaAlignmentRunner.class);
	private static final String TABLE = "staff_operators";
	private static final String COLUMN = "photo_data_url";

	private final DataSource dataSource;

	public StaffOperatorSchemaAlignmentRunner(DataSource dataSource) {
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) throws SQLException {
		try (Connection c = dataSource.getConnection()) {
			if (!tableExists(c, TABLE) || !columnExists(c, TABLE, COLUMN)) {
				return;
			}
			String db = c.getMetaData().getDatabaseProductName();
			String sql = alterColumnSql(db);
			if (sql == null) return;
			try (Statement st = c.createStatement()) {
				st.execute(sql);
				log.info("Schema alignment: {}.{} allineata a tipo testo lungo ({})", TABLE, COLUMN, db);
			} catch (SQLException e) {
				// Idempotente: se già nel tipo corretto o DDL non necessario, non blocchiamo boot.
				log.debug("Schema alignment staff skip ({}): {}", e.getSQLState(), e.getMessage());
			}
		}
	}

	private static String alterColumnSql(String databaseProductName) {
		String p = databaseProductName == null ? "" : databaseProductName.toLowerCase();
		if (p.contains("mysql") || p.contains("mariadb")) {
			return "ALTER TABLE " + TABLE + " MODIFY COLUMN " + COLUMN + " LONGTEXT NULL";
		}
		if (p.contains("postgresql")) {
			return "ALTER TABLE " + TABLE + " ALTER COLUMN " + COLUMN + " TYPE TEXT";
		}
		if (p.contains("h2")) {
			return "ALTER TABLE " + TABLE + " ALTER COLUMN " + COLUMN + " CLOB";
		}
		return null;
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
}
