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
	private static final String PHOTO_COLUMN = "photo_data_url";
	private static final String REQUIRE_CONFIRMATION_COLUMN = "require_booking_confirmation";

	private final DataSource dataSource;

	public StaffOperatorSchemaAlignmentRunner(DataSource dataSource) {
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) throws SQLException {
		try (Connection c = dataSource.getConnection()) {
			if (!tableExists(c, TABLE)) {
				return;
			}
			alignPhotoColumn(c);
			ensureRequireBookingConfirmationColumn(c);
		}
	}

	private void alignPhotoColumn(Connection c) throws SQLException {
		if (!columnExists(c, TABLE, PHOTO_COLUMN)) {
			return;
		}
		String db = c.getMetaData().getDatabaseProductName();
		String sql = alterPhotoColumnSql(db);
		if (sql == null) {
			return;
		}
		try (Statement st = c.createStatement()) {
			st.execute(sql);
			log.info("Schema alignment: {}.{} allineata a tipo testo lungo ({})", TABLE, PHOTO_COLUMN, db);
		} catch (SQLException e) {
			// Idempotente: se già nel tipo corretto o DDL non necessario, non blocchiamo boot.
			log.debug("Schema alignment staff photo skip ({}): {}", e.getSQLState(), e.getMessage());
		}
	}

	private void ensureRequireBookingConfirmationColumn(Connection c) throws SQLException {
		if (columnExists(c, TABLE, REQUIRE_CONFIRMATION_COLUMN)) {
			return;
		}
		log.info("Schema alignment: aggiungo colonna {}.{}", TABLE, REQUIRE_CONFIRMATION_COLUMN);
		try (Statement st = c.createStatement()) {
			st.execute(
					"ALTER TABLE "
							+ TABLE
							+ " ADD COLUMN "
							+ REQUIRE_CONFIRMATION_COLUMN
							+ " BOOLEAN NOT NULL DEFAULT TRUE");
		}
	}

	private static String alterPhotoColumnSql(String databaseProductName) {
		String p = databaseProductName == null ? "" : databaseProductName.toLowerCase();
		if (p.contains("mysql") || p.contains("mariadb")) {
			return "ALTER TABLE " + TABLE + " MODIFY COLUMN " + PHOTO_COLUMN + " LONGTEXT NULL";
		}
		if (p.contains("postgresql")) {
			return "ALTER TABLE " + TABLE + " ALTER COLUMN " + PHOTO_COLUMN + " TYPE TEXT";
		}
		if (p.contains("h2")) {
			return "ALTER TABLE " + TABLE + " ALTER COLUMN " + PHOTO_COLUMN + " CLOB";
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
