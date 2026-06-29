package it.velvet.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.billing.service.BillingRegistrationPlanPolicy;
import it.velvet.consumer.service.SalonPartnerRegistrationOutcome;
import it.velvet.consumer.service.VelvetAccountRegistrationService;
import it.velvet.publicapi.dto.ConsumerRegistrationRequest;
import it.velvet.publicapi.dto.RegistrationCreatedResponse;
import it.velvet.publicapi.dto.RegistrationSalonLocation;
import it.velvet.publicapi.dto.SalonBillingRegistrationPolicyDto;
import it.velvet.publicapi.validation.ConsumerRegistrationValidator;
import it.velvet.studio.domain.SalonBusinessType;
import it.velvet.studio.domain.SalonClientGender;
import it.velvet.studio.domain.StudioGroup;
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

	private final VelvetAccountRegistrationService velvetAccountRegistrationService;
	private final BillingRegistrationPlanPolicy billingRegistrationPlanPolicy;

	public PublicConsumerRegistrationController(
			VelvetAccountRegistrationService velvetAccountRegistrationService,
			BillingRegistrationPlanPolicy billingRegistrationPlanPolicy) {
		this.velvetAccountRegistrationService = velvetAccountRegistrationService;
		this.billingRegistrationPlanPolicy = billingRegistrationPlanPolicy;
	}

	@PostMapping
	@Operation(summary = "Crea titolare salone (ruolo OWNER) e directory salone (form /piani)")
	public ResponseEntity<RegistrationCreatedResponse> register(@Valid @RequestBody ConsumerRegistrationRequest body) {
		RegistrationSalonLocation salon = withDefaultCountrySalon(body.salonLocationDetails());
		salon = salon.withDisplayName(Objects.toString(body.salonName(), "").trim());
		ConsumerRegistrationValidator.requireSalonLocationForFreePlan(body.planTier(), salon);

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

		SalonPartnerRegistrationOutcome outcome = velvetAccountRegistrationService.registerSalonPartner(
				body, provisionPlan, salon, businessTypes, clientGenders);
		boolean premium = "PREMIUM".equalsIgnoreCase(StudioGroup.canonicalPlanTier(body.planTier()));
		boolean checkoutRequired = billingRegistrationPlanPolicy.billingCheckoutRequiredForPremiumRegistration(body.planTier());
		String message = outcome.emailVerificationRequired()
				? "Abbiamo inviato un'email di conferma. Clicca il link per attivare l'account titolare, poi accedi."
				: premium
						? checkoutRequired
								? "Salone registrato: l'email risulta già verificata. Accedi con le tue credenziali per completare il pagamento Premium su Stripe."
								: "Salone registrato: l'email risulta già verificata. Accedi con le tue credenziali per iniziare con Premium."
						: "Salone registrato: l'email risulta già verificata. Accedi con le tue credenziali.";
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(new RegistrationCreatedResponse(message, outcome.emailVerificationRequired()));
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
				s.displayName());
	}
}
