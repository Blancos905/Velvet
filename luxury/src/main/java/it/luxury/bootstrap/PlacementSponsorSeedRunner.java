package it.luxury.bootstrap;

import it.luxury.sponsor.service.PlacementSponsorService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Riempie l'agenda con cinque sponsor di prova finché il super admin non ne imposta di suoi. */
@Component
@Order(40)
public class PlacementSponsorSeedRunner implements ApplicationRunner {

	private final PlacementSponsorService placementSponsorService;

	public PlacementSponsorSeedRunner(PlacementSponsorService placementSponsorService) {
		this.placementSponsorService = placementSponsorService;
	}

	@Override
	public void run(ApplicationArguments args) {
		placementSponsorService.seedAgendaIfEmpty();
	}
}
