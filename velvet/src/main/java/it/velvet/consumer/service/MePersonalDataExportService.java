package it.velvet.consumer.service;

import it.velvet.appointment.service.AppointmentBookingService;
import it.velvet.consumer.api.MeFavoritesController.FavoriteDto;
import it.velvet.consumer.api.MeProfileController.ProfileDto;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.publicapi.dto.AppointmentResponses.AppointmentDto;
import it.velvet.security.auth.VelvetUserPrincipal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MePersonalDataExportService {

	private final ConsumerProfileService consumerProfileService;
	private final AppointmentBookingService appointmentBookingService;
	private final FavoriteLocationService favoriteLocationService;

	public MePersonalDataExportService(
			ConsumerProfileService consumerProfileService,
			AppointmentBookingService appointmentBookingService,
			FavoriteLocationService favoriteLocationService) {
		this.consumerProfileService = consumerProfileService;
		this.appointmentBookingService = appointmentBookingService;
		this.favoriteLocationService = favoriteLocationService;
	}

	@Transactional(readOnly = true)
	public Map<String, Object> exportForPrincipal(VelvetUserPrincipal principal) {
		ConsumerProfile profile = consumerProfileService.requireActiveProfile(principal);
		List<AppointmentDto> upcoming = appointmentBookingService.listUpcomingForConsumer(profile.getId()).stream()
				.map(AppointmentDto::from)
				.toList();
		List<AppointmentDto> past = appointmentBookingService.listPastForConsumer(profile.getId()).stream()
				.map(AppointmentDto::from)
				.toList();
		List<FavoriteDto> favorites = favoriteLocationService.list(principal).stream()
				.map(FavoriteDto::from)
				.toList();

		Map<String, Object> payload = new LinkedHashMap<>();
		payload.put("exportedAt", Instant.now());
		payload.put("profile", ProfileDto.from(profile));
		Map<String, Object> legalAcceptance = new LinkedHashMap<>();
		legalAcceptance.put("termsAcceptedAt", profile.getTermsAcceptedAt());
		legalAcceptance.put("legalDocumentVersion", profile.getLegalDocumentVersion());
		payload.put("legalAcceptance", legalAcceptance);
		payload.put("appointments", Map.of("upcoming", upcoming, "past", past));
		payload.put("favorites", favorites);
		return payload;
	}
}
