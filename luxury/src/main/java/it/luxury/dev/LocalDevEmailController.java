package it.luxury.dev;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import it.luxury.billing.service.SalonBillingEmailDispatchService;
import it.luxury.studio.domain.StudioGroup;

/** Solo profilo {@code local}: invio email di prova senza passare da Stripe o flussi reali. */
@RestController
@RequestMapping("/api/v1/dev/email")
@Profile("local")
public class LocalDevEmailController {

	private final SalonBillingEmailDispatchService billingEmailDispatchService;
	private final LocalDevEmailPreviewService emailPreviewService;

	public LocalDevEmailController(
			SalonBillingEmailDispatchService billingEmailDispatchService,
			LocalDevEmailPreviewService emailPreviewService) {
		this.billingEmailDispatchService = billingEmailDispatchService;
		this.emailPreviewService = emailPreviewService;
	}

	@PostMapping("/premium-activation")
	public String sendPremiumActivationEmail(@RequestParam("to") String to) {
		String normalized = normalizeTo(to);
		if (normalized == null) {
			return "Indirizzo email non valido.";
		}
		StudioGroup group = new StudioGroup("Salone Demo Premium");
		group.setOwnerEmail(normalized);
		billingEmailDispatchService.dispatchPaymentThankYou(
				group,
				0L,
				"eur",
				Instant.parse("2026-07-23T22:00:00Z"));
		return "Richiesta invio email Premium attivato → " + normalized;
	}

	@PostMapping("/send-all-samples")
	public Map<String, Object> sendAllSamples(@RequestParam("to") String to) {
		String normalized = normalizeTo(to);
		if (normalized == null) {
			return Map.of("ok", false, "error", "Indirizzo email non valido.");
		}
		try {
			List<String> sent = emailPreviewService.sendAllSamples(normalized);
			return Map.of("ok", true, "to", normalized, "count", sent.size(), "emails", sent);
		}
		catch (IllegalStateException ex) {
			return Map.of("ok", false, "error", ex.getMessage());
		}
	}

	private static String normalizeTo(String to) {
		String normalized = to == null ? "" : to.trim();
		if (normalized.isBlank() || !normalized.contains("@")) {
			return null;
		}
		return normalized;
	}
}
