package it.velvet.admin.service;

import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetSecurityProperties;
import it.velvet.config.VelvetSuperAdminProperties;
import it.velvet.security.auth.VelvetTokenService;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VelvetSuperAdminAuthServiceTest {

	@Test
	void login_plaintext_password_ok() {
		var props = new VelvetSuperAdminProperties("admin", "secret", "", "", "", "");
		var enc = new BCryptPasswordEncoder();
		var sec = new VelvetSecurityProperties("tok", null, 72, 15, 30, false, 30, 30);
		var tokenService = new VelvetTokenService(sec);
		PlatformSuperAdminCredentialSource noDb = Optional::empty;
		var svc = new VelvetSuperAdminAuthService(props, noDb, enc, tokenService, sec);
		var r = svc.login("Admin", "secret");
		assertThat(r.accessToken()).isNotBlank();
		assertThat(tokenService.parseAndValidate(r.accessToken())).isPresent();
		assertThat(tokenService.parseAndValidate(r.accessToken()).orElseThrow().hasAppRole("ADMIN")).isTrue();
	}

	@Test
	void login_bcrypt_hash_ok() {
		var enc = new BCryptPasswordEncoder();
		String hash = enc.encode("xxyyzz");
		var props = new VelvetSuperAdminProperties("root", "", hash, "", "", "");
		var sec = new VelvetSecurityProperties("tok", null, 72, 15, 30, false, 30, 30);
		var tokenService = new VelvetTokenService(sec);
		PlatformSuperAdminCredentialSource noDb = Optional::empty;
		var svc = new VelvetSuperAdminAuthService(props, noDb, enc, tokenService, sec);
		var r = svc.login("root", "xxyyzz");
		assertThat(r.accessToken()).isNotBlank();
	}

	@Test
	void login_wrong_password() {
		var props = new VelvetSuperAdminProperties("admin", "secret", "", "", "", "");
		var enc = new BCryptPasswordEncoder();
		var sec = new VelvetSecurityProperties("tok", null, 72, 15, 30, false, 30, 30);
		var tokenService = new VelvetTokenService(sec);
		PlatformSuperAdminCredentialSource noDb = Optional::empty;
		var svc = new VelvetSuperAdminAuthService(props, noDb, enc, tokenService, sec);
		assertThatThrownBy(() -> svc.login("admin", "other"))
				.isInstanceOf(BusinessException.class);
	}
}
