package it.luxury.studio.service;

import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.review.domain.Review;
import it.luxury.review.domain.ReviewRepository;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.dto.MeSalonReviewDto;
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
	public List<MeSalonReviewDto> list(LuxuryUserPrincipal principal) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Permessi insufficienti per consultare le recensioni salone.");
		}
		return studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.map(group -> reviewRepository.findByAppointment_Location_StudioGroup_IdOrderByCreatedAtDesc(group.getId()))
				.map(rows -> rows.stream().map(this::toDto).toList())
				.orElseGet(() -> listForLinkedStaffOperator(principal));
	}

	/**
	 * Elimina una recensione ricevuta: titolare su tutto lo studio; staff solo sulle proprie.
	 */
	@Transactional
	public void delete(LuxuryUserPrincipal principal, UUID reviewId) {
		if (principal == null || principal.getSubject() == null || principal.getSubject().isBlank()) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Permessi insufficienti.");
		}
		Review review = reviewRepository.findDetailedById(reviewId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Recensione non trovata."));
		var appointment = review.getAppointment();
		if (appointment == null || appointment.getLocation() == null || appointment.getLocation().getStudioGroup() == null) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Recensione non trovata.");
		}
		UUID studioId = appointment.getLocation().getStudioGroup().getId();
		var ownerGroup = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		if (ownerGroup.isPresent()) {
			if (!ownerGroup.get().getId().equals(studioId)) {
				throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Recensione non del tuo salone.");
			}
			reviewRepository.delete(review);
			return;
		}
		UUID profileId = principal.getProfileId();
		String sub = principal.getSubject();
		var linked = staffOperatorRepository.resolveLinkedOperatorForInbox(profileId, sub != null ? sub : "");
		if (linked.isEmpty()) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Permessi insufficienti per cancellare la recensione.");
		}
		var op = linked.get();
		if (!op.getLocation().getStudioGroup().getId().equals(studioId)) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Recensione non del tuo salone.");
		}
		if (appointment.getOperator() == null || !appointment.getOperator().getId().equals(op.getId())) {
			throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Puoi cancellare solo le recensioni dei tuoi appuntamenti.");
		}
		reviewRepository.delete(review);
	}

	private List<MeSalonReviewDto> listForLinkedStaffOperator(LuxuryUserPrincipal principal) {
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
