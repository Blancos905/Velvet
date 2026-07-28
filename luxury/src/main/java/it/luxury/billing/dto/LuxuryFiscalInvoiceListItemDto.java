package it.luxury.billing.dto;

import it.luxury.billing.domain.LuxuryFiscalInvoice;
import it.luxury.billing.domain.LuxuryFiscalInvoiceStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record LuxuryFiscalInvoiceListItemDto(
		UUID id,
		String stripeInvoiceId,
		UUID studioGroupId,
		String invoiceNumber,
		LocalDate invoiceDate,
		long amountCents,
		String currency,
		String recipientLegalName,
		LuxuryFiscalInvoiceStatus status,
		String skipReason,
		String xmlFilename,
		boolean downloadable,
		Instant stripePaidAt,
		Instant adminNotifiedAt,
		Instant createdAt) {

	public static LuxuryFiscalInvoiceListItemDto from(LuxuryFiscalInvoice row) {
		return new LuxuryFiscalInvoiceListItemDto(
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
				row.getStatus() == LuxuryFiscalInvoiceStatus.READY
						&& row.getXmlContent() != null
						&& !row.getXmlContent().isBlank(),
				row.getStripePaidAt(),
				row.getAdminNotifiedAt(),
				row.getCreatedAt());
	}
}
