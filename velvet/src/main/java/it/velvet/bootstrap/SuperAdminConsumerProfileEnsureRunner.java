package it.velvet.bootstrap;

import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.config.VelvetAsyncConfiguration;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * All’avvio garantisce il {@link ConsumerProfile} canonico del super admin se manca ma la credenziale piattaforma c’è.
 */
@Component
public class SuperAdminConsumerProfileEnsureRunner {

	private final SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService;

	public SuperAdminConsumerProfileEnsureRunner(SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService) {
		this.superAdminConsumerProfileEnsureService = superAdminConsumerProfileEnsureService;
	}

	@EventListener(ApplicationReadyEvent.class)
	@Async(VelvetAsyncConfiguration.BOOTSTRAP_EXECUTOR)
	public void onApplicationReady() {
		superAdminConsumerProfileEnsureService.ensureSuperAdminConsumerProfileExists();
	}
}
