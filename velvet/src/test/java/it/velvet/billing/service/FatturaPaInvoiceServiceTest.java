package it.velvet.billing.service;

import com.stripe.model.Invoice;
import it.velvet.billing.domain.SalonBillingProfile;
import it.velvet.billing.domain.SalonBillingProfileRepository;
import it.velvet.billing.domain.VelvetFiscalInvoice;
import it.velvet.billing.domain.VelvetFiscalInvoiceRepository;
import it.velvet.billing.domain.VelvetFiscalInvoiceStatus;
import it.velvet.config.VelvetBillingIssuerProperties;
import it.velvet.studio.domain.StudioGroup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FatturaPaInvoiceServiceTest {

	@Mock
	private VelvetBillingIssuerProperties issuerProperties;

	@Mock
	private SalonBillingProfileRepository billingProfileRepository;

	@Mock
	private VelvetFiscalInvoiceRepository fiscalInvoiceRepository;

	@Mock
	private FatturaPaAdminNotificationService adminNotificationService;

	private FatturaPaInvoiceService service;

	@BeforeEach
	void setUp() {
		service = new FatturaPaInvoiceService(
				issuerProperties,
				billingProfileRepository,
				fiscalInvoiceRepository,
				adminNotificationService);
	}

	@Test
	void issueFromStripeInvoice_generatesReadyXmlWhenConfigured() {
		UUID studioGroupId = UUID.randomUUID();
		StudioGroup group = new StudioGroup("Salone");
		SalonBillingProfile profile = completeProfile(group);

		when(fiscalInvoiceRepository.existsByStripeInvoiceId("in_test")).thenReturn(false);
		when(issuerProperties.isFatturapaEnabled()).thenReturn(true);
		when(issuerProperties.configured()).thenReturn(true);
		when(issuerProperties.normalizedVatDigits()).thenReturn("12345678901");
		when(issuerProperties.getLegalName()).thenReturn("Saloni Luxury S.r.l.");
		when(issuerProperties.getCountry()).thenReturn("IT");
		when(issuerProperties.getAddressLine1()).thenReturn("Via Roma 1");
		when(issuerProperties.getPostalCode()).thenReturn("00100");
		when(issuerProperties.getCity()).thenReturn("Roma");
		when(issuerProperties.getProvince()).thenReturn("RM");
		when(issuerProperties.getTaxRegime()).thenReturn("RF19");
		when(issuerProperties.getVatNature()).thenReturn("N2.2");
		when(issuerProperties.getVatRate()).thenReturn("0.00");
		when(issuerProperties.getBolloThresholdCents()).thenReturn(7747L);
		when(issuerProperties.issuerFiscalCodeForXml()).thenReturn("12345678901");
		when(billingProfileRepository.findByStudioGroup_Id(studioGroupId)).thenReturn(Optional.of(profile));
		when(fiscalInvoiceRepository.findMaxProgressiveForReadyInvoices(eq(2026), eq(VelvetFiscalInvoiceStatus.READY)))
				.thenReturn(0);

		Invoice invoice = new Invoice();
		invoice.setId("in_test");
		invoice.setStatus("paid");
		invoice.setAmountPaid(2000L);
		invoice.setCurrency("eur");
		invoice.setCreated(1_780_000_000L);

		service.issueFromStripeInvoice(invoice, studioGroupId);

		ArgumentCaptor<VelvetFiscalInvoice> captor = ArgumentCaptor.forClass(VelvetFiscalInvoice.class);
		verify(fiscalInvoiceRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
		VelvetFiscalInvoice saved = captor.getAllValues().get(0);
		assertEquals(VelvetFiscalInvoiceStatus.READY, saved.getStatus());
		assertEquals("2026/001", saved.getInvoiceNumber());
		assertNotNull(saved.getXmlContent());
		assertNotNull(saved.getXmlFilename());
		verify(adminNotificationService).notifyAdminIfConfigured(any(VelvetFiscalInvoice.class));
	}

	@Test
	void issueFromStripeInvoice_skipsWhenIssuerNotConfigured() {
		when(fiscalInvoiceRepository.existsByStripeInvoiceId("in_skip")).thenReturn(false);
		when(issuerProperties.isFatturapaEnabled()).thenReturn(true);
		when(issuerProperties.configured()).thenReturn(false);

		Invoice invoice = new Invoice();
		invoice.setId("in_skip");
		invoice.setStatus("paid");
		invoice.setAmountPaid(2000L);

		service.issueFromStripeInvoice(invoice, UUID.randomUUID());

		ArgumentCaptor<VelvetFiscalInvoice> captor = ArgumentCaptor.forClass(VelvetFiscalInvoice.class);
		verify(fiscalInvoiceRepository).save(captor.capture());
		assertEquals(VelvetFiscalInvoiceStatus.SKIPPED_ISSUER_NOT_CONFIGURED, captor.getValue().getStatus());
		verify(adminNotificationService, never()).notifyAdminIfConfigured(any());
	}

	private static SalonBillingProfile completeProfile(StudioGroup group) {
		SalonBillingProfile profile = new SalonBillingProfile(group);
		profile.setLegalName("Cliente Demo S.r.l.");
		profile.setBillingEmail("fatture@cliente.it");
		profile.setVatNumber("10987654321");
		profile.setFiscalCode("10987654321");
		profile.setSubjectType("COMPANY");
		profile.setAddressLine1("Via Verdi 5");
		profile.setPostalCode("10100");
		profile.setCity("Torino");
		profile.setProvince("TO");
		profile.setCountry("IT");
		profile.setSdiCode("ABC1234");
		return profile;
	}
}
