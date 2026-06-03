package it.velvet.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.consumer.service.ConsumerProfileService;
import it.velvet.consumer.service.MeReviewHistoryService.MePendingReviewInviteItem;
import it.velvet.consumer.service.MeReviewHistoryService;
import it.velvet.consumer.service.MeReviewHistoryService.MeReviewHistoryItem;
import it.velvet.review.domain.PlatformReview;
import it.velvet.review.domain.Review;
import it.velvet.review.service.PlatformReviewCommandService;
import it.velvet.review.service.ReviewCommandService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import it.velvet.security.auth.VelvetUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/v1/me/reviews")
@Tag(name = "Account consumatore (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeReviewsController {

	private final ConsumerProfileService consumerProfileService;
	private final ReviewCommandService reviewCommandService;
	private final PlatformReviewCommandService platformReviewCommandService;
	private final MeReviewHistoryService meReviewHistoryService;

	public MeReviewsController(
			ConsumerProfileService consumerProfileService,
			ReviewCommandService reviewCommandService,
			PlatformReviewCommandService platformReviewCommandService,
			MeReviewHistoryService meReviewHistoryService) {
		this.consumerProfileService = consumerProfileService;
		this.reviewCommandService = reviewCommandService;
		this.platformReviewCommandService = platformReviewCommandService;
		this.meReviewHistoryService = meReviewHistoryService;
	}

	@GetMapping
	@Operation(summary = "Storico recensioni inviate dal cliente")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public List<MeReviewHistoryItem> list(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return meReviewHistoryService.list(principal);
	}

	@GetMapping("/pending")
	@Operation(summary = "Recensioni da inviare (dopo fine appuntamento + offset configurabile, default 2 h)")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public List<MePendingReviewInviteItem> listPending(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		return meReviewHistoryService.listPendingInvites(principal);
	}

	@PostMapping
	@Operation(summary = "Recensione post-visita (JWT)")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public ReviewResponse submit(@AuthenticationPrincipal VelvetUserPrincipal principal, @RequestBody @Valid ReviewBody body) {
		var profile = consumerProfileService.requireActiveProfile(principal);
		Review r = reviewCommandService.submitFromConsumer(
				body.appointmentId(), profile, body.rating(), body.staffRating(), body.comment());
		return new ReviewResponse(r.getId(), r.getRating(), r.getStaffRating(), r.getComment());
	}

	@PostMapping("/platform")
	@Operation(summary = "Valuta Saloni Velvet (solo clienti)")
	@PreAuthorize("hasAuthority('ROLE_CLIENT')")
	public PlatformReviewResponse submitPlatformReview(
			@AuthenticationPrincipal VelvetUserPrincipal principal,
			@RequestBody @Valid PlatformReviewRequest body) {
		PlatformReview r = platformReviewCommandService.submitAsClient(principal, body.rating(), body.comment());
		return new PlatformReviewResponse(r.getId(), r.getRating(), r.getComment());
	}

	public record ReviewBody(
			@NotNull UUID appointmentId,
			@Min(1) @Max(5) int rating,
			@Min(1) @Max(5) int staffRating,
			String comment) {
	}

	public record ReviewResponse(UUID id, int rating, Integer staffRating, String comment) {
	}

	public record PlatformReviewRequest(
			@Min(1) @Max(5) int rating,
			@Size(max = 4000) String comment) {
	}

	public record PlatformReviewResponse(UUID id, int rating, String comment) {
	}
}
