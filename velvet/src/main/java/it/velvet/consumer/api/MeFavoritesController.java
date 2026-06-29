package it.velvet.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.consumer.domain.FavoriteLocation;
import it.velvet.consumer.service.FavoriteLocationService;
import org.springframework.security.access.prepost.PreAuthorize;
import it.velvet.security.auth.VelvetUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/favorites")
@Tag(name = "Account consumatore (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeFavoritesController {

	private final FavoriteLocationService favoriteLocationService;

	public MeFavoritesController(FavoriteLocationService favoriteLocationService) {
		this.favoriteLocationService = favoriteLocationService;
	}

	@GetMapping
	@Operation(summary = "Saloni preferiti ({organizationId} = id sede / location)")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER')")
	public List<FavoriteDto> list(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return favoriteLocationService.list(principal).stream().map(FavoriteDto::from).toList();
	}

	@PutMapping("/{organizationId}")
	@Operation(summary = "Aggiungi preferito (idempotente)")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER')")
	public void add(@AuthenticationPrincipal VelvetUserPrincipal principal, @PathVariable UUID organizationId) {
		favoriteLocationService.add(principal, organizationId);
	}

	@DeleteMapping("/{organizationId}")
	@Operation(summary = "Rimuovi preferito")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER')")
	public void remove(@AuthenticationPrincipal VelvetUserPrincipal principal, @PathVariable UUID organizationId) {
		favoriteLocationService.remove(principal, organizationId);
	}

	public record FavoriteDto(UUID id, UUID organizationId, String slug, String name, String city) {
		public static FavoriteDto from(FavoriteLocation f) {
			return new FavoriteDto(
					f.getId(),
					f.getLocation().getId(),
					f.getLocation().getSlug(),
					f.getLocation().getName(),
					f.getLocation().getCity());
		}
	}
}
