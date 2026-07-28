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
 * Crea {@code operator_time_blocks} su DB legacy dove Hibernate non ha ancora aggiornato lo schema.
 */
@Component
@Order(2)
public class OperatorTimeBlockSchemaAlignmentRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(OperatorTimeBlockSchemaAlignmentRunner.class);
	private static final String TABLE = "operator_time_blocks";

	private final DataSource dataSource;

	public OperatorTimeBlockSchemaAlignmentRunner(DataSource dataSource) {
		this.dataSource = dataSource;
	}

	@Override
	public void run(ApplicationArguments args) throws SQLException {
		try (Connection c = dataSource.getConnection()) {
			if (tableExists(c, TABLE)) {
				return;
			}
			String product = c.getMetaData().getDatabaseProductName();
			log.info("Schema alignment: creo tabella {}", TABLE);
			try (Statement st = c.createStatement()) {
				if (isPostgres(product)) {
					st.execute("""
							CREATE TABLE operator_time_blocks (
							  id UUID NOT NULL PRIMARY KEY,
							  operator_id UUID NOT NULL REFERENCES staff_operators (id),
							  starts_at TIMESTAMPTZ NOT NULL,
							  ends_at TIMESTAMPTZ NOT NULL,
							  note VARCHAR(500) NULL,
							  created_at TIMESTAMPTZ NOT NULL
							)""");
					st.execute("""
							CREATE INDEX idx_operator_time_blocks_operator_range
							  ON operator_time_blocks (operator_id, starts_at, ends_at)""");
				}
				else {
					st.execute("""
							CREATE TABLE operator_time_blocks (
							  id BINARY(16) NOT NULL PRIMARY KEY,
							  operator_id BINARY(16) NOT NULL,
							  starts_at TIMESTAMP(6) NOT NULL,
							  ends_at TIMESTAMP(6) NOT NULL,
							  note VARCHAR(500) NULL,
							  created_at TIMESTAMP(6) NOT NULL,
							  CONSTRAINT fk_operator_time_blocks_operator FOREIGN KEY (operator_id) REFERENCES staff_operators (id)
							)""");
					st.execute("""
							CREATE INDEX idx_operator_time_blocks_operator_range
							  ON operator_time_blocks (operator_id, starts_at, ends_at)""");
				}
			}
		}
	}

	private static boolean isPostgres(String product) {
		return product != null && product.toLowerCase().contains("postgres");
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
}
