package it.velvet.studio.service;

import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.review.domain.Review;
import it.velvet.review.domain.ReviewRepository;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.dto.MeSalonReviewDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class MeSalonReviewInboxService {

	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final StaffOperatorRepository staffOperatorRepository;
	private final ReviewRepository reviewRepository;

	public MeSalonReviewInboxService(
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			StaffOperatorRepository staffOperatorRepository,
			ReviewRepository reviewRepository) {
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.staffOperatorRepository = staffOperatorRepository;
		this.reviewRepository = reviewRepository;
	}

	/**
	 * Titolare: tutte le recensioni dello studio (risoluzione come {@code GET /me/salon}).
	 * Operatore: recensioni legate ad appuntamenti assegnati a lui (risoluzione come notifiche salone), anche se il JWT
	 * non espone ancora {@code ROLE_STAFF}.
	 * Altri profili: 403.
	 */
	@Transactional(readOnly = true)
	public List<MeSalonReviewDto> list(VelvetUserPrincipal principal) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Permessi insufficienti per consultare le recensioni salone.");
		}
		return studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.map(group -> reviewRepository.findByAppointment_Location_StudioGroup_IdOrderByCreatedAtDesc(group.getId()))
				.map(rows -> rows.stream().map(this::toDto).toList())
				.orElseGet(() -> listForLinkedStaffOperator(principal));
	}

	private List<MeSalonReviewDto> listForLinkedStaffOperator(VelvetUserPrincipal principal) {
		UUID profileId = principal.getProfileId();
		String sub = principal.getSubject();
		if (profileId == null && (sub == null || sub.isBlank())) {
			if (principal.hasAppRole("STAFF")) {
				return List.of();
			}
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Permessi insufficienti per consultare le recensioni salone.");
		}
		return staffOperatorRepository
				.resolveLinkedOperatorForInbox(profileId, sub != null ? sub : "")
				.map(op -> reviewRepository
						.findByAppointment_Location_StudioGroup_IdAndAppointment_Operator_IdOrderByCreatedAtDesc(
								op.getLocation().getStudioGroup().getId(), op.getId())
						.stream()
						.map(this::toDto)
						.toList())
				.orElseGet(() -> {
					if (principal.hasAppRole("STAFF")) {
						return List.of();
					}
					throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Permessi insufficienti per consultare le recensioni salone.");
				});
	}

	private MeSalonReviewDto toDto(Review review) {
		var appointment = review.getAppointment();
		var salonClient = appointment != null ? appointment.getSalonClient() : null;
		var consumer = appointment != null ? appointment.getConsumerProfile() : null;
		var location = appointment != null ? appointment.getLocation() : null;
		var service = appointment != null ? appointment.getService() : null;
		var operator = appointment != null ? appointment.getOperator() : null;
		String operatorName = operator != null && operator.getDisplayName() != null && !operator.getDisplayName().isBlank()
				? operator.getDisplayName().trim()
				: null;
		String reviewerName = salonClient != null && salonClient.getDisplayName() != null && !salonClient.getDisplayName().isBlank()
				? salonClient.getDisplayName().trim()
				: consumer != null && consumer.getDisplayName() != null && !consumer.getDisplayName().isBlank()
						? consumer.getDisplayName().trim()
						: "Cliente";
		return new MeSalonReviewDto(
				review.getId(),
				review.getRating(),
				review.getStaffRating(),
				operatorName,
				review.getComment(),
				review.getCreatedAt(),
				reviewerName,
				appointment != null ? appointment.getId() : null,
				appointment != null ? appointment.getStart() : null,
				service != null ? service.getName() : null,
				location != null ? location.getName() : null);
	}
}
