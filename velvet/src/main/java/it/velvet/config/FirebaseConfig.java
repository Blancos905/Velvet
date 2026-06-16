package it.velvet.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Optional;

@Configuration
public class FirebaseConfig {

	private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);
	private static final String GOOGLE_APPLICATION_CREDENTIALS = "GOOGLE_APPLICATION_CREDENTIALS";

	private final VelvetFirebaseProperties firebaseProperties;
	private final Environment environment;

	public FirebaseConfig(VelvetFirebaseProperties firebaseProperties, Environment environment) {
		this.firebaseProperties = firebaseProperties;
		this.environment = environment;
	}

	@Bean
	@Lazy
	Optional<FirebaseMessaging> firebaseMessaging() {
		if (!firebaseProperties.enabled()) {
			log.info("Firebase Admin SDK disabilitato (velvet.firebase.enabled=false).");
			return Optional.empty();
		}
		if (isTestProfile()) {
			log.info(
					"Firebase Admin SDK non inizializzato: profilo test attivo. "
							+ "Le push notification FCM restano disabilitate in questo ambiente.");
			return Optional.empty();
		}
		Optional<Resource> credentialsResource = resolveCredentialsResource();
		if (credentialsResource.isEmpty()) {
			log.info(
					"Firebase Admin SDK non inizializzato: credenziali assenti. "
							+ "Per abilitare le push FCM esegui: ./scripts/setup-firebase-credentials.sh <file.json scaricato da Firebase>, "
							+ "oppure imposta velvet.firebase.service-account-path o la variabile {}.",
					GOOGLE_APPLICATION_CREDENTIALS);
			return Optional.empty();
		}
		Resource resource = credentialsResource.orElseThrow();
		try (InputStream serviceAccount = resource.getInputStream()) {
			FirebaseOptions options = FirebaseOptions.builder()
					.setCredentials(GoogleCredentials.fromStream(serviceAccount))
					.build();
			FirebaseApp app;
			if (FirebaseApp.getApps().isEmpty()) {
				app = FirebaseApp.initializeApp(options);
			}
			else {
				app = FirebaseApp.getInstance();
			}
			log.info("Firebase Admin SDK inizializzato (app={}, credentials={}).", app.getName(), resource);
			return Optional.of(FirebaseMessaging.getInstance(app));
		}
		catch (IOException ex) {
			log.warn(
					"Firebase Admin SDK non inizializzato: impossibile leggere {} — {}. "
							+ "L'applicazione continua senza push FCM.",
					resource,
					ex.getMessage());
			return Optional.empty();
		}
	}

	private Optional<Resource> resolveCredentialsResource() {
		Optional<Resource> configuredPath = resourceFromConfiguredPath(firebaseProperties.serviceAccountPath());
		if (configuredPath.isPresent()) {
			return configuredPath;
		}
		Optional<Resource> googleEnv = resourceFromConfiguredPath(environment.getProperty(GOOGLE_APPLICATION_CREDENTIALS));
		if (googleEnv.isPresent()) {
			return googleEnv;
		}
		ClassPathResource classpath = new ClassPathResource(firebaseProperties.serviceAccountResource());
		if (classpath.exists()) {
			return Optional.of(classpath);
		}
		return Optional.empty();
	}

	private static Optional<Resource> resourceFromConfiguredPath(String rawPath) {
		if (!StringUtils.hasText(rawPath)) {
			return Optional.empty();
		}
		String trimmed = rawPath.trim();
		if (trimmed.startsWith("classpath:")) {
			ClassPathResource classpath = new ClassPathResource(trimmed.substring("classpath:".length()));
			return classpath.exists() ? Optional.of(classpath) : Optional.empty();
		}
		Path path = Path.of(trimmed);
		if (!Files.isRegularFile(path)) {
			return Optional.empty();
		}
		return Optional.of(new FileSystemResource(path));
	}

	private boolean isTestProfile() {
		return Arrays.stream(environment.getActiveProfiles())
				.anyMatch(profile -> "test".equalsIgnoreCase(profile));
	}
}
