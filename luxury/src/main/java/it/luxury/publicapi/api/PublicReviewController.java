package it.luxury.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.publicapi.dto.ReviewShowcaseDtos.ReviewShowcaseResponse;
import it.luxury.review.domain.Review;
import it.luxury.review.service.ReviewCommandService;
import it.luxury.review.service.ReviewReadService;
import it.luxury.review.service.ReviewReadService.ReviewIntent;
import it.luxury.review.service.ReviewShowcaseService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/reviews")
@Tag(name = "Pubblico — recensioni (token)")
public class PublicReviewController {

	private final ReviewReadService reviewReadService;
	private final ReviewCommandService reviewCommandService;
	private final ReviewShowcaseService reviewShowcaseService;

	public PublicReviewController(
			ReviewReadService reviewReadService,
			ReviewCommandService reviewCommandService,
			ReviewShowcaseService reviewShowcaseService) {
		this.reviewReadService = reviewReadService;
		this.reviewCommandService = reviewCommandService;
		this.reviewShowcaseService = reviewShowcaseService;
	}

	@GetMapping("/showcase")
	@Operation(summary = "Anteprima recensioni piattaforma e sui saloni (pagina ricerca)")
	public ReviewShowcaseResponse showcase() {
		return reviewShowcaseService.buildShowcase();
	}

	@GetMapping("/intent")
	@Operation(summary = "Metadati recensione da token email/SMS")
	public ReviewIntent intent(@RequestParam String token) {
		return reviewReadService.intent(token);
	}

	@PostMapping
	@Operation(summary = "Invio recensione con token")
	public ReviewCreatedResponse submit(@RequestBody @Valid ReviewSubmitBody body) {
		Review r = reviewCommandService.submitFromToken(body.token(), body.rating(), body.staffRating(), body.comment());
		return new ReviewCreatedResponse(r.getId(), r.getRating(), r.getStaffRating(), r.getComment());
	}

	public record ReviewSubmitBody(
			@NotBlank String token,
			@Min(1) @Max(5) int rating,
			@Min(1) @Max(5) int staffRating,
			String comment) {
	}

	public record ReviewCreatedResponse(java.util.UUID id, int rating, Integer staffRating, String comment) {
	}
}
