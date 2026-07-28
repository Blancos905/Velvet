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
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Migrazione nome tabelle chat ({@code salon_luxury_chat_* → salon_luxury_chat_*}) e colonna
 * {@code staff_operator_id} per thread titolare / operatore.
 */
@Component
@Order(1)
public class SalonLuxuryChatSchemaAlignmentRunner implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(SalonLuxuryChatSchemaAlignmentRunner.class);

	private static final String MESSAGES = "salon_luxury_chat_messages";
	private static final String READ_STATE = "salon_luxury_chat_read_state";
	private static final String LEGACY_MESSAGES = "salon_luxury_chat_messages";
	private static final String LEGACY_READ_STATE = "salon_luxury_chat_read_state";
	private static final String UQ_OWNER_THREAD = "uq_salon_luxury_chat_read_owner_thread";
	private static final String UQ_STAFF_THREAD = "uq_salon_luxury_chat_read_staff_thread";
	private static final List<String> KNOWN_LEGACY_READ_STATE_UQ = List.of(
			"idx_49450_uk_salon_luxury_chat_read_salon_client",
			"uk_salon_luxury_chat_read_salon_client");

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
			ensureClearedColumns(c, READ_STATE);
			alignReadStateThreadIndexes(c);
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

	/** Colonne «chat eliminata per l'utente» (svuotamento per lato client/salone). */
	private void ensureClearedColumns(Connection c, String table) throws SQLException {
		if (!tableExists(c, table)) {
			return;
		}
		String tsType = resolveTimestampColumnType(c);
		ensureNullableColumn(c, table, "cleared_at_client", tsType);
		ensureNullableColumn(c, table, "cleared_at_owner", tsType);
	}

	private void ensureNullableColumn(Connection c, String table, String column, String columnType) throws SQLException {
		if (columnExists(c, table, column)) {
			return;
		}
		log.info("Schema alignment: aggiungo colonna {}.{}", table, column);
		try (Statement st = c.createStatement()) {
			st.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + columnType + " NULL");
		}
	}

	private static String resolveTimestampColumnType(Connection c) throws SQLException {
		String product = c.getMetaData().getDatabaseProductName();
		if (isPostgresFamily(product)) {
			return "TIMESTAMPTZ";
		}
		if (isMySqlFamily(product)) {
			return "DATETIME(6)";
		}
		return "TIMESTAMP";
	}

	private static String resolveUuidColumnType(Connection c) throws SQLException {
		String product = c.getMetaData().getDatabaseProductName();
		if (product != null && product.toLowerCase().contains("h2")) {
			return "UUID";
		}
		return "BINARY(16)";
	}

	private static String resolveJdbcSchema(Connection c) throws SQLException {
		String product = c.getMetaData().getDatabaseProductName();
		if (isPostgresFamily(product)) {
			try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery("SELECT current_schema()")) {
				return rs.next() ? rs.getString(1) : "public";
			}
		}
		if (isMySqlFamily(product)) {
			try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery("SELECT DATABASE()")) {
				return rs.next() ? rs.getString(1) : null;
			}
		}
		return null;
	}

	private static boolean tableExists(Connection c, String table) throws SQLException {
		DatabaseMetaData md = c.getMetaData();
		String catalog = c.getCatalog();
		String schema = resolveJdbcSchema(c);
		try (ResultSet rs = md.getTables(catalog, schema, table, new String[] { "TABLE" })) {
			if (rs.next()) {
				return true;
			}
		}
		try (ResultSet rs = md.getTables(catalog, schema, table.toUpperCase(Locale.ROOT), new String[] { "TABLE" })) {
			return rs.next();
		}
	}

	private static boolean columnExists(Connection c, String table, String column) throws SQLException {
		DatabaseMetaData md = c.getMetaData();
		String catalog = c.getCatalog();
		String schema = resolveJdbcSchema(c);
		if (existsColumns(md, catalog, schema, table, column)) {
			return true;
		}
		return existsColumns(md, catalog, schema, table.toUpperCase(Locale.ROOT), column.toUpperCase(Locale.ROOT));
	}

	private static boolean existsColumns(
			DatabaseMetaData md, String catalog, String schema, String table, String column) throws SQLException {
		try (ResultSet rs = md.getColumns(catalog, schema, table, column)) {
			return rs.next();
		}
	}

	/**
	 * Il vincolo legacy univoco su {@code salon_client_id} impediva più thread (titolare + operatori).
	 * Sostituisce con indici per thread titolare ({@code staff_operator_id IS NULL}) e staff.
	 */
	private void alignReadStateThreadIndexes(Connection c) throws SQLException {
		if (!tableExists(c, READ_STATE) || !columnExists(c, READ_STATE, "staff_operator_id")) {
			return;
		}
		dropLegacySalonClientOnlyUniqueIndexes(c, READ_STATE);
		String product = c.getMetaData().getDatabaseProductName();
		if (isPostgresFamily(product)) {
			ensurePartialUniqueIndex(
					c,
					UQ_OWNER_THREAD,
					"CREATE UNIQUE INDEX IF NOT EXISTS " + UQ_OWNER_THREAD + " ON " + READ_STATE
							+ " (salon_client_id) WHERE staff_operator_id IS NULL");
			ensurePartialUniqueIndex(
					c,
					UQ_STAFF_THREAD,
					"CREATE UNIQUE INDEX IF NOT EXISTS " + UQ_STAFF_THREAD + " ON " + READ_STATE
							+ " (salon_client_id, staff_operator_id) WHERE staff_operator_id IS NOT NULL");
			return;
		}
		if (isMySqlFamily(product)) {
			ensureMySqlUniqueIndex(
					c,
					UQ_STAFF_THREAD,
					"ALTER TABLE " + READ_STATE + " ADD UNIQUE KEY " + UQ_STAFF_THREAD
							+ " (salon_client_id, staff_operator_id)");
		}
	}

	private void dropLegacySalonClientOnlyUniqueIndexes(Connection c, String table) throws SQLException {
		Set<String> legacy = new LinkedHashSet<>(KNOWN_LEGACY_READ_STATE_UQ);
		legacy.addAll(findSalonClientOnlyUniqueIndexes(c, table));
		if (isPostgresFamily(c.getMetaData().getDatabaseProductName())) {
			legacy.addAll(findPostgresSalonClientOnlyUniqueConstraints(c, table));
		}
		legacy.remove(UQ_OWNER_THREAD);
		legacy.remove(UQ_STAFF_THREAD);
		for (String indexName : legacy) {
			log.info("Schema alignment: rimuovo vincolo univoco legacy {} su {} (solo salon_client_id)", indexName, table);
			dropUniqueIndex(c, table, indexName);
		}
	}

	private static List<String> findPostgresSalonClientOnlyUniqueConstraints(Connection c, String table)
			throws SQLException {
		String sql = """
				SELECT c.conname
				FROM pg_constraint c
				JOIN pg_class t ON c.conrelid = t.oid
				JOIN pg_namespace n ON t.relnamespace = n.oid
				WHERE n.nspname = current_schema()
				  AND t.relname = ?
				  AND c.contype = 'u'
				  AND (
				    SELECT array_agg(a.attname ORDER BY u.ordinality)
				    FROM unnest(c.conkey) WITH ORDINALITY AS u(attnum, ordinality)
				    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = u.attnum AND NOT a.attisdropped
				  ) = ARRAY['salon_client_id']::name[]
				""";
		List<String> names = new ArrayList<>();
		try (PreparedStatement ps = c.prepareStatement(sql)) {
			ps.setString(1, table);
			try (ResultSet rs = ps.executeQuery()) {
				while (rs.next()) {
					names.add(rs.getString(1));
				}
			}
		}
		return names;
	}

	private static List<String> findSalonClientOnlyUniqueIndexes(Connection c, String table) throws SQLException {
		Map<String, List<String>> columnsByIndex = new LinkedHashMap<>();
		Map<String, Boolean> uniqueByIndex = new LinkedHashMap<>();
		DatabaseMetaData md = c.getMetaData();
		String catalog = c.getCatalog();
		String schema = resolveJdbcSchema(c);
		for (String tableName : List.of(table, table.toUpperCase(Locale.ROOT))) {
			try (ResultSet rs = md.getIndexInfo(catalog, schema, tableName, false, true)) {
				while (rs.next()) {
					String indexName = rs.getString("INDEX_NAME");
					if (indexName == null || "PRIMARY".equalsIgnoreCase(indexName)) {
						continue;
					}
					String column = rs.getString("COLUMN_NAME");
					if (column == null) {
						continue;
					}
					columnsByIndex.computeIfAbsent(indexName, ignored -> new ArrayList<>()).add(column);
					uniqueByIndex.put(indexName, !rs.getBoolean("NON_UNIQUE"));
				}
			}
		}
		List<String> legacy = new ArrayList<>();
		for (Map.Entry<String, List<String>> entry : columnsByIndex.entrySet()) {
			if (!Boolean.TRUE.equals(uniqueByIndex.get(entry.getKey()))) {
				continue;
			}
			List<String> cols = entry.getValue();
			if (cols.size() == 1 && "salon_client_id".equalsIgnoreCase(cols.get(0))) {
				legacy.add(entry.getKey());
			}
		}
		return legacy;
	}

	private void dropUniqueIndex(Connection c, String table, String indexName) throws SQLException {
		String product = c.getMetaData().getDatabaseProductName();
		List<String> attempts = new ArrayList<>();
		if (isPostgresFamily(product)) {
			// Prima DROP INDEX: DROP CONSTRAINT IF EXISTS su un indice-only ha successo senza rimuoverlo.
			String schema = resolveJdbcSchema(c);
			if (schema != null && !schema.isBlank()) {
				attempts.add("DROP INDEX IF EXISTS " + schema + "." + indexName);
			}
			attempts.add("DROP INDEX IF EXISTS " + indexName);
			attempts.add("ALTER TABLE " + table + " DROP CONSTRAINT IF EXISTS " + indexName);
		}
		else if (isH2(product)) {
			attempts.add("DROP INDEX IF EXISTS " + indexName);
			attempts.add("ALTER TABLE " + table + " DROP CONSTRAINT IF EXISTS " + indexName);
		}
		else if (isMySqlFamily(product)) {
			attempts.add("ALTER TABLE " + table + " DROP INDEX " + indexName);
		}
		for (String sql : attempts) {
			try (Statement st = c.createStatement()) {
				st.execute(sql);
				return;
			}
			catch (SQLException ex) {
				log.debug("Schema alignment: drop indice {} con `{}`: {}", indexName, sql, ex.getMessage());
			}
		}
		log.warn("Schema alignment: impossibile rimuovere indice/vincolo legacy {} su {}", indexName, table);
	}

	private static void ensurePartialUniqueIndex(Connection c, String indexName, String createSql) throws SQLException {
		if (indexExists(c, READ_STATE, indexName)) {
			return;
		}
		log.info("Schema alignment: creo indice univoco {}", indexName);
		try (Statement st = c.createStatement()) {
			st.execute(createSql);
		}
	}

	private static void ensureMySqlUniqueIndex(Connection c, String indexName, String alterSql) throws SQLException {
		if (indexExists(c, READ_STATE, indexName)) {
			return;
		}
		log.info("Schema alignment: creo indice univoco {}", indexName);
		try (Statement st = c.createStatement()) {
			st.execute(alterSql);
		}
		catch (SQLException ex) {
			if (isDuplicateIndexName(ex)) {
				log.debug("Schema alignment: indice {} già presente: {}", indexName, ex.getMessage());
				return;
			}
			throw ex;
		}
	}

	private static boolean indexExists(Connection c, String table, String indexName) throws SQLException {
		DatabaseMetaData md = c.getMetaData();
		String catalog = c.getCatalog();
		String schema = resolveJdbcSchema(c);
		for (String tableName : List.of(table, table.toUpperCase(Locale.ROOT))) {
			try (ResultSet rs = md.getIndexInfo(catalog, schema, tableName, false, false)) {
				while (rs.next()) {
					String name = rs.getString("INDEX_NAME");
					if (name != null && indexName.equalsIgnoreCase(name)) {
						return true;
					}
				}
			}
		}
		return false;
	}

	private static boolean isPostgresFamily(String product) {
		return product != null && product.toLowerCase(Locale.ROOT).contains("postgres");
	}

	private static boolean isH2(String product) {
		return product != null && product.toLowerCase(Locale.ROOT).contains("h2");
	}

	private static boolean isDuplicateIndexName(SQLException e) {
		if (e.getErrorCode() == 1061) {
			return true;
		}
		String message = e.getMessage();
		if (message == null) {
			return false;
		}
		String lower = message.toLowerCase(Locale.ROOT);
		return lower.contains("duplicate key name")
				|| lower.contains("already exists")
				|| lower.contains("duplicate index");
	}
}
