package it.luxury.billing.service;

import it.luxury.billing.domain.SalonBillingProfile;
import it.luxury.config.LuxuryBillingIssuerProperties;
import it.luxury.studio.domain.StudioGroup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FatturaPaXmlBuilderTest {

	private LuxuryBillingIssuerProperties issuer;
	private SalonBillingProfile recipient;

	@BeforeEach
	void setUp() {
		issuer = new LuxuryBillingIssuerProperties();
		issuer.setLegalName("Saloni Luxury S.r.l.");
		issuer.setVatNumber("12345678901");
		issuer.setFiscalCode("12345678901");
		issuer.setAddressLine1("Via Roma 1");
		issuer.setPostalCode("00100");
		issuer.setCity("Roma");
		issuer.setProvince("RM");
		issuer.setCountry("IT");
		issuer.setTaxRegime("RF19");
		issuer.setVatNature("N2.2");
		issuer.setVatRate("0.00");

		StudioGroup group = new StudioGroup("Salone Demo");
		recipient = new SalonBillingProfile(group);
		recipient.setLegalName("Parrucchieri Demo S.n.c.");
		recipient.setBillingEmail("fatture@demo.it");
		recipient.setVatNumber("10987654321");
		recipient.setFiscalCode("10987654321");
		recipient.setSubjectType("COMPANY");
		recipient.setAddressLine1("Corso Italia 10");
		recipient.setPostalCode("20100");
		recipient.setCity("Milano");
		recipient.setProvince("MI");
		recipient.setCountry("IT");
		recipient.setSdiCode("M5UXCR1");
	}

	@Test
	void build_producesFpr12XmlWithSdiRecipient() {
		FatturaPaXmlBuilder.BuildResult result = FatturaPaXmlBuilder.build(
				new FatturaPaXmlBuilder.BuildInput(
						issuer,
						recipient,
						"1",
						"2026/001",
						LocalDate.of(2026, 6, 23),
						2000L,
						"eur",
						"Abbonamento Premium",
						"Canone mensile"));

		assertEquals("IT12345678901_00001.xml", result.filename());
		assertTrue(result.xml().contains("versione=\"FPR12\""));
		assertTrue(result.xml().contains("<CodiceDestinatario>M5UXCR1</CodiceDestinatario>"));
		assertTrue(result.xml().contains("<Denominazione>Saloni Luxury S.r.l.</Denominazione>"));
		assertTrue(result.xml().contains("<Denominazione>Parrucchieri Demo S.n.c.</Denominazione>"));
		assertTrue(result.xml().contains("<ImportoTotaleDocumento>20.00</ImportoTotaleDocumento>"));
		assertTrue(result.xml().contains("<Natura>N2.2</Natura>"));
		assertTrue(result.xml().contains("<RegimeFiscale>RF19</RegimeFiscale>"));
	}

	@Test
	void build_usesPecWhenSdiMissing() {
		recipient.setSdiCode(null);
		recipient.setPecEmail("fatture@pec.demo.it");

		FatturaPaXmlBuilder.BuildResult result = FatturaPaXmlBuilder.build(
				new FatturaPaXmlBuilder.BuildInput(
						issuer,
						recipient,
						"2",
						"2026/002",
						LocalDate.of(2026, 6, 23),
						2000L,
						"eur",
						"Abbonamento Premium",
						"Canone mensile"));

		assertTrue(result.xml().contains("<CodiceDestinatario>0000000</CodiceDestinatario>"));
		assertTrue(result.xml().contains("<PECDestinatario>fatture@pec.demo.it</PECDestinatario>"));
	}

	@Test
	void padProgressivoInvio_zeroPadsToFiveChars() {
		assertEquals("00042", FatturaPaXmlBuilder.padProgressivoInvio("42"));
	}

	@Test
	void formatMoney_formatsCents() {
		assertEquals("20.00", FatturaPaXmlBuilder.formatMoney(2000L));
		assertEquals("77.47", FatturaPaXmlBuilder.formatMoney(7747L));
	}
}
