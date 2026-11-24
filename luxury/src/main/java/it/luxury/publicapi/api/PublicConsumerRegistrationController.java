package it.luxury.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.luxury.billing.service.BillingRegistrationPlanPolicy;
import it.luxury.consumer.service.SalonPartnerRegistrationOutcome;
import it.luxury.consumer.service.LuxuryAccountRegistrationService;
import it.luxury.publicapi.dto.ConsumerRegistrationRequest;
import it.luxury.publicapi.dto.RegistrationCreatedResponse;
import it.luxury.publicapi.dto.RegistrationSalonLocation;
import it.luxury.publicapi.dto.SalonBillingRegistrationPolicyDto;
import it.luxury.publicapi.dto.SalonRegistrationLocations;
import it.luxury.publicapi.validation.ConsumerRegistrationValidator;
import it.luxury.studio.domain.SalonBusinessType;
import it.luxury.studio.domain.SalonClientGender;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/consumer-registration")
@Tag(name = "Pubblico — registrazione titolare / salone (piani)")
public class PublicConsumerRegistrationController {

	private final LuxuryAccountRegistrationService luxuryAccountRegistrationService;
	private final BillingRegistrationPlanPolicy billingRegistrationPlanPolicy;

	public PublicConsumerRegistrationController(
			LuxuryAccountRegistrationService luxuryAccountRegistrationService,
			BillingRegistrationPlanPolicy billingRegistrationPlanPolicy) {
		this.luxuryAccountRegistrationService = luxuryAccountRegistrationService;
		this.billingRegistrationPlanPolicy = billingRegistrationPlanPolicy;
	}

	@PostMapping
	@Operation(summary = "Crea titolare salone (ruolo OWNER) e directory salone (form /piani)")
	public ResponseEntity<RegistrationCreatedResponse> register(@Valid @RequestBody ConsumerRegistrationRequest body) {
		List<RegistrationSalonLocation> locations = SalonRegistrationLocations.withDisplayNames(
				Objects.toString(body.salonName(), "").trim(),
				body.resolvedSalonLocations().stream().map(PublicConsumerRegistrationController::withDefaultCountrySalon).toList());
		ConsumerRegistrationValidator.requireSalonLocations(locations);
		RegistrationSalonLocation salon = locations.get(0);

		List<SalonBusinessType> businessTypes =
				ConsumerRegistrationValidator.normalizeSalonBusinessTypesOrThrow(body.salonBusinessTypes());
		ConsumerRegistrationValidator.requireSalonBusinessTypesForPartnerPlans(body.planTier(), businessTypes);
		List<SalonClientGender> clientGenders =
				ConsumerRegistrationValidator.normalizeSalonClientGendersOrThrow(body.salonClientGenders());
		ConsumerRegistrationValidator.requireSalonClientGendersForPartnerPlans(body.planTier(), clientGenders);
		if (billingRegistrationPlanPolicy.billingCheckoutRequiredForPremiumRegistration(body.planTier())) {
			ConsumerRegistrationValidator.requireBillingForPremiumPlan(body.planTier(), body.billingDetails(), body.email());
		}

			String requestedPlan = body.planTier();
			String provisionPlan = billingRegistrationPlanPolicy.effectiveProvisionPlanTier(requestedPlan);

			SalonPartnerRegistrationOutcome outcome = luxuryAccountRegistrationService.registerSalonPartner(
					body, provisionPlan, salon, locations, businessTypes, clientGenders);
			boolean checkoutRequired = billingRegistrationPlanPolicy.billingCheckoutRequiredForPremiumRegistration(requestedPlan);
			String message = "PLUS".equals(provisionPlan)
					? outcome.emailVerificationRequired()
							? "Abbiamo inviato un'email di conferma. Clicca il link per attivare il salone Plus."
							: "Salone registrato: l'email risulta già verificata. Accedi con le tue credenziali per iniziare con Plus."
					: outcome.emailVerificationRequired()
							? checkoutRequired
									? "Abbiamo inviato un'email di conferma. Clicca il link per completare il pagamento Premium e attivare il salone."
									: "Abbiamo inviato un'email di conferma. Clicca il link per attivare il salone Premium."
							: checkoutRequired
									? "Prosegui con il pagamento Premium su Stripe per attivare il salone."
									: "Salone registrato: l'email risulta già verificata. Accedi con le tue credenziali per iniziare con Premium.";
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new RegistrationCreatedResponse(
						message,
						outcome.emailVerificationRequired(),
						outcome.premiumCheckoutToken(),
						outcome.pollSecret()));
	}

	@GetMapping("/billing-policy")
	@Operation(summary = "Indica se la registrazione Premium richiede checkout Stripe")
	public SalonBillingRegistrationPolicyDto billingPolicy() {
		return new SalonBillingRegistrationPolicyDto(
				billingRegistrationPlanPolicy.billingCheckoutRequiredForPremiumRegistration("PREMIUM"));
	}

	/** Paese sede pubblica default Italia se omesso. */
	private static RegistrationSalonLocation withDefaultCountrySalon(RegistrationSalonLocation s) {
		if (s.country() != null && !s.country().isBlank()) {
			return s;
		}
		return new RegistrationSalonLocation(
				s.addressLine1(),
				s.postalCode(),
				s.city(),
				s.province(),
				"IT",
				s.displayName(),
				s.salonBusinessTypes(),
				s.salonClientGenders());
	}
}
