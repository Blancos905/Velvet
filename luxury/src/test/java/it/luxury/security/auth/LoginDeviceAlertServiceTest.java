package it.luxury.security.auth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LoginDeviceAlertServiceTest {

	@Test
	void fingerprintIsStableForSameUserAgent() {
		String a = LoginDeviceAlertService.fingerprintHash("Mozilla/5.0 Chrome/120");
		String b = LoginDeviceAlertService.fingerprintHash("Mozilla/5.0 Chrome/120");
		assertEquals(a, b);
		assertEquals(64, a.length());
	}

	@Test
	void summarizeDetectsChromeMac() {
		String summary = LoginDeviceAlertService.summarizeUserAgent(
				"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36");
		assertTrue(summary.contains("Chrome"));
		assertTrue(summary.contains("macOS"));
	}
}
