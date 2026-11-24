package it.luxury.sponsor.api;

import it.luxury.sponsor.service.PlacementSponsorService;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/placement-sponsors")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class SuperAdminPlacementSponsorController {

	private final PlacementSponsorService service;

	public SuperAdminPlacementSponsorController(PlacementSponsorService service) {
		this.service = service;
	}

	@GetMapping
	public List<PlacementSponsorView> list(@RequestParam String placement) {
		return service.listAdmin(placement);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public PlacementSponsorView create(@RequestBody PlacementSponsorWrite write) {
		return service.create(write);
	}

	@PutMapping("/{id}")
	public PlacementSponsorView update(@PathVariable UUID id, @RequestBody PlacementSponsorWrite write) {
		return service.update(id, write);
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void delete(@PathVariable UUID id) {
		service.delete(id);
	}
}
