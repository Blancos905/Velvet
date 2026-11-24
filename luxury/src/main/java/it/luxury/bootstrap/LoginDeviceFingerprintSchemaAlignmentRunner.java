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

/** Crea {@code login_device_fingerprints} su DB legacy dove Hibernate non ha ancora aggiornato lo schema. */
@Component
@Order(2)
public class LoginDeviceFingerprintSchemaAlignmentRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(LoginDeviceFingerprintSchemaAlignmentRunner.class);
	private static final String TABLE = "login_device_fingerprints";

	private final DataSource dataSource;

	public LoginDeviceFingerprintSchemaAlignmentRunner(DataSource dataSource) {
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
							CREATE TABLE login_device_fingerprints (
							  id UUID NOT NULL PRIMARY KEY,
							  profile_id UUID NOT NULL,
							  fingerprint_hash VARCHAR(64) NOT NULL,
							  user_agent_summary VARCHAR(256),
							  last_ip VARCHAR(64),
							  first_seen_at TIMESTAMPTZ NOT NULL,
							  last_seen_at TIMESTAMPTZ NOT NULL,
							  CONSTRAINT uk_login_device_fp_profile_hash UNIQUE (profile_id, fingerprint_hash)
							)""");
					st.execute("""
							CREATE INDEX idx_login_device_fp_profile
							  ON login_device_fingerprints (profile_id)""");
				}
				else {
					st.execute("""
							CREATE TABLE login_device_fingerprints (
							  id BINARY(16) NOT NULL PRIMARY KEY,
							  profile_id BINARY(16) NOT NULL,
							  fingerprint_hash VARCHAR(64) NOT NULL,
							  user_agent_summary VARCHAR(256),
							  last_ip VARCHAR(64),
							  first_seen_at TIMESTAMP(6) NOT NULL,
							  last_seen_at TIMESTAMP(6) NOT NULL,
							  CONSTRAINT uk_login_device_fp_profile_hash UNIQUE (profile_id, fingerprint_hash)
							)""");
					st.execute("""
							CREATE INDEX idx_login_device_fp_profile
							  ON login_device_fingerprints (profile_id)""");
				}
			}
		}
	}

	private static boolean isPostgres(String product) {
		return product != null && product.toLowerCase().contains("postgres");
	}

	private static boolean tableExists(Connection c, String table) throws SQLException {
		DatabaseMetaData md = c.getMetaData();
		try (ResultSet rs = md.getTables(null, null, table, new String[] {"TABLE"})) {
			if (rs.next()) {
				return true;
			}
		}
		try (ResultSet rs = md.getTables(null, null, table.toUpperCase(), new String[] {"TABLE"})) {
			return rs.next();
		}
	}
}
