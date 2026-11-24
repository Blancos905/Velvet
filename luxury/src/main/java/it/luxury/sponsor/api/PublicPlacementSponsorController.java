package it.luxury.sponsor.api;

import it.luxury.sponsor.PlacementSponsorSlots;
import it.luxury.sponsor.service.PlacementSponsorService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/public/placement-sponsors")
public class PublicPlacementSponsorController {

	private final PlacementSponsorService service;

	public PublicPlacementSponsorController(PlacementSponsorService service) {
		this.service = service;
	}

	@GetMapping
	public List<PlacementSponsorView> list(
			@RequestParam(defaultValue = PlacementSponsorSlots.CLIENT_BOOKINGS) String placement) {
		return service.listPublic(placement);
	}
}
