package it.luxury.billing.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * PDF minimo (Helvetica) per ricevuta pagamento Premium al titolare —
 * non è FatturaPA (XML fiscale resta all'admin).
 */
final class SalonPremiumReceiptPdfBuilder {

	private static final ZoneId ITALY = ZoneId.of("Europe/Rome");
	private static final DateTimeFormatter ITALIAN_DATE =
			DateTimeFormatter.ofPattern("d MMMM yyyy HH:mm", Locale.ITALIAN);

	private SalonPremiumReceiptPdfBuilder() {
	}

	static byte[] build(
			String receiptNumber,
			String salonName,
			String amountLine,
			Instant paidAt,
			String stripeInvoiceId,
			String legalName) {
		List<String> lines = new ArrayList<>();
		lines.add("SALONI LUXURY");
		lines.add("Ricevuta di pagamento Premium");
		lines.add("");
		lines.add("Numero: " + safe(receiptNumber));
		lines.add("Data: " + (paidAt != null ? ITALIAN_DATE.format(paidAt.atZone(ITALY)) : "-"));
		lines.add("Salone: " + safe(salonName));
		if (legalName != null && !legalName.isBlank()) {
			lines.add("Intestatario: " + safe(legalName));
		}
		lines.add("Importo: " + safe(amountLine));
		lines.add("Riferimento: " + safe(stripeInvoiceId));
		lines.add("");
		lines.add("Documento commerciale di quietanza del pagamento");
		lines.add("abbonamento Premium sulla piattaforma Saloni Luxury.");
		lines.add("La fattura elettronica FatturaPA e' gestita");
		lines.add("dall'amministrazione della piattaforma.");
		lines.add("");
		lines.add("Assistenza: supporto@saloniluxury.it");
		try {
			return writeSimplePdf(lines);
		}
		catch (IOException ex) {
			throw new IllegalStateException("Generazione PDF ricevuta fallita", ex);
		}
	}

	private static String safe(String value) {
		if (value == null || value.isBlank()) {
			return "-";
		}
		String normalized = Normalizer.normalize(value.trim(), Normalizer.Form.NFD)
				.replaceAll("\\p{M}+", "");
		normalized = normalized.replace('€', 'E').replaceAll("[^\\x20-\\x7E]", "?");
		return normalized.length() > 90 ? normalized.substring(0, 90) : normalized;
	}

	private static byte[] writeSimplePdf(List<String> lines) throws IOException {
		StringBuilder content = new StringBuilder();
		content.append("BT\n/F1 11 Tf\n14 TL\n50 780 Td\n");
		boolean first = true;
		for (String line : lines) {
			if (!first) {
				content.append("T*\n");
			}
			first = false;
			content.append('(').append(escapePdfString(line)).append(") Tj\n");
		}
		content.append("ET\n");
		byte[] stream = content.toString().getBytes(StandardCharsets.US_ASCII);

		ByteArrayOutputStream out = new ByteArrayOutputStream();
		List<Integer> offsets = new ArrayList<>();
		write(out, "%PDF-1.4\n");
		offsets.add(out.size());
		write(out, "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
		offsets.add(out.size());
		write(out, "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
		offsets.add(out.size());
		write(out, "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
				+ "/Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n");
		offsets.add(out.size());
		write(out, "4 0 obj<< /Length " + stream.length + " >>stream\n");
		out.write(stream);
		write(out, "\nendstream\nendobj\n");
		offsets.add(out.size());
		write(out, "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");
		int xref = out.size();
		write(out, "xref\n0 6\n");
		write(out, "0000000000 65535 f \n");
		for (int off : offsets) {
			write(out, String.format(Locale.ROOT, "%010d 00000 n \n", off));
		}
		write(out, "trailer<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n");
		return out.toByteArray();
	}

	private static void write(ByteArrayOutputStream out, String s) throws IOException {
		out.write(s.getBytes(StandardCharsets.US_ASCII));
	}

	private static String escapePdfString(String s) {
		return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)");
	}
}
