package it.velvet.bootstrap;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * All’avvio garantisce il {@link ConsumerProfile} canonico del super admin se manca ma la credenziale piattaforma c’è.
 */
@Component
@Order(10)
public class SuperAdminConsumerProfileEnsureRunner implements ApplicationRunner {

	private final SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService;

	public SuperAdminConsumerProfileEnsureRunner(SuperAdminConsumerProfileEnsureService superAdminConsumerProfileEnsureService) {
		this.superAdminConsumerProfileEnsureService = superAdminConsumerProfileEnsureService;
	}

	@Override
	public void run(ApplicationArguments args) {
		superAdminConsumerProfileEnsureService.ensureSuperAdminConsumerProfileExists();
	}
}
