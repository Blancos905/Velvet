package it.luxury.publicapi.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ClientNetworkAddressTest {

	@Test
	void publicPeerIsUsedAndForwardedHeaderIsIgnored() {
		assertThat(ClientNetworkAddress.publicClientIp("203.0.113.10", "198.51.100.8"))
				.contains("203.0.113.10");
	}

	@Test
	void privatePeerUsesFirstPublicForwardedAddress() {
		assertThat(ClientNetworkAddress.publicClientIp("127.0.0.1", "192.168.1.20, 203.0.113.44"))
				.contains("203.0.113.44");
	}

	@Test
	void lanOnlyAddressesAreNotGeolocatedAsClientIp() {
		assertThat(ClientNetworkAddress.publicClientIp("192.168.0.12", "10.0.0.4, 172.16.0.2")).isEmpty();
		assertThat(ClientNetworkAddress.publicClientIp("::1", null)).isEmpty();
	}

	@Test
	void stripsIpv4Port() {
		assertThat(ClientNetworkAddress.publicClientIp("203.0.113.9:54433", null)).contains("203.0.113.9");
	}
}
