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
 * Migrazione nome tabelle chat ({@code salon_velvet_chat_* → salon_luxury_chat_*}) e colonna
 * {@code staff_operator_id} per thread titolare / operatore.
 */
@Component
@Order(1)
public class SalonLuxuryChatSchemaAlignmentRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(SalonLuxuryChatSchemaAlignmentRunner.class);

	private static final String MESSAGES = "salon_luxury_chat_messages";
	private static final String READ_STATE = "salon_luxury_chat_read_state";
	private static final String LEGACY_MESSAGES = "salon_velvet_chat_messages";
	private static final String LEGACY_READ_STATE = "salon_velvet_chat_read_state";

	private final DataSource dataSource;

	public SalonLuxuryChatSchemaAlignmentRunner(DataSource dataSource) {
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) throws SQLException {
		try (Connection c = dataSource.getConnection()) {
			migrateLegacyTable(c, LEGACY_MESSAGES, MESSAGES);
			migrateLegacyTable(c, LEGACY_READ_STATE, READ_STATE);
			ensureStaffOperatorColumn(c, MESSAGES);
			ensureStaffOperatorColumn(c, READ_STATE);
		}
	}

	private void migrateLegacyTable(Connection c, String legacyTable, String targetTable) throws SQLException {
		if (!tableExists(c, legacyTable)) {
			return;
		}
		if (tableExists(c, targetTable)) {
			long legacyRows = countRows(c, legacyTable);
			long targetRows = countRows(c, targetTable);
			if (targetRows == 0 && legacyRows > 0) {
				log.info("Schema alignment: rimuovo tabella vuota {} creata da Hibernate prima della migrazione", targetTable);
				try (Statement st = c.createStatement()) {
					st.execute("DROP TABLE " + targetTable);
				}
			}
			else if (targetRows > 0) {
				log.info("Schema alignment: tabella {} già popolata, salto migrazione da {}", targetTable, legacyTable);
				return;
			}
		}
		renameLegacyTableIfNeeded(c, legacyTable, targetTable);
	}

	private static long countRows(Connection c, String table) throws SQLException {
		try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM " + table)) {
			return rs.next() ? rs.getLong(1) : 0L;
		}
		catch (SQLException ex) {
			log.debug("Schema alignment: impossibile contare righe su {}: {}", table, ex.getMessage());
			return 0L;
		}
	}

	private void renameLegacyTableIfNeeded(Connection c, String legacyTable, String targetTable) throws SQLException {
		if (!tableExists(c, legacyTable) || tableExists(c, targetTable)) {
			return;
		}
		log.info("Schema alignment: rinomino tabella {} → {}", legacyTable, targetTable);
		String product = c.getMetaData().getDatabaseProductName();
		String sql = isMySqlFamily(product)
				? "RENAME TABLE " + legacyTable + " TO " + targetTable
				: "ALTER TABLE " + legacyTable + " RENAME TO " + targetTable;
		try (Statement st = c.createStatement()) {
			st.execute(sql);
		}
	}

	private static boolean isMySqlFamily(String product) {
		if (product == null) {
			return false;
		}
		String p = product.toLowerCase();
		return p.contains("mariadb") || p.contains("mysql");
	}

	private void ensureStaffOperatorColumn(Connection c, String table) throws SQLException {
		if (!tableExists(c, table)) {
			return;
		}
		if (columnExists(c, table, "staff_operator_id")) {
			return;
		}
		log.info("Schema alignment: aggiungo colonna {}.staff_operator_id", table);
		String fkType = resolveUuidColumnType(c);
		try (Statement st = c.createStatement()) {
			st.execute("ALTER TABLE " + table + " ADD COLUMN staff_operator_id " + fkType + " NULL");
		}
	}

	private static String resolveUuidColumnType(Connection c) throws SQLException {
		String product = c.getMetaData().getDatabaseProductName();
		if (product != null && product.toLowerCase().contains("h2")) {
			return "UUID";
		}
		return "BINARY(16)";
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
}
