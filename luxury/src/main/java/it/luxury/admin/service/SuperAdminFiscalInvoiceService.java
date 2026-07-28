package it.luxury.admin.service;

import it.luxury.billing.domain.LuxuryFiscalInvoice;
import it.luxury.billing.domain.LuxuryFiscalInvoiceRepository;
import it.luxury.billing.domain.LuxuryFiscalInvoiceStatus;
import it.luxury.billing.dto.LuxuryFiscalInvoiceListItemDto;
import it.luxury.common.api.BusinessException;
import it.luxury.config.LuxuryBillingIssuerProperties;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SuperAdminFiscalInvoiceService {

	private final LuxuryFiscalInvoiceRepository fiscalInvoiceRepository;
	private final LuxuryBillingIssuerProperties issuerProperties;

	public SuperAdminFiscalInvoiceService(
			LuxuryFiscalInvoiceRepository fiscalInvoiceRepository,
			LuxuryBillingIssuerProperties issuerProperties) {
		this.fiscalInvoiceRepository = fiscalInvoiceRepository;
		this.issuerProperties = issuerProperties;
	}

	@Transactional(readOnly = true)
	public Page<LuxuryFiscalInvoiceListItemDto> list(Pageable pageable, LuxuryFiscalInvoiceStatus statusFilter) {
		Page<LuxuryFiscalInvoice> page = statusFilter != null
				? fiscalInvoiceRepository.findByStatusOrderByCreatedAtDesc(statusFilter, pageable)
				: fiscalInvoiceRepository.findAllByOrderByCreatedAtDesc(pageable);
		return page.map(LuxuryFiscalInvoiceListItemDto::from);
	}

	@Transactional(readOnly = true)
	public FiscalInvoiceDownload downloadXml(UUID id) {
		LuxuryFiscalInvoice row = fiscalInvoiceRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Fattura non trovata."));
		if (row.getStatus() != LuxuryFiscalInvoiceStatus.READY) {
			throw new BusinessException(HttpStatus.CONFLICT, "NOT_READY", "Documento non generato: " + row.getSkipReason());
		}
		String xml = row.getXmlContent();
		if (xml == null || xml.isBlank()) {
			throw new BusinessException(HttpStatus.CONFLICT, "XML_MISSING", "XML fattura mancante.");
		}
		String filename = row.getXmlFilename() != null && !row.getXmlFilename().isBlank()
				? row.getXmlFilename()
				: "fattura.xml";
		return new FiscalInvoiceDownload(filename, xml);
	}

	@Transactional(readOnly = true)
	public FiscalInvoiceConfigStatus configStatus() {
		return new FiscalInvoiceConfigStatus(
				issuerProperties.isFatturapaEnabled(),
				issuerProperties.configured(),
				issuerProperties.getLegalName(),
				issuerProperties.normalizedVatDigits());
	}

	public record FiscalInvoiceDownload(String filename, String xml) {
	}

	public record FiscalInvoiceConfigStatus(
			boolean fatturapaEnabled,
			boolean issuerConfigured,
			String issuerLegalName,
			String issuerVatDigits) {
	}
}
