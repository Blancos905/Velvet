package it.luxury.billing.service;

import it.luxury.billing.domain.SalonBillingProfile;
import it.luxury.billing.domain.SalonBillingSubjectType;
import it.luxury.config.LuxuryBillingIssuerProperties;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Locale;

/** Genera XML FatturaPA FPR12 (formato per caricamento gratuito sul portale AdE). */
public final class FatturaPaXmlBuilder {

	private static final String NS =
			"http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2";

	private FatturaPaXmlBuilder() {
	}

	public record BuildInput(
			LuxuryBillingIssuerProperties issuer,
			SalonBillingProfile recipient,
			String progressiveInvio,
			String invoiceNumber,
			LocalDate invoiceDate,
			long amountCents,
			String currency,
			String lineDescription,
			String causale) {
	}

	public record BuildResult(String xml, String filename) {
	}

	public static BuildResult build(BuildInput input) {
		LuxuryBillingIssuerProperties issuer = input.issuer();
		SalonBillingProfile recipient = input.recipient();
		String issuerVat = require(issuer.normalizedVatDigits(), "P.IVA emittente");
		String issuerCountry = issuer.getCountry();
		String progressiveInvio = padProgressivoInvio(input.progressiveInvio());
		String amount = formatMoney(input.amountCents());
		boolean bolloRequired = input.amountCents() >= issuer.getBolloThresholdCents();
		String recipientCountry = normalizeCountry(recipient.getCountry());
		String sdi = trimUpper(recipient.getSdiCode());
		String pec = trimLower(recipient.getPecEmail());
		String codiceDestinatario = sdi != null ? sdi : "0000000";
		String recipientVat = normalizeItalianVat(recipient.getVatNumber());
		String recipientFiscal = trimUpper(recipient.getFiscalCode());
		SalonBillingSubjectType subjectType = SalonBillingSubjectType.parseOrNull(recipient.getSubjectType());
		boolean individual = subjectType == SalonBillingSubjectType.INDIVIDUAL;

		StringBuilder xml = new StringBuilder(4096);
		xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
		xml.append("<p:FatturaElettronica versione=\"FPR12\" ");
		xml.append("xmlns:ds=\"http://www.w3.org/2000/09/xmldsig#\" ");
		xml.append("xmlns:p=\"").append(NS).append("\" ");
		xml.append("xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" ");
		xml.append("xsi:schemaLocation=\"").append(NS).append(" ");
		xml.append(NS).append("/Schema_del_file_xml_FatturaPA_versione_1.2.xsd\">\n");

		xml.append("  <FatturaElettronicaHeader>\n");
		xml.append("    <DatiTrasmissione>\n");
		xml.append("      <IdTrasmittente><IdPaese>").append(issuerCountry).append("</IdPaese><IdCodice>")
				.append(escape(issuerVat)).append("</IdCodice></IdTrasmittente>\n");
		xml.append("      <ProgressivoInvio>").append(escape(progressiveInvio)).append("</ProgressivoInvio>\n");
		xml.append("      <FormatoTrasmissione>FPR12</FormatoTrasmissione>\n");
		xml.append("      <CodiceDestinatario>").append(escape(codiceDestinatario)).append("</CodiceDestinatario>\n");
		if (sdi == null && pec != null) {
			xml.append("      <PECDestinatario>").append(escape(pec)).append("</PECDestinatario>\n");
		}
		xml.append("    </DatiTrasmissione>\n");

		appendCedentePrestatore(xml, issuer, issuerVat, issuerCountry);
		appendCessionarioCommittente(xml, recipient, recipientCountry, recipientVat, recipientFiscal, individual);
		xml.append("  </FatturaElettronicaHeader>\n");

		xml.append("  <FatturaElettronicaBody>\n");
		xml.append("    <DatiGenerali>\n");
		xml.append("      <DatiGeneraliDocumento>\n");
		xml.append("        <TipoDocumento>TD01</TipoDocumento>\n");
		xml.append("        <Divisa>").append(escape(normalizeCurrency(input.currency()))).append("</Divisa>\n");
		xml.append("        <Data>").append(input.invoiceDate()).append("</Data>\n");
		xml.append("        <Numero>").append(escape(input.invoiceNumber())).append("</Numero>\n");
		if (bolloRequired) {
			xml.append("        <DatiBollo><BolloVirtuale>SI</BolloVirtuale><ImportoBollo>2.00</ImportoBollo></DatiBollo>\n");
		}
		xml.append("        <ImportoTotaleDocumento>").append(amount).append("</ImportoTotaleDocumento>\n");
		xml.append("        <Causale>").append(escape(input.causale())).append("</Causale>\n");
		xml.append("      </DatiGeneraliDocumento>\n");
		xml.append("    </DatiGenerali>\n");

		xml.append("    <DatiBeniServizi>\n");
		xml.append("      <DettaglioLinee>\n");
		xml.append("        <NumeroLinea>1</NumeroLinea>\n");
		xml.append("        <Descrizione>").append(escape(input.lineDescription())).append("</Descrizione>\n");
		xml.append("        <Quantita>1.00</Quantita>\n");
		xml.append("        <PrezzoUnitario>").append(amount).append("</PrezzoUnitario>\n");
		xml.append("        <PrezzoTotale>").append(amount).append("</PrezzoTotale>\n");
		xml.append("        <AliquotaIVA>").append(issuer.getVatRate()).append("</AliquotaIVA>\n");
		xml.append("        <Natura>").append(escape(issuer.getVatNature())).append("</Natura>\n");
		xml.append("      </DettaglioLinee>\n");
		xml.append("      <DatiRiepilogo>\n");
		xml.append("        <AliquotaIVA>").append(issuer.getVatRate()).append("</AliquotaIVA>\n");
		xml.append("        <Natura>").append(escape(issuer.getVatNature())).append("</Natura>\n");
		xml.append("        <ImponibileImporto>").append(amount).append("</ImponibileImporto>\n");
		xml.append("        <Imposta>0.00</Imposta>\n");
		xml.append("        <EsigibilitaIVA>I</EsigibilitaIVA>\n");
		if (bolloRequired) {
			xml.append("        <RiferimentoNormativo>Operazione effettuata ai sensi dell'art. 1 commi 54-89 L. 190/2014</RiferimentoNormativo>\n");
		}
		xml.append("      </DatiRiepilogo>\n");
		xml.append("    </DatiBeniServizi>\n");

		xml.append("    <DatiPagamento>\n");
		xml.append("      <CondizioniPagamento>TP02</CondizioniPagamento>\n");
		xml.append("      <DettaglioPagamento>\n");
		xml.append("        <ModalitaPagamento>MP08</ModalitaPagamento>\n");
		xml.append("        <DataScadenzaPagamento>").append(input.invoiceDate()).append("</DataScadenzaPagamento>\n");
		xml.append("        <ImportoPagamento>").append(amount).append("</ImportoPagamento>\n");
		xml.append("      </DettaglioPagamento>\n");
		xml.append("    </DatiPagamento>\n");
		xml.append("  </FatturaElettronicaBody>\n");
		xml.append("</p:FatturaElettronica>\n");

		String filename = "IT" + issuerVat + "_" + progressiveInvio + ".xml";
		return new BuildResult(xml.toString(), filename);
	}

	private static void appendCedentePrestatore(
			StringBuilder xml,
			LuxuryBillingIssuerProperties issuer,
			String issuerVat,
			String issuerCountry) {
		xml.append("    <CedentePrestatore>\n");
		xml.append("      <DatiAnagrafici>\n");
		xml.append("        <IdFiscaleIVA><IdPaese>").append(issuerCountry).append("</IdPaese><IdCodice>")
				.append(escape(issuerVat)).append("</IdCodice></IdFiscaleIVA>\n");
		String issuerCf = issuer.issuerFiscalCodeForXml();
		if (issuerCf != null && !issuerCf.isBlank()) {
			xml.append("        <CodiceFiscale>").append(escape(issuerCf)).append("</CodiceFiscale>\n");
		}
		xml.append("        <Anagrafica><Denominazione>").append(escape(issuer.getLegalName().trim()))
				.append("</Denominazione></Anagrafica>\n");
		xml.append("        <RegimeFiscale>").append(escape(issuer.getTaxRegime())).append("</RegimeFiscale>\n");
		xml.append("      </DatiAnagrafici>\n");
		appendSede(xml, issuer.getAddressLine1(), issuer.getPostalCode(), issuer.getCity(), issuer.getProvince(), issuerCountry);
		xml.append("    </CedentePrestatore>\n");
	}

	private static void appendCessionarioCommittente(
			StringBuilder xml,
			SalonBillingProfile recipient,
			String recipientCountry,
			String recipientVat,
			String recipientFiscal,
			boolean individual) {
		xml.append("    <CessionarioCommittente>\n");
		xml.append("      <DatiAnagrafici>\n");
		if (recipientVat != null) {
			xml.append("        <IdFiscaleIVA><IdPaese>").append(recipientCountry).append("</IdPaese><IdCodice>")
					.append(escape(recipientVat)).append("</IdCodice></IdFiscaleIVA>\n");
		}
		if (recipientFiscal != null && !recipientFiscal.isBlank()) {
			xml.append("        <CodiceFiscale>").append(escape(recipientFiscal)).append("</CodiceFiscale>\n");
		}
		xml.append("        <Anagrafica>");
		if (individual) {
			appendIndividualName(xml, recipient.getLegalName());
		}
		else {
			xml.append("<Denominazione>").append(escape(recipient.getLegalName().trim())).append("</Denominazione>");
		}
		xml.append("</Anagrafica>\n");
		xml.append("      </DatiAnagrafici>\n");
		appendSede(
				xml,
				recipient.getAddressLine1(),
				recipient.getPostalCode(),
				recipient.getCity(),
				recipient.getProvince(),
				recipientCountry);
		xml.append("    </CessionarioCommittente>\n");
	}

	private static void appendIndividualName(StringBuilder xml, String legalName) {
		String trimmed = legalName != null ? legalName.trim() : "";
		int space = trimmed.indexOf(' ');
		if (space > 0) {
			xml.append("<Nome>").append(escape(trimmed.substring(0, space))).append("</Nome>");
			xml.append("<Cognome>").append(escape(trimmed.substring(space + 1).trim())).append("</Cognome>");
		}
		else {
			xml.append("<Denominazione>").append(escape(trimmed)).append("</Denominazione>");
		}
	}

	private static void appendSede(
			StringBuilder xml,
			String address,
			String postalCode,
			String city,
			String province,
			String country) {
		xml.append("      <Sede>\n");
		xml.append("        <Indirizzo>").append(escape(require(address, "indirizzo"))).append("</Indirizzo>\n");
		xml.append("        <CAP>").append(escape(require(postalCode, "CAP"))).append("</CAP>\n");
		xml.append("        <Comune>").append(escape(require(city, "comune"))).append("</Comune>\n");
		xml.append("        <Provincia>").append(escape(require(province, "provincia").toUpperCase(Locale.ROOT)))
				.append("</Provincia>\n");
		xml.append("        <Nazione>").append(escape(country)).append("</Nazione>\n");
		xml.append("      </Sede>\n");
	}

	static String padProgressivoInvio(String raw) {
		if (raw == null || raw.isBlank()) {
			return "00001";
		}
		String s = raw.trim().toUpperCase(Locale.ROOT);
		if (s.length() > 5) {
			return s.substring(s.length() - 5);
		}
		return String.format(Locale.ROOT, "%5s", s).replace(' ', '0');
	}

	static String formatMoney(long amountCents) {
		return BigDecimal.valueOf(amountCents, 2).setScale(2, RoundingMode.HALF_UP).toPlainString();
	}

	static String escape(String raw) {
		if (raw == null) {
			return "";
		}
		return raw
				.replace("&", "&amp;")
				.replace("<", "&lt;")
				.replace(">", "&gt;")
				.replace("\"", "&quot;")
				.replace("'", "&apos;");
	}

	private static String normalizeCurrency(String currency) {
		if (currency == null || currency.isBlank()) {
			return "EUR";
		}
		return currency.trim().toUpperCase(Locale.ROOT);
	}

	private static String normalizeCountry(String country) {
		if (country == null || country.isBlank()) {
			return "IT";
		}
		return country.trim().toUpperCase(Locale.ROOT);
	}

	private static String normalizeItalianVat(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		String s = raw.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
		if (s.startsWith("IT")) {
			s = s.substring(2);
		}
		return s.matches("\\d{11}") ? s : null;
	}

	private static String trimUpper(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		return raw.trim().toUpperCase(Locale.ROOT);
	}

	private static String trimLower(String raw) {
		if (raw == null || raw.isBlank()) {
			return null;
		}
		return raw.trim().toLowerCase(Locale.ROOT);
	}

	private static String require(String value, String label) {
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException("Campo mancante: " + label);
		}
		return value.trim();
	}
}
