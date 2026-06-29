package it.velvet.notification.api;

import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.notification.domain.DeviceOsType;
import it.velvet.notification.domain.UserDeviceRepository;
import it.velvet.security.auth.VelvetTokenService;
import it.velvet.testsupport.VelvetConsumerTestCleanup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MeDevicesControllerTest {

	private static final String SUB = "kc-sub-devices-1";
	private static final String FCM_TOKEN = "fcm-token-test-abc123";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private UserDeviceRepository userDeviceRepository;

	@Autowired
	private VelvetTokenService velvetTokenService;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Autowired
	private VelvetConsumerTestCleanup velvetConsumerTestCleanup;

	@BeforeEach
	void clean() {
		velvetConsumerTestCleanup.deleteAllConsumerProfiles();
	}

	@Test
	void registerDevice_persistsTokenForAuthenticatedUser() throws Exception {
		ConsumerProfile profile = saveClientProfile();
		String token = velvetTokenService.createAccessToken(profile);

		mockMvc.perform(post("/api/v1/me/devices")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"token":"%s","os":"android"}
								""".formatted(FCM_TOKEN)))
				.andExpect(status().isOk());

		assertThat(userDeviceRepository.findByFcmToken(FCM_TOKEN)).isPresent();
		assertThat(userDeviceRepository.findByFcmToken(FCM_TOKEN).orElseThrow().getUserId()).isEqualTo(profile.getId());
		assertThat(userDeviceRepository.findByFcmToken(FCM_TOKEN).orElseThrow().getOsType()).isEqualTo(DeviceOsType.ANDROID);
	}

	@Test
	void registerDevice_reassignsExistingTokenToCurrentUser() throws Exception {
		ConsumerProfile first = saveClientProfile();
		ConsumerProfile second = new ConsumerProfile("kc-sub-devices-2", "other@example.com", "Altro");
		second.setPasswordHash(passwordEncoder.encode("x"));
		second.setSecurityRoles("CLIENT");
		consumerProfileRepository.save(second);

		userDeviceRepository.save(new it.velvet.notification.domain.UserDevice(first.getId(), FCM_TOKEN, DeviceOsType.IOS));

		String token = velvetTokenService.createAccessToken(second);
		mockMvc.perform(post("/api/v1/me/devices")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"token":"%s","os":"ios"}
								""".formatted(FCM_TOKEN)))
				.andExpect(status().isOk());

		assertThat(userDeviceRepository.findByFcmToken(FCM_TOKEN).orElseThrow().getUserId()).isEqualTo(second.getId());
		assertThat(userDeviceRepository.findByFcmToken(FCM_TOKEN).orElseThrow().getOsType()).isEqualTo(DeviceOsType.IOS);
	}

	@Test
	void unregisterDevice_removesTokenForCurrentUser() throws Exception {
		ConsumerProfile profile = saveClientProfile();
		userDeviceRepository.save(new it.velvet.notification.domain.UserDevice(profile.getId(), FCM_TOKEN, DeviceOsType.ANDROID));
		String token = velvetTokenService.createAccessToken(profile);

		mockMvc.perform(delete("/api/v1/me/devices/{token}", FCM_TOKEN).header("Authorization", "Bearer " + token))
				.andExpect(status().isOk());

		assertThat(userDeviceRepository.findByFcmToken(FCM_TOKEN)).isEmpty();
	}

	@Test
	void registerDevice_requiresAuthentication() throws Exception {
		mockMvc.perform(post("/api/v1/me/devices")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"token":"%s","os":"android"}
								""".formatted(FCM_TOKEN)))
				.andExpect(status().isUnauthorized());
	}

	private ConsumerProfile saveClientProfile() {
		ConsumerProfile profile = new ConsumerProfile(SUB, "client@example.com", "Cliente");
		profile.setPasswordHash(passwordEncoder.encode("x"));
		profile.setSecurityRoles("CLIENT");
		return consumerProfileRepository.save(profile);
	}
}
