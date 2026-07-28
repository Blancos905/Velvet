package it.luxury.admin.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.admin.service.SuperAdminFiscalInvoiceService;
import it.luxury.admin.service.SuperAdminFiscalInvoiceService.FiscalInvoiceConfigStatus;
import it.luxury.admin.service.SuperAdminFiscalInvoiceService.FiscalInvoiceDownload;
import it.luxury.billing.domain.LuxuryFiscalInvoiceStatus;
import it.luxury.billing.dto.LuxuryFiscalInvoiceListItemDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/fiscal-invoices")
@Tag(name = "Super admin — fatture elettroniche")
@SecurityRequirement(name = "bearerAuth")
public class SuperAdminFiscalInvoiceController {

	private final SuperAdminFiscalInvoiceService fiscalInvoiceService;

	public SuperAdminFiscalInvoiceController(SuperAdminFiscalInvoiceService fiscalInvoiceService) {
		this.fiscalInvoiceService = fiscalInvoiceService;
	}

	@GetMapping
	@Operation(summary = "Elenco fatture elettroniche generate da pagamenti Stripe")
	public Page<LuxuryFiscalInvoiceListItemDto> list(
			@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
			@RequestParam(required = false) LuxuryFiscalInvoiceStatus status) {
		return fiscalInvoiceService.list(pageable, status);
	}

	@GetMapping("/config-status")
	@Operation(summary = "Stato configurazione emittente FatturaPA")
	public FiscalInvoiceConfigStatus configStatus() {
		return fiscalInvoiceService.configStatus();
	}

	@GetMapping(value = "/{id}/xml", produces = MediaType.APPLICATION_XML_VALUE)
	@Operation(summary = "Scarica XML FatturaPA per caricamento portale AdE")
	public ResponseEntity<byte[]> downloadXml(@PathVariable UUID id) {
		FiscalInvoiceDownload download = fiscalInvoiceService.downloadXml(id);
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + download.filename() + "\"")
				.contentType(MediaType.APPLICATION_XML)
				.body(download.xml().getBytes(StandardCharsets.UTF_8));
	}
}
