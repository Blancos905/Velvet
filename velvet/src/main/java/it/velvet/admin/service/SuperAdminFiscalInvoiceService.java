package it.velvet.admin.service;

import it.velvet.billing.domain.VelvetFiscalInvoice;
import it.velvet.billing.domain.VelvetFiscalInvoiceRepository;
import it.velvet.billing.domain.VelvetFiscalInvoiceStatus;
import it.velvet.billing.dto.VelvetFiscalInvoiceListItemDto;
import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetBillingIssuerProperties;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class SuperAdminFiscalInvoiceService {

	private final VelvetFiscalInvoiceRepository fiscalInvoiceRepository;
	private final VelvetBillingIssuerProperties issuerProperties;

	public SuperAdminFiscalInvoiceService(
			VelvetFiscalInvoiceRepository fiscalInvoiceRepository,
			VelvetBillingIssuerProperties issuerProperties) {
		this.fiscalInvoiceRepository = fiscalInvoiceRepository;
		this.issuerProperties = issuerProperties;
	}

	@Transactional(readOnly = true)
	public Page<VelvetFiscalInvoiceListItemDto> list(Pageable pageable, VelvetFiscalInvoiceStatus statusFilter) {
		Page<VelvetFiscalInvoice> page = statusFilter != null
				? fiscalInvoiceRepository.findByStatusOrderByCreatedAtDesc(statusFilter, pageable)
				: fiscalInvoiceRepository.findAllByOrderByCreatedAtDesc(pageable);
		return page.map(VelvetFiscalInvoiceListItemDto::from);
	}

	@Transactional(readOnly = true)
	public FiscalInvoiceDownload downloadXml(UUID id) {
		VelvetFiscalInvoice row = fiscalInvoiceRepository.findById(id)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Fattura non trovata."));
		if (row.getStatus() != VelvetFiscalInvoiceStatus.READY) {
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
