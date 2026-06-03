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
 * Colonna {@code staff_operator_id} su messaggi e stato lettura chat: thread separati titolare / operatore.
 */
@Component
@Order(1)
public class SalonVelvetChatSchemaAlignmentRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(SalonVelvetChatSchemaAlignmentRunner.class);

	private static final String MESSAGES = "salon_velvet_chat_messages";
	private static final String READ_STATE = "salon_velvet_chat_read_state";

	private final DataSource dataSource;

	public SalonVelvetChatSchemaAlignmentRunner(DataSource dataSource) {
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) throws SQLException {
		try (Connection c = dataSource.getConnection()) {
			ensureStaffOperatorColumn(c, MESSAGES);
			ensureStaffOperatorColumn(c, READ_STATE);
		}
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
