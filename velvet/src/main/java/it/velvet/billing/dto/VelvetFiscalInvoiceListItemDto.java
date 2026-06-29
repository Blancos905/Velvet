package it.velvet.billing.dto;

import it.velvet.billing.domain.VelvetFiscalInvoice;
import it.velvet.billing.domain.VelvetFiscalInvoiceStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record VelvetFiscalInvoiceListItemDto(
		UUID id,
		String stripeInvoiceId,
		UUID studioGroupId,
		String invoiceNumber,
		LocalDate invoiceDate,
		long amountCents,
		String currency,
		String recipientLegalName,
		VelvetFiscalInvoiceStatus status,
		String skipReason,
		String xmlFilename,
		boolean downloadable,
		Instant stripePaidAt,
		Instant adminNotifiedAt,
		Instant createdAt) {

	public static VelvetFiscalInvoiceListItemDto from(VelvetFiscalInvoice row) {
		return new VelvetFiscalInvoiceListItemDto(
				row.getId(),
				row.getStripeInvoiceId(),
				row.getStudioGroupId(),
				row.getInvoiceNumber(),
				row.getInvoiceDate(),
				row.getAmountCents(),
				row.getCurrency(),
				row.getRecipientLegalName(),
				row.getStatus(),
				row.getSkipReason(),
				row.getXmlFilename(),
				row.getStatus() == VelvetFiscalInvoiceStatus.READY
						&& row.getXmlContent() != null
						&& !row.getXmlContent().isBlank(),
				row.getStripePaidAt(),
				row.getAdminNotifiedAt(),
				row.getCreatedAt());
	}
}
