package it.velvet.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.billing.service.BillingRegistrationPlanPolicy;
import it.velvet.consumer.service.VelvetAccountRegistrationService;
import it.velvet.publicapi.dto.ConsumerRegistrationRequest;
import it.velvet.publicapi.dto.RegistrationSalonLocation;
import it.velvet.publicapi.validation.ConsumerRegistrationValidator;
import it.velvet.studio.domain.SalonBusinessType;
import it.velvet.studio.domain.SalonClientGender;
import it.velvet.studio.service.SalonDirectoryProvisioningService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/consumer-registration")
@Tag(name = "Pubblico — registrazione titolare / salone (piani)")
public class PublicConsumerRegistrationController {

	private final VelvetAccountRegistrationService velvetAccountRegistrationService;
	private final SalonDirectoryProvisioningService salonDirectoryProvisioningService;
	private final BillingRegistrationPlanPolicy billingRegistrationPlanPolicy;

	public PublicConsumerRegistrationController(
			VelvetAccountRegistrationService velvetAccountRegistrationService,
			SalonDirectoryProvisioningService salonDirectoryProvisioningService,
			BillingRegistrationPlanPolicy billingRegistrationPlanPolicy) {
		this.velvetAccountRegistrationService = velvetAccountRegistrationService;
		this.salonDirectoryProvisioningService = salonDirectoryProvisioningService;
		this.billingRegistrationPlanPolicy = billingRegistrationPlanPolicy;
	}

	@PostMapping
	@Operation(summary = "Crea titolare salone (ruolo OWNER) e directory salone (form /piani)")
	public ResponseEntity<Void> register(@Valid @RequestBody ConsumerRegistrationRequest body) {
		RegistrationSalonLocation salon = withDefaultCountrySalon(body.salonLocationDetails());
		salon = salon.withDisplayName(Objects.toString(body.salonName(), "").trim());
		ConsumerRegistrationValidator.requireSalonLocationForFreePlan(body.planTier(), salon);

		List<SalonBusinessType> businessTypes =
				ConsumerRegistrationValidator.normalizeSalonBusinessTypesOrThrow(body.salonBusinessTypes());
		ConsumerRegistrationValidator.requireSalonBusinessTypesForPartnerPlans(body.planTier(), businessTypes);
		List<SalonClientGender> clientGenders =
				ConsumerRegistrationValidator.normalizeSalonClientGendersOrThrow(body.salonClientGenders());
		ConsumerRegistrationValidator.requireSalonClientGendersForPartnerPlans(body.planTier(), clientGenders);

		String requestedPlan = body.planTier();
		String provisionPlan = billingRegistrationPlanPolicy.effectiveProvisionPlanTier(requestedPlan);

		String ownerEmail = body.email().trim().toLowerCase(Locale.ROOT);
		String ownerSub = velvetAccountRegistrationService.registerSalonOwner(
				body.email(),
				body.password(),
				body.firstName(),
				body.lastName(),
				body.phone() != null ? body.phone() : "",
				provisionPlan,
				body.legalDocumentVersion());
		String publicName = Objects.toString(body.salonName(), "").trim();
		salonDirectoryProvisioningService.provisionAfterPartnerRegistration(
				ownerEmail, provisionPlan, publicName, salon, ownerSub, businessTypes, clientGenders);
		return ResponseEntity.status(HttpStatus.CREATED).build();
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
