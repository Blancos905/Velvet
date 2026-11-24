package it.luxury.billing.service;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertTrue;

class SalonPremiumReceiptPdfBuilderTest {

	@Test
	void buildsValidPdfHeader() {
		byte[] pdf = SalonPremiumReceiptPdfBuilder.build(
				"RCV-2026-DEMO1234",
				"Hair Jassa Demo",
				"EUR 29.00",
				Instant.parse("2026-08-23T10:00:00Z"),
				"in_preview_demo123",
				"Hair Jassa Srl");
		assertTrue(pdf.length > 100);
		assertTrue(new String(pdf, 0, 5).startsWith("%PDF-"));
	}
}
