package it.luxury.dev;

import it.luxury.billing.service.SalonBillingEmailDispatchService;
import it.luxury.studio.domain.StudioGroup;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

/** Solo profilo {@code local}: invio email di prova senza passare da Stripe. */
@RestController
@RequestMapping("/api/v1/dev/email")
@Profile("local")
public class LocalDevEmailController {

	private final SalonBillingEmailDispatchService billingEmailDispatchService;

	public LocalDevEmailController(SalonBillingEmailDispatchService billingEmailDispatchService) {
		this.billingEmailDispatchService = billingEmailDispatchService;
	}

	@PostMapping("/premium-activation")
	public String sendPremiumActivationEmail(@RequestParam("to") String to) {
		String normalized = to == null ? "" : to.trim();
		if (normalized.isBlank() || !normalized.contains("@")) {
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
}
