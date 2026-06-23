package it.velvet.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.catalog.domain.SalonClient;
import it.velvet.consumer.service.SalonClientMembershipService;
import it.velvet.consumer.service.SalonVelvetChatService;
import it.velvet.consumer.service.SalonVelvetChatService.SalonVelvetChatInboxSummaryDto;
import it.velvet.consumer.service.SalonVelvetChatService.SalonVelvetChatMessageDto;
import it.velvet.consumer.service.SalonVelvetChatService.SalonVelvetChatUnreadDto;
import it.velvet.security.auth.VelvetUserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/salon-clients")
@Tag(name = "Account consumatore (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeSalonClientsController {

	private final SalonClientMembershipService salonClientMembershipService;
	private final SalonVelvetChatService salonVelvetChatService;

	public MeSalonClientsController(
			SalonClientMembershipService salonClientMembershipService,
			SalonVelvetChatService salonVelvetChatService) {
		this.salonClientMembershipService = salonClientMembershipService;
		this.salonVelvetChatService = salonVelvetChatService;
	}

	@GetMapping
	@Operation(summary = "Saloni in cui l'utente risulta cliente")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER')")
	public List<SalonClientMembershipDto> list(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return salonClientMembershipService.list(principal).stream()
				.map(SalonClientMembershipDto::from)
				.toList();
	}

	@PutMapping("/{organizationId}")
	@Operation(summary = "Diventa cliente di un salone (idempotente)")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public SalonClientMembershipDto becomeClient(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@PathVariable UUID organizationId) {
		return SalonClientMembershipDto.from(salonClientMembershipService.becomeClient(principal, organizationId));
	}

	@DeleteMapping("/{organizationId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(summary = "Non essere più cliente del salone (idempotente; con appuntamenti passati resta solo lo storico sede)")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER')")
	public void leaveClient(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@PathVariable UUID organizationId) {
		salonClientMembershipService.leaveClient(principal, organizationId);
	}

	/** Stessa semantica di {@link #leaveClient}; utile se proxy/firewall bloccano DELETE. */
	@PostMapping("/{organizationId}/leave")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(summary = "Non essere più cliente del salone (POST, alternativa a DELETE)")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER')")
	public void leaveClientPost(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@PathVariable UUID organizationId) {
		salonClientMembershipService.leaveClient(principal, organizationId);
	}

	@GetMapping("/chat/unread-count")
	@Operation(summary = "Messaggi chat non letti (lato cliente e lato titolare Premium)")
	@PreAuthorize("isAuthenticated()")
	public SalonVelvetChatUnreadDto chatUnreadCount(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return salonVelvetChatService.unreadTotals(principal);
	}

	@GetMapping("/chat/inbox-summaries")
	@Operation(summary = "Riepilogo conversazioni chat (non letti + anteprima ultimo messaggio)")
	@PreAuthorize("isAuthenticated()")
	public List<SalonVelvetChatInboxSummaryDto> chatInboxSummaries(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@RequestHeader(value = "X-Location-Id", required = false) UUID xLocationId) {
		return salonVelvetChatService.listInboxSummaries(principal, xLocationId);
	}

	@GetMapping("/chat/messages")
	@Operation(summary = "Messaggi chat B2C (salon_client_id; staff_operator_id opzionale per thread operatore)")
	@PreAuthorize("isAuthenticated()")
	public List<SalonVelvetChatMessageDto> listChatMessages(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@RequestParam("salonClientId") UUID salonClientId,
			@RequestParam(value = "staffOperatorId", required = false) UUID staffOperatorId) {
		return salonVelvetChatService.listMessages(principal, salonClientId, staffOperatorId);
	}

	@PostMapping("/chat/messages")
	@Operation(summary = "Invia messaggio chat B2C")
	@PreAuthorize("isAuthenticated()")
	public SalonVelvetChatMessageDto postChatMessage(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@Valid @RequestBody PostSalonVelvetChatBody body) {
		return salonVelvetChatService.postMessage(principal, body.salonClientId(), body.staffOperatorId(), body.body());
	}

	public record PostSalonVelvetChatBody(
			@NotNull UUID salonClientId,
			UUID staffOperatorId,
			@NotBlank @Size(max = 4000) String body) {
	}

	public record SalonClientMembershipDto(
			UUID id,
			UUID organizationId,
			String slug,
			String name,
			String city,
			Instant createdAt) {
		public static SalonClientMembershipDto from(SalonClient salonClient) {
			return new SalonClientMembershipDto(
					salonClient.getId(),
					salonClient.getLocation().getId(),
					salonClient.getLocation().getSlug(),
					salonClient.getLocation().getName(),
					salonClient.getLocation().getCity(),
					salonClient.getCreatedAt());
		}
	}
}
