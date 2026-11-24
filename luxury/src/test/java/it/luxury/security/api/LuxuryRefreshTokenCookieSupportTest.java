package it.luxury.security.api;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LuxuryRefreshTokenCookieSupportTest {

	@Test
	void hostOnlyCookiesStayOnTheCurrentHost() {
		LuxuryRefreshTokenCookieSupport support = new LuxuryRefreshTokenCookieSupport("");
		MockHttpServletResponse response = new MockHttpServletResponse();

		support.writeRefreshCookie(response, "refresh-token", 1, false);

		List<String> cookies = response.getHeaders("Set-Cookie");
		assertThat(cookies).hasSize(2);
		assertThat(cookies.get(0)).contains("luxury_rt=").contains("HttpOnly").contains("Path=/api/v1/auth");
		assertThat(cookies.get(0)).doesNotContain("Domain=");
		assertThat(cookies.get(1)).contains("luxury_session=").contains("Path=/").doesNotContain("HttpOnly");
		assertThat(cookies.get(1)).doesNotContain("Domain=");
	}

	@Test
	void productionDomainIsSharedAndClearedWithTheRefreshCookie() {
		assertThat(LuxuryRefreshTokenCookieSupport.normalizeCookieDomain(".saloniluxury.it"))
				.isEqualTo("saloniluxury.it");
		LuxuryRefreshTokenCookieSupport support = new LuxuryRefreshTokenCookieSupport(".saloniluxury.it");
		MockHttpServletResponse response = new MockHttpServletResponse();

		support.writeRefreshCookie(response, "refresh-token", 1, true);
		support.clearRefreshCookie(response, true);

		List<String> cookies = response.getHeaders("Set-Cookie");
		assertThat(cookies).allMatch(header -> header.contains("Domain=saloniluxury.it"));
		assertThat(cookies.get(2)).contains("luxury_rt=").contains("Max-Age=0");
		assertThat(cookies.get(3)).contains("luxury_session=").contains("Max-Age=0");
	}

	@Test
	void rejectsADomainThatIsNotAHostSuffix() {
		assertThat(LuxuryRefreshTokenCookieSupport.normalizeCookieDomain("localhost")).isNull();
		assertThat(LuxuryRefreshTokenCookieSupport.normalizeCookieDomain("127.0.0.1")).isNull();
		assertThat(LuxuryRefreshTokenCookieSupport.normalizeCookieDomain("")).isNull();
	}
}
