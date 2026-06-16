package it.velvet.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Pool dedicato al geocoding Nominatim: un thread evita di superare la policy 1 req/s
 * e non occupa thread Tomcat durante POST registrazione / aggiornamento sede.
 */
@Configuration
public class VelvetAsyncConfiguration {

	public static final String GEOCODING_EXECUTOR = "geocodingExecutor";
	public static final String BOOTSTRAP_EXECUTOR = "bootstrapExecutor";

	@Bean(name = GEOCODING_EXECUTOR)
	Executor geocodingExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(1);
		executor.setMaxPoolSize(2);
		executor.setQueueCapacity(256);
		executor.setThreadNamePrefix("velvet-geocode-");
		executor.initialize();
		return executor;
	}

	/** Bootstrap DB/demo post-avvio: non blocca il banner «Started VelvetApplication». */
	@Bean(name = BOOTSTRAP_EXECUTOR)
	Executor bootstrapExecutor() {
		ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
		executor.setCorePoolSize(1);
		executor.setMaxPoolSize(2);
		executor.setQueueCapacity(32);
		executor.setThreadNamePrefix("velvet-bootstrap-");
		executor.initialize();
		return executor;
	}
}
