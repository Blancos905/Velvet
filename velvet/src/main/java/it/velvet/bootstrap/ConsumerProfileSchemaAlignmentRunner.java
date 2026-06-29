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
}
