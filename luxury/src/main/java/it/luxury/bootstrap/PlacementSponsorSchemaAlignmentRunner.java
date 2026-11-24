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
 * Crea {@code placement_sponsors} sui database in cui Hibernate non aggiorna lo schema
 * (produzione con {@code ddl-auto=validate} applica prima lo SQL in deploy).
 */
@Component
@Order(2)
public class PlacementSponsorSchemaAlignmentRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(PlacementSponsorSchemaAlignmentRunner.class);
	private static final String TABLE = "placement_sponsors";

	private final DataSource dataSource;

	public PlacementSponsorSchemaAlignmentRunner(DataSource dataSource) {
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
				if (product != null && product.toLowerCase().contains("postgres")) {
					st.execute("""
							CREATE TABLE placement_sponsors (
							  id UUID NOT NULL PRIMARY KEY,
							  placement VARCHAR(64) NOT NULL,
							  brand_name VARCHAR(80) NOT NULL,
							  headline VARCHAR(160) NOT NULL,
							  cta_label VARCHAR(40) NOT NULL,
							  href VARCHAR(500) NOT NULL,
							  image_src TEXT NOT NULL,
							  sort_order INTEGER NOT NULL,
							  active BOOLEAN NOT NULL,
							  created_at TIMESTAMPTZ NOT NULL
							)""");
				}
				else {
					st.execute("""
							CREATE TABLE placement_sponsors (
							  id UUID NOT NULL PRIMARY KEY,
							  placement VARCHAR(64) NOT NULL,
							  brand_name VARCHAR(80) NOT NULL,
							  headline VARCHAR(160) NOT NULL,
							  cta_label VARCHAR(40) NOT NULL,
							  href VARCHAR(500) NOT NULL,
							  image_src CLOB NOT NULL,
							  sort_order INTEGER NOT NULL,
							  active BOOLEAN NOT NULL,
							  created_at TIMESTAMP NOT NULL
							)""");
				}
				st.execute("""
						CREATE INDEX idx_placement_sponsors_placement
						  ON placement_sponsors (placement, sort_order)""");
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
}
