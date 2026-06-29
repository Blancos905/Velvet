package it.velvet.admin.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.admin.dto.SuperAdminOverviewDtos.SuperAdminOverviewResponse;
import it.velvet.admin.dto.SuperAdminOverviewDtos.SuperAdminRecentSalonRow;
import it.velvet.admin.dto.SuperAdminOverviewDtos.SuperAdminSalonStaffRow;
import it.velvet.admin.dto.SuperAdminOverviewDtos.SuperAdminPlatformReviewRow;
import it.velvet.review.dto.SuperAdminSalonReviewSummaryRow;
import it.velvet.admin.service.SuperAdminConsumerManagementService;
import it.velvet.admin.service.SuperAdminMeProfileService;
import it.velvet.admin.service.SuperAdminMeProfileService.SuperAdminMeProfileDto;
import it.velvet.admin.service.SuperAdminMeProfileService.SuperAdminMeProfilePatchRequest;
import it.velvet.admin.service.SuperAdminPasswordChangeService;
import it.velvet.admin.service.SuperAdminOverviewActionsService;
import it.velvet.admin.service.SuperAdminOverviewActionsService.SuperAdminCreateClientRequest;
import it.velvet.admin.service.SuperAdminOverviewActionsService.SuperAdminCreateSalonRequest;
import it.velvet.admin.service.SuperAdminOverviewActionsService.SuperAdminSystemNotificationRequest;
import it.velvet.admin.service.SuperAdminOverviewActionsService.SuperAdminUpdateSalonRequest;
import it.velvet.admin.service.SuperAdminOverviewService;
import it.velvet.admin.service.SuperAdminSupportInboxService;
import it.velvet.common.api.BusinessException;
import it.velvet.security.auth.VelvetUserPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/overview")
@Tag(name = "Super admin — panoramica")
public class SuperAdminOverviewController {

	private final SuperAdminOverviewService overviewService;
	private final SuperAdminMeProfileService superAdminMeProfileService;
	private final SuperAdminPasswordChangeService superAdminPasswordChangeService;
	private final SuperAdminOverviewActionsService overviewActionsService;
	private final SuperAdminSupportInboxService superAdminSupportInboxService;
	private final SuperAdminConsumerManagementService consumerManagementService;

	public SuperAdminOverviewController(
			SuperAdminOverviewService overviewService,
			SuperAdminMeProfileService superAdminMeProfileService,
			SuperAdminPasswordChangeService superAdminPasswordChangeService,
			SuperAdminOverviewActionsService overviewActionsService,
			SuperAdminSupportInboxService superAdminSupportInboxService,
			SuperAdminConsumerManagementService consumerManagementService) {
		this.overviewService = overviewService;
		this.superAdminMeProfileService = superAdminMeProfileService;
		this.superAdminPasswordChangeService = superAdminPasswordChangeService;
		this.overviewActionsService = overviewActionsService;
		this.superAdminSupportInboxService = superAdminSupportInboxService;
		this.consumerManagementService = consumerManagementService;
	}

	@GetMapping
	@Operation(
			summary = "Statistiche globali, elenchi recenti e profilo super admin",
			description = "Include `superAdminProfile` (stesso dato di assistenza: email/telefono da consumer_profiles). "
					+ "Include sempre `supportInboxSalonUnreadCount` (badge «Messaggi»: richieste dai saloni dopo l'ultima apertura di quella sezione). "
					+ "Con `includeSupportInbox=true` aggiunge `supportInboxMessages` (stesso dato degli endpoint inbox dedicati).")
	@SecurityRequirement(name = "bearer-jwt")
	public SuperAdminOverviewResponse overview(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@RequestParam(name = "includeSupportInbox", defaultValue = "false") boolean includeSupportInbox,
			@RequestParam(name = "supportInboxFromSalonsOnly", defaultValue = "false") boolean supportInboxFromSalonsOnly) {
		return overviewService.build(principal, includeSupportInbox, supportInboxFromSalonsOnly);
	}

	@PatchMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(
			summary = "Aggiorna profilo super admin (telefono assistenza, ecc.)",
			description = "Persiste su consumer_profiles; stesso record usato da GET /api/v1/me/support.")
	@SecurityRequirement(name = "bearer-jwt")
	public SuperAdminMeProfileDto patchSuperAdminProfile(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@RequestBody @Valid SuperAdminMeProfilePatchRequest body) {
		return superAdminMeProfileService.patch(principal, body);
	}

	@PostMapping(path = "/password", consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(
			summary = "Cambia password super admin",
			description = "Aggiorna la riga credenziali persistite e allinea il profilo consumer usato da assistenza. "
					+ "Se il super admin usa solo proprietà (velvet.super-admin.*) senza riga DB, risponde 400: modificare l'ambiente.")
	@SecurityRequirement(name = "bearer-jwt")
	public void changeSuperAdminPassword(@RequestBody @Valid SuperAdminPasswordChangeRequest body) {
		if (body.newPassword() == null || !body.newPassword().equals(body.confirmPassword())) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Conferma password non coerente.");
		}
		superAdminPasswordChangeService.changePassword(body.currentPassword(), body.newPassword());
	}

	@GetMapping("/salons")
	@Operation(summary = "Elenco paginato saloni registrati")
	@SecurityRequirement(name = "bearer-jwt")
	public Page<SuperAdminRecentSalonRow> listSalons(
			@PageableDefault(size = 20, sort = "createdAt") Pageable pageable,
			@RequestParam(required = false) String planTier,
			@RequestParam(required = false) String subscriptionBilling) {
		return overviewActionsService.listSalons(pageable, planTier, subscriptionBilling);
	}

	@GetMapping("/salons/{studioGroupId}/staff")
	@Operation(summary = "Elenco operatori staff del salone (tutte le sedi)")
	@SecurityRequirement(name = "bearer-jwt")
	public List<SuperAdminSalonStaffRow> listSalonStaff(@PathVariable UUID studioGroupId) {
		return overviewActionsService.listSalonStaff(studioGroupId);
	}

	@DeleteMapping("/salons/{studioGroupId}/staff/{operatorId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(summary = "Elimina membro staff del salone (super admin)")
	@SecurityRequirement(name = "bearer-jwt")
	public void deleteSalonStaff(@PathVariable UUID studioGroupId, @PathVariable UUID operatorId) {
		overviewActionsService.deleteSalonStaff(studioGroupId, operatorId);
	}

	@GetMapping("/reviews")
	@Operation(
			summary = "Media recensioni post-visita per salone (paginate)",
			description = "Una riga per salone: media voto su tutte le sedi e servizi, conteggio recensioni. Ordine: media voto decrescente, poi nome salone.")
	@SecurityRequirement(name = "bearer-jwt")
	public Page<SuperAdminSalonReviewSummaryRow> listReviews(@PageableDefault(size = 10) Pageable pageable) {
		return overviewActionsService.listReviews(pageable);
	}

	@PostMapping("/reviews/{reviewId}/hide")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(
			summary = "Nasconde una recensione post-visita dal pubblico",
			description = "Moderazione su segnalazione (contenuti illeciti o violazione termini). La recensione resta in DB ma non compare in vetrina.")
	@SecurityRequirement(name = "bearer-jwt")
	public void hideSalonReview(@PathVariable UUID reviewId) {
		overviewActionsService.hideSalonReview(reviewId);
	}

	@GetMapping("/platform-reviews")
	@Operation(
			summary = "Recensioni sulla piattaforma Saloni Luxury (paginate)",
			description = "Ordine: voto (stelle) decrescente, poi data creazione decrescente.")
	@SecurityRequirement(name = "bearer-jwt")
	public Page<SuperAdminPlatformReviewRow> listPlatformReviews(
			@PageableDefault(size = 10, sort = "rating", direction = Sort.Direction.DESC) Pageable pageable) {
		return overviewActionsService.listPlatformReviews(pageable);
	}

	@DeleteMapping("/supportmessages/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(
			summary = "Archivia richiesta Assistenza (inbox verso Velvet)",
			description = "Path senza trattini nel segmento URL per compatibilità con proxy che rispondono 404 su `support-inbox`.")
	@SecurityRequirement(name = "bearer-jwt")
	public void deleteSupportInboxMessageCompat(@PathVariable UUID id) {
		superAdminSupportInboxService.deleteMessage(id);
	}

	@PostMapping("/support-inbox/salons/mark-seen")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(
			summary = "Segna come viste le richieste dai saloni",
			description = "Aggiorna il timestamp di lettura usato per il badge «Messaggi» (solo richieste da titolari/staff salone).")
	@SecurityRequirement(name = "bearer-jwt")
	public void markSalonSupportInboxSeen() {
		superAdminSupportInboxService.markSalonSupportInboxSeen();
	}

	@PostMapping(path = "/clients", consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Crea cliente (ruolo CLIENT) da pannello super admin")
	@SecurityRequirement(name = "bearer-jwt")
	public void createClient(@RequestBody @Valid SuperAdminCreateClientRequest body) {
		overviewActionsService.createClient(body);
	}

	@PostMapping(path = "/salons", consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@Operation(summary = "Crea titolare salone e directory salone da pannello super admin")
	@SecurityRequirement(name = "bearer-jwt")
	public void createSalon(@RequestBody @Valid SuperAdminCreateSalonRequest body) {
		overviewActionsService.createSalon(body);
	}

	@DeleteMapping("/salons/{studioGroupId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(summary = "Elimina salone (studio, sedi e dati operativi collegati)")
	@SecurityRequirement(name = "bearer-jwt")
	public void deleteSalon(@PathVariable UUID studioGroupId) {
		overviewActionsService.deleteSalon(studioGroupId);
	}

	@PatchMapping(path = "/salons/{studioGroupId}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(summary = "Modifica dati base salone (nome/citta)")
	@SecurityRequirement(name = "bearer-jwt")
	public void updateSalon(@PathVariable UUID studioGroupId, @RequestBody @Valid SuperAdminUpdateSalonRequest body) {
		overviewActionsService.updateSalon(studioGroupId, body);
	}

	@PostMapping("/salons/{studioGroupId}/owner-session")
	@Operation(
			summary = "Sessione titolare salone (JWT Velvet)",
			description = "Emissione di un access token come per il login password, senza credenziali titolare. Solo super admin.")
	@SecurityRequirement(name = "bearer-jwt")
	public SalonOwnerSessionResponse issueSalonOwnerSession(@PathVariable UUID studioGroupId) {
		var r = overviewActionsService.issueSalonOwnerVelvetSession(studioGroupId);
		return new SalonOwnerSessionResponse(r.accessToken(), "Bearer", r.expiresInSeconds());
	}

	/**
	 * Stesso contratto di {@code POST /api/v1/admin/consumers/{id}/session}: path sotto {@code /overview/} per proxy che
	 * non inoltrano {@code /admin/consumers/**} o per client aggiornati prima del controller dedicato.
	 */
	@PostMapping("/consumers/{profileId}/session")
	@Operation(
			summary = "Sessione profilo consumatore (JWT Velvet)",
			description = "Emissione di un access token come per il login password, senza credenziali. Esclusi profili eliminati o con ruolo ADMIN. Solo super admin.")
	@SecurityRequirement(name = "bearer-jwt")
	public SalonOwnerSessionResponse issueConsumerVelvetSession(@PathVariable UUID profileId) {
		var r = consumerManagementService.issueConsumerVelvetSession(profileId);
		return new SalonOwnerSessionResponse(r.accessToken(), "Bearer", r.expiresInSeconds());
	}

	@PostMapping(path = "/system-notifications", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(
			summary = "Messaggi in-app ai titolari selezionati",
			description = "Crea voci nel centro notifiche salone (bucket SYSTEM), senza invio email.")
	@SecurityRequirement(name = "bearer-jwt")
	public SuperAdminOverviewActionsService.SuperAdminSystemNotificationResult sendSystemNotification(
			@RequestBody SuperAdminSystemNotificationRequest body) {
		return overviewActionsService.sendSystemNotification(body);
	}

	public record SalonOwnerSessionResponse(String accessToken, String tokenType, long expiresInSeconds) {
	}

	public record SuperAdminPasswordChangeRequest(
			@NotBlank @Size(max = 200) String currentPassword,
			@NotBlank @Size(min = 8, max = 200) String newPassword,
			@NotBlank @Size(min = 8, max = 200) String confirmPassword) {
	}
}
