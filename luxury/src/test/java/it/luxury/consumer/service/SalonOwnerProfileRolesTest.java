package it.luxury.consumer.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SalonOwnerProfileRolesTest {

	@Test
	void removesClientAndKeepsOwner() {
		assertThat(SalonOwnerProfileRoles.applySalonDirectoryTitolare("CLIENT,OWNER")).isEqualTo("OWNER");
	}

	@Test
	void removesClientPreservesAdmin() {
		assertThat(SalonOwnerProfileRoles.applySalonDirectoryTitolare("ADMIN,CLIENT")).isEqualTo("ADMIN,OWNER");
	}

	@Test
	void clientOnlyBecomesOwner() {
		assertThat(SalonOwnerProfileRoles.applySalonDirectoryTitolare("CLIENT")).isEqualTo("OWNER");
	}
}
