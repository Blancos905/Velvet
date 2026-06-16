package it.velvet.studio.service;

import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.common.api.BusinessException;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.consumer.domain.ConsumerProfileRepository;
import it.velvet.consumer.service.VelvetAccountRegistrationService;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.dto.MeSalonStaffCreateRequest;
import it.velvet.studio.dto.MeSalonStaffDto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.List;
import java.util.UUID;

@Service
public class MeSalonStaffService {

	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final LocationRepository locationRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final VelvetAccountRegistrationService velvetAccountRegistrationService;
	private final AppointmentRepository appointmentRepository;
	private final ConsumerProfileRepository consumerProfileRepository;

	public MeSalonStaffService(
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			LocationRepository locationRepository,
			StaffOperatorRepository staffOperatorRepository,
			VelvetAccountRegistrationService velvetAccountRegistrationService,
			AppointmentRepository appointmentRepository,
			ConsumerProfileRepository consumerProfileRepository) {
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.locationRepository = locationRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.velvetAccountRegistrationService = velvetAccountRegistrationService;
		this.appointmentRepository = appointmentRepository;
		this.consumerProfileRepository = consumerProfileRepository;
	}

	public List<MeSalonStaffDto> list(VelvetUserPrincipal principal) {
		Location loc = requirePrimaryLocation(principal);
		return staffOperatorRepository.findByLocation_IdOrderByDisplayName(loc.getId()).stream()
				.map(MeSalonStaffDto::from)
				.toList();
	}

	@Transactional
	public MeSalonStaffDto create(VelvetUserPrincipal principal, MeSalonStaffCreateRequest body) {
		Location loc = requirePrimaryLocation(principal);
		String firstName = safe(body.firstName(), 80);
		String lastName = safe(body.lastName(), 80);
		if (firstName.isBlank() || lastName.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Nome e cognome sono obbligatori.");
		}
		String email = safe(body.email(), 320);
		String password = body.password() == null ? "" : body.password();
		if (email.isBlank() || password.isEmpty()) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Email e password sono obbligatorie per creare l’accesso del membro staff.");
		}
		ConsumerProfile account = velvetAccountRegistrationService.registerSalonStaffMember(email, password, firstName, lastName);
		String role = safe(body.role(), 80);
		String photoDataUrl = safe(body.photoDataUrl(), 12_000_000);
		String normalizedRole = role.isBlank() ? "Staff" : role;
		StaffOperator saved = saveWithPhotoFallback(loc, firstName, lastName, normalizedRole, photoDataUrl.isBlank() ? null : photoDataUrl);
		saved.setConsumerProfile(account);
		applyWorkSchedule(saved, body);
		saved = staffOperatorRepository.save(saved);
		return MeSalonStaffDto.from(saved);
	}

	public MeSalonStaffDto update(VelvetUserPrincipal principal, UUID staffId, MeSalonStaffCreateRequest body) {
		Location loc = requirePrimaryLocation(principal);
		StaffOperator operator = staffOperatorRepository.findByIdAndLocation_Id(staffId, loc.getId())
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Membro staff non trovato."));
		String firstName = safe(body.firstName(), 80);
		String lastName = safe(body.lastName(), 80);
		if (firstName.isBlank() || lastName.isBlank()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Nome e cognome sono obbligatori.");
		}
		String role = safe(body.role(), 80);
		String photoDataUrl = safe(body.photoDataUrl(), 12_000_000);
		String normalizedRole = role.isBlank() ? "Staff" : role;
		String normalizedPhoto = photoDataUrl.isBlank() ? null : photoDataUrl;
		operator.updateProfile(firstName, lastName, normalizedRole, normalizedPhoto);
		applyWorkSchedule(operator, body);
		try {
			return MeSalonStaffDto.from(staffOperatorRepository.save(operator));
		} catch (DataIntegrityViolationException ex) {
			// Se il DB ha ancora una colonna foto stretta (deploy non allineato), salvo comunque il profilo senza foto.
			operator.updateProfile(firstName, lastName, normalizedRole, null);
			return MeSalonStaffDto.from(staffOperatorRepository.save(operator));
		}
	}

	@Transactional
	public void delete(VelvetUserPrincipal principal, UUID staffId) {
		Location loc = requirePrimaryLocation(principal);
		StaffOperator operator = staffOperatorRepository.findByIdAndLocation_Id(staffId, loc.getId())
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Membro staff non trovato."));
		if (appointmentRepository.countByOperator_Id(operator.getId()) > 0) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"STAFF_HAS_APPOINTMENTS",
					"Impossibile eliminare: ci sono prenotazioni associate a questo operatore.");
		}
		ConsumerProfile login = operator.getConsumerProfile();
		staffOperatorRepository.delete(operator);
		if (login != null) {
			consumerProfileRepository.delete(login);
		}
	}

	private Location requirePrimaryLocation(VelvetUserPrincipal principal) {
		StudioGroup group = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal)
				.orElseThrow(() -> new BusinessException(
						HttpStatus.NOT_FOUND,
						"SALON_NOT_PROVISIONED",
						"Nessun salone collegato a questo account. Completa la registrazione titolare."));
		List<Location> locs = locationRepository.findByStudioGroup_IdOrderByNameAsc(group.getId());
		if (locs.isEmpty()) {
			throw new BusinessException(
					HttpStatus.CONFLICT,
					"SALON_NO_LOCATION",
					"Organizzazione senza sede: contatta l’assistenza Velvet.");
		}
		return locs.get(0);
	}

	private static String safe(String v, int maxLen) {
		if (v == null) return "";
		String t = v.trim();
		return t.length() > maxLen ? t.substring(0, maxLen) : t;
	}

	private static void applyWorkSchedule(StaffOperator operator, MeSalonStaffCreateRequest body) {
		Integer morningStart = body.workMorningStartMinuteOfDay();
		Integer morningEnd = body.workMorningEndMinuteOfDay();
		Integer afternoonStart = body.workAfternoonStartMinuteOfDay();
		Integer afternoonEnd = body.workAfternoonEndMinuteOfDay();
		boolean any = morningStart != null || morningEnd != null || afternoonStart != null || afternoonEnd != null;
		if (!any) {
			return;
		}
		if (morningStart == null || morningEnd == null || afternoonStart == null || afternoonEnd == null) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Per l'orario operatore servono apertura/chiusura mattina e apertura/chiusura pomeriggio.");
		}
		validateMinuteOfDay(morningStart, "apertura mattina");
		validateMinuteOfDay(morningEnd, "chiusura mattina");
		validateMinuteOfDay(afternoonStart, "apertura pomeriggio");
		validateMinuteOfDay(afternoonEnd, "chiusura pomeriggio");
		if (morningStart >= morningEnd || afternoonStart >= afternoonEnd || morningEnd >= afternoonStart) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Gli orari operatore devono essere: mattina apertura < chiusura < pomeriggio apertura < chiusura.");
		}
		operator.updateWorkSchedule(morningStart, morningEnd, afternoonStart, afternoonEnd);
	}

	private static int validateMinuteOfDay(int minute, String label) {
		if (minute < 0 || minute > 1439) {
			throw new BusinessException(
					HttpStatus.BAD_REQUEST,
					"VALIDATION_ERROR",
					"Orario " + label + " non valido.");
		}
		return minute;
	}

	private StaffOperator saveWithPhotoFallback(
			Location location,
			String firstName,
			String lastName,
			String role,
			String photoDataUrl) {
		try {
			return staffOperatorRepository.save(new StaffOperator(location, firstName, lastName, role, photoDataUrl));
		} catch (DataIntegrityViolationException ex) {
			// Fallback difensivo: evita 500 e completa comunque la creazione.
			return staffOperatorRepository.save(new StaffOperator(location, firstName, lastName, role, null));
		}
	}
}
