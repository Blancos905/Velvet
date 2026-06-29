package it.velvet.testsupport;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.Map;

/**
 * I test devono usare H2 in-memory anche se in shell è attivo {@code SPRING_PROFILES_ACTIVE=local}
 * o {@code SPRING_DATASOURCE_URL} punta a PostgreSQL/MariaDB di sviluppo.
 */
public class VelvetTestEnvironmentPostProcessor implements EnvironmentPostProcessor {

	private static final String SOURCE = "velvetTestDatasourceOverrides";

	@Override
	public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
		Map<String, Object> overrides = Map.ofEntries(
				Map.entry("spring.datasource.url",
						"jdbc:h2:mem:velvet-tests;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH"),
				Map.entry("spring.datasource.driver-class-name", "org.h2.Driver"),
				Map.entry("spring.datasource.username", "sa"),
				Map.entry("spring.datasource.password", ""),
				Map.entry("spring.jpa.hibernate.ddl-auto", "create-drop"),
				Map.entry("spring.jpa.properties.hibernate.default_schema", ""),
				Map.entry("spring.jpa.database-platform", "org.hibernate.dialect.H2Dialect"),
				Map.entry("spring.h2.console.enabled", "false"));
		environment.getPropertySources().addFirst(new MapPropertySource(SOURCE, overrides));
	}
}
