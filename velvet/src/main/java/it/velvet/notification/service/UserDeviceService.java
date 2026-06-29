package it.velvet.notification.service;

import it.velvet.common.api.BusinessException;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.service.ConsumerProfileService;
import it.velvet.notification.domain.DeviceOsType;
import it.velvet.notification.domain.UserDevice;
import it.velvet.notification.domain.UserDeviceRepository;
import it.velvet.security.auth.VelvetUserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
public class UserDeviceService {

	private final ConsumerProfileService consumerProfileService;
	private final UserDeviceRepository userDeviceRepository;

	public UserDeviceService(ConsumerProfileService consumerProfileService, UserDeviceRepository userDeviceRepository) {
		this.consumerProfileService = consumerProfileService;
		this.userDeviceRepository = userDeviceRepository;
	}

	@Transactional
	public void registerDevice(VelvetUserPrincipal principal, String fcmToken, DeviceOsType osType) {
		UUID userId = requireProfileId(principal);
		String normalizedToken = normalizeToken(fcmToken);
		UserDevice device = userDeviceRepository.findByFcmToken(normalizedToken)
				.orElseGet(() -> new UserDevice(userId, normalizedToken, osType));
		device.setUserId(userId);
		device.setOsType(osType);
		device.setFcmToken(normalizedToken);
		userDeviceRepository.save(device);
	}

	@Transactional
	public void unregisterDevice(VelvetUserPrincipal principal, String fcmToken) {
		UUID userId = requireProfileId(principal);
		userDeviceRepository.deleteByFcmTokenAndUserId(normalizeToken(fcmToken), userId);
	}

	public static DeviceOsType parseOsType(String raw) {
		if (raw == null || raw.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Campo os obbligatorio.");
		}
		try {
			return DeviceOsType.valueOf(raw.trim().toUpperCase(Locale.ROOT));
		}
		catch (IllegalArgumentException ex) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Valore os non valido: usare ANDROID o IOS.");
		}
	}

	private UUID requireProfileId(VelvetUserPrincipal principal) {
		ConsumerProfile profile = consumerProfileService.requireActiveProfile(principal);
		return profile.getId();
	}

	private static String normalizeToken(String fcmToken) {
		if (fcmToken == null || fcmToken.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Campo token obbligatorio.");
		}
		String trimmed = fcmToken.trim();
		if (trimmed.length() > 512) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Token FCM troppo lungo.");
		}
		return trimmed;
	}
}
