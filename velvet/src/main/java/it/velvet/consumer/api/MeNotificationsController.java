package it.velvet.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.consumer.service.MeNotificationInboxService;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.dto.MeSalonNotificationInboxDto;
import it.velvet.studio.dto.MeSalonNotificationMessageDto;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/me/notifications")
@Tag(name = "Notifiche account consumatore (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeNotificationsController {

	private final MeNotificationInboxService meNotificationInboxService;

	public MeNotificationsController(MeNotificationInboxService meNotificationInboxService) {
		this.meNotificationInboxService = meNotificationInboxService;
	}

	@GetMapping
	@Operation(summary = "Conteggi notifiche account cliente")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER','ROLE_ADMIN','ROLE_STAFF')")
	public MeSalonNotificationInboxDto inbox(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return meNotificationInboxService.resolve(principal);
	}

	@GetMapping("/messages")
	@Operation(summary = "Ultimi messaggi notifiche account cliente")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER','ROLE_ADMIN','ROLE_STAFF')")
	public List<MeSalonNotificationMessageDto> messages(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@RequestParam("bucket") String bucket) {
		return meNotificationInboxService.listMessagesForBucket(principal, bucket);
	}

	@PostMapping("/inbox/ack-bucket")
	@Operation(summary = "Segna categoria notifiche cliente come consultata")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER','ROLE_ADMIN','ROLE_STAFF')")
	public MeSalonNotificationInboxDto ackBucket(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@RequestParam("bucket") String bucket) {
		return meNotificationInboxService.acknowledgeBucketInbox(principal, bucket);
	}

	@DeleteMapping("/messages/{id}")
	@Operation(summary = "Elimina messaggio notifiche cliente")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER','ROLE_ADMIN','ROLE_STAFF')")
	public void deleteMessage(@AuthenticationPrincipal VelvetUserPrincipal principal, @PathVariable UUID id) {
		meNotificationInboxService.deleteMessage(principal, id);
	}
}
