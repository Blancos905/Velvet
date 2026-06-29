package it.velvet.studio.service;

import it.velvet.billing.service.SalonPremiumEntitlementService;
import it.velvet.common.api.BusinessException;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.domain.StudioGroupRepository;
import it.velvet.studio.dto.StatisticsPinChangeRequest;
import it.velvet.studio.dto.StatisticsPinVerifyRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MeSalonStatisticsPinService {

	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final StudioGroupRepository studioGroupRepository;
	private final PasswordEncoder passwordEncoder;
	private final SalonPremiumEntitlementService salonPremiumEntitlementService;

	public MeSalonStatisticsPinService(
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			StudioGroupRepository studioGroupRepository,
			PasswordEncoder passwordEncoder,
			SalonPremiumEntitlementService salonPremiumEntitlementService) {
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.studioGroupRepository = studioGroupRepository;
		this.passwordEncoder = passwordEncoder;
		this.salonPremiumEntitlementService = salonPremiumEntitlementService;
	}

	public void verify(VelvetUserPrincipal principal, StatisticsPinVerifyRequest body) {
		StudioGroup group = requirePremiumWithPin(principal);
		if (!passwordEncoder.matches(body.pin(), group.getStatisticsPinHash())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PIN", "PIN non valido.");
		}
	}

	@Transactional
	public void change(VelvetUserPrincipal principal, StatisticsPinChangeRequest body) {
		if (body == null) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Dati PIN mancanti.");
		}
		if (!body.newPin().equals(body.confirmNewPin())) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Conferma PIN non coerente.");
		}
		StudioGroup group = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));
		if (!salonPremiumEntitlementService.hasActivePremium(group)) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"PLAN_NOT_ELIGIBLE",
					"Il PIN statistiche è disponibile solo con piano Premium.");
		}
		String existingHash = group.getStatisticsPinHash();
		if (existingHash != null && !existingHash.isBlank()) {
			if (body.currentPin() == null || body.currentPin().isBlank()) {
				throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "PIN attuale obbligatorio.");
			}
			if (!passwordEncoder.matches(body.currentPin(), existingHash)) {
				throw new BusinessException(HttpStatus.BAD_REQUEST, "INVALID_PIN", "PIN attuale non valido.");
			}
		}
		group.setStatisticsPinHash(passwordEncoder.encode(body.newPin()));
		studioGroupRepository.save(group);
	}

	private StudioGroup requirePremiumWithPin(VelvetUserPrincipal principal) {
		StudioGroup group = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Salone non trovato."));
		if (!salonPremiumEntitlementService.hasActivePremium(group)) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "PLAN_NOT_ELIGIBLE", "Piano non idoneo al PIN statistiche.");
		}
		if (group.getStatisticsPinHash() == null || group.getStatisticsPinHash().isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "PIN_NOT_CONFIGURED", "PIN statistiche non configurato.");
		}
		return group;
	}
}
