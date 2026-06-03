package it.velvet.studio.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SalonDirectoryProvisioningServiceSlugifyTest {

	@Test
	void slugifyRemovesAccentsAndSpecials() {
		assertThat(SalonDirectoryProvisioningService.slugify("Caffè & Co.")).isEqualTo("caffe-co");
		assertThat(SalonDirectoryProvisioningService.slugify("  Spa 123  ")).isEqualTo("spa-123");
	}

	@Test
	void slugifyEmptyBecomesSalon() {
		assertThat(SalonDirectoryProvisioningService.slugify("")).isEqualTo("salon");
		assertThat(SalonDirectoryProvisioningService.slugify("!!!")).isEqualTo("salon");
	}
}
