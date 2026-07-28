package it.luxury.consumer.service;

import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.billing.service.SalonPremiumEntitlementService;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.catalog.domain.SalonClient;
import it.luxury.catalog.domain.SalonClientRepository;
import it.luxury.catalog.domain.SalonLuxuryChatMessage;
import it.luxury.catalog.domain.SalonLuxuryChatMessageRepository;
import it.luxury.catalog.domain.SalonLuxuryChatReadState;
import it.luxury.catalog.domain.SalonLuxuryChatReadStateRepository;
import it.luxury.catalog.domain.SalonLuxuryChatSender;
import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.service.StudioGroupOwnerResolver;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class SalonLuxuryChatService {

	private static final Instant UNREAD_WATERMARK_START = Instant.EPOCH;

	private final SalonClientRepository salonClientRepository;
	private final SalonLuxuryChatMessageRepository chatMessageRepository;
	private final SalonLuxuryChatReadStateRepository readStateRepository;
	private final ConsumerProfileService consumerProfileService;
	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final LocationRepository locationRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final AppointmentRepository appointmentRepository;
	private final SalonPremiumEntitlementService salonPremiumEntitlementService;
	private final TransactionTemplate readStateInsertTransaction;

	public SalonLuxuryChatService(
			SalonClientRepository salonClientRepository,
			SalonLuxuryChatMessageRepository chatMessageRepository,
			SalonLuxuryChatReadStateRepository readStateRepository,
			ConsumerProfileService consumerProfileService,
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			LocationRepository locationRepository,
			StaffOperatorRepository staffOperatorRepository,
			AppointmentRepository appointmentRepository,
			SalonPremiumEntitlementService salonPremiumEntitlementService,
			PlatformTransactionManager transactionManager) {
		this.salonClientRepository = salonClientRepository;
		this.chatMessageRepository = chatMessageRepository;
		this.readStateRepository = readStateRepository;
		this.consumerProfileService = consumerProfileService;
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.locationRepository = locationRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.appointmentRepository = appointmentRepository;
		this.salonPremiumEntitlementService = salonPremiumEntitlementService;
		TransactionTemplate tx = new TransactionTemplate(transactionManager);
		tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
		this.readStateInsertTransaction = tx;
	}

	@Transactional
	public List<SalonLuxuryChatMessageDto> listMessages(
			LuxuryUserPrincipal principal, UUID salonClientId, UUID requestedStaffOperatorId) {
		SalonClient sc = loadSalonClient(salonClientId);
		UUID threadStaffOperatorId = resolveThreadStaffOperatorId(principal, sc, requestedStaffOperatorId);
		assertReadAccess(principal, sc, threadStaffOperatorId);
		ReadWatermark wm = readWatermarksForThread(salonClientId, threadStaffOperatorId);
		Instant clearedAt = clearedWatermarkForViewer(principal, sc, threadStaffOperatorId);
		List<SalonLuxuryChatMessageDto> out = chatMessageRepository
				.findThreadMessages(salonClientId, threadStaffOperatorId).stream()
				.filter(m -> clearedAt == null || m.getCreatedAt().isAfter(clearedAt))
				.map(m -> SalonLuxuryChatMessageDto.from(m, wm))
				.toList();
		markThreadReadForCurrentViewer(principal, sc, threadStaffOperatorId);
		return out;
	}

	/**
	 * Elimina (svuota) la conversazione <em>solo</em> per il viewer corrente, come le app di messaggistica:
	 * i messaggi precedenti restano visibili all'altra parte e nuovi messaggi ricompaiono normalmente.
	 */
	@Transactional
	public void clearThread(LuxuryUserPrincipal principal, UUID salonClientId, UUID requestedStaffOperatorId) {
		SalonClient sc = loadSalonClient(salonClientId);
		UUID threadStaffOperatorId = resolveThreadStaffOperatorId(principal, sc, requestedStaffOperatorId);
		assertReadAccess(principal, sc, threadStaffOperatorId);
		boolean viewerIsClient = canAccessAsLinkedConsumer(principal, sc)
				&& consumerCanAccessStaffThread(principal, sc, threadStaffOperatorId);
		Instant now = Instant.now();
		SalonLuxuryChatReadState state = findOrCreateReadState(sc, threadStaffOperatorId);
		if (viewerIsClient) {
			state.setClearedAtClient(now);
			state.setLastReadAtClient(now);
		}
		else {
			state.setClearedAtOwner(now);
			state.setLastReadAtOwner(now);
		}
		readStateRepository.save(state);
	}

	@Transactional
	public SalonLuxuryChatMessageDto postMessage(
			LuxuryUserPrincipal principal, UUID salonClientId, UUID requestedStaffOperatorId, String rawBody) {
		String body = rawBody == null ? "" : rawBody.trim();
		if (body.isEmpty()) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Messaggio vuoto.");
		}
		if (body.length() > 4000) {
			throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Messaggio troppo lungo (max 4000 caratteri).");
		}
		SalonClient sc = loadSalonClient(salonClientId);
		UUID threadStaffOperatorId = resolveThreadStaffOperatorId(principal, sc, requestedStaffOperatorId);
		assertReadAccess(principal, sc, threadStaffOperatorId);
		SalonLuxuryChatSender sender = resolveWriteSender(principal, sc, threadStaffOperatorId);
		StaffOperator threadOperator = resolveThreadStaffOperatorEntity(threadStaffOperatorId);
		SalonLuxuryChatMessage row = new SalonLuxuryChatMessage(sc, threadOperator, sender, body);
		SalonLuxuryChatMessage saved = chatMessageRepository.save(row);
		ReadWatermark wm = readWatermarksForThread(salonClientId, threadStaffOperatorId);
		SalonLuxuryChatMessageDto dto = SalonLuxuryChatMessageDto.from(saved, wm);
		markThreadReadForCurrentViewer(principal, sc, threadStaffOperatorId);
		return dto;
	}

	@Transactional(readOnly = true)
	public SalonLuxuryChatUnreadDto unreadTotals(LuxuryUserPrincipal principal) {
		int salonSideUnread = countUnreadSalonSide(principal);
		return new SalonLuxuryChatUnreadDto(countUnreadAsClient(principal), salonSideUnread);
	}

	@Transactional(readOnly = true)
	public List<SalonLuxuryChatInboxSummaryDto> listInboxSummaries(LuxuryUserPrincipal principal, UUID xLocationId) {
		List<ChatThreadRef> threads = resolveChatInboxThreads(principal, xLocationId);
		List<SalonLuxuryChatInboxSummaryDto> out = new ArrayList<>(threads.size());
		for (ChatThreadRef thread : threads) {
			SalonClient sc = thread.salonClient();
			UUID staffOperatorId = thread.staffOperatorId();
			int unread = unreadCountForViewer(principal, sc, staffOperatorId);
			Instant clearedAt = clearedWatermarkForViewer(principal, sc, staffOperatorId);
			List<SalonLuxuryChatMessage> messages = chatMessageRepository.findThreadMessages(sc.getId(), staffOperatorId);
			Instant lastAt = null;
			String lastSender = null;
			String preview = "";
			SalonLuxuryChatMessage lastVisible = null;
			for (int i = messages.size() - 1; i >= 0; i--) {
				SalonLuxuryChatMessage m = messages.get(i);
				if (clearedAt == null || m.getCreatedAt().isAfter(clearedAt)) {
					lastVisible = m;
					break;
				}
			}
			if (lastVisible != null) {
				lastAt = lastVisible.getCreatedAt();
				lastSender = lastVisible.getSender() == SalonLuxuryChatSender.CLIENT ? "CLIENT" : "OWNER";
				preview = truncatePreview(lastVisible.getBody());
			}
			String counterpartyLabel = resolveCounterpartyLabel(principal, sc, staffOperatorId);
			out.add(new SalonLuxuryChatInboxSummaryDto(
					sc.getId(), staffOperatorId, counterpartyLabel, unread, preview, lastAt, lastSender));
		}
		out.sort(Comparator.comparing(SalonLuxuryChatInboxSummaryDto::lastMessageAt, Comparator.nullsFirst(Comparator.naturalOrder()))
				.reversed());
		return out;
	}

	private List<ChatThreadRef> resolveChatInboxThreads(LuxuryUserPrincipal principal, UUID xLocationId) {
		if (principal.hasAppRole("OWNER")) {
			return resolveChatInboxSalonClients(principal, xLocationId).stream()
					.map(sc -> new ChatThreadRef(sc, null))
					.toList();
		}
		if (principal.hasAppRole("STAFF")) {
			return resolveStaffOperator(principal)
					.map(op -> listBookedSalonClientsForStaffOperator(op, xLocationId).stream()
							.map(sc -> new ChatThreadRef(sc, op.getId()))
							.toList())
					.orElseGet(List::of);
		}
		ConsumerProfile me = consumerProfileService.requireActiveProfile(principal);
		List<SalonClient> memberships = salonClientRepository.findByConsumerProfile_IdOrderByCreatedAtDesc(me.getId());
		List<ChatThreadRef> out = new ArrayList<>();
		for (SalonClient sc : memberships) {
			out.add(new ChatThreadRef(sc, null));
			for (UUID staffOperatorId : consumerStaffThreadOperatorIds(sc)) {
				if (consumerCanAccessStaffThread(principal, sc, staffOperatorId)) {
					out.add(new ChatThreadRef(sc, staffOperatorId));
				}
			}
		}
		return out;
	}

	private List<SalonClient> resolveChatInboxSalonClients(LuxuryUserPrincipal principal, UUID xLocationId) {
		if (principal.hasAppRole("OWNER")) {
			var groupOpt = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
			if (groupOpt.isEmpty()) {
				return List.of();
			}
			if (!salonPremiumEntitlementService.hasActivePremium(groupOpt.get())) {
				return List.of();
			}
			List<Location> locs = locationRepository.findByStudioGroup_IdOrderByNameAsc(groupOpt.get().getId());
			if (locs.isEmpty()) {
				return List.of();
			}
			UUID locId = resolveOwnerInboxLocationId(locs, xLocationId);
			return salonClientRepository.findByLocation_IdOrderByDisplayName(locId);
		}
		if (principal.hasAppRole("STAFF")) {
			return resolveStaffOperator(principal)
					.map(op -> listBookedSalonClientsForStaffOperator(op, xLocationId))
					.orElseGet(List::of);
		}
		ConsumerProfile me = consumerProfileService.requireActiveProfile(principal);
		return salonClientRepository.findByConsumerProfile_IdOrderByCreatedAtDesc(me.getId());
	}

	private static UUID resolveOwnerInboxLocationId(List<Location> locs, UUID xLocationId) {
		if (xLocationId != null && locs.stream().anyMatch(l -> l.getId().equals(xLocationId))) {
			return xLocationId;
		}
		return locs.get(0).getId();
	}

	private int unreadCountForViewer(LuxuryUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
		if (canAccessAsLinkedConsumer(principal, sc) && consumerCanAccessStaffThread(principal, sc, threadStaffOperatorId)) {
			Instant watermark = readStateRepository.findThreadReadState(sc.getId(), threadStaffOperatorId)
					.map(SalonLuxuryChatReadState::getLastReadAtClient)
					.orElse(UNREAD_WATERMARK_START);
			return (int) chatMessageRepository.countThreadMessagesBySenderAfter(
					sc.getId(), threadStaffOperatorId, SalonLuxuryChatSender.OWNER, watermark);
		}
		if (principal.hasAppRole("OWNER") && ownerPremiumMatchesLocation(principal, sc.getLocation().getId())
				&& threadStaffOperatorId == null) {
			Instant watermark = readStateRepository.findThreadReadState(sc.getId(), null)
					.map(SalonLuxuryChatReadState::getLastReadAtOwner)
					.orElse(UNREAD_WATERMARK_START);
			return (int) chatMessageRepository.countThreadMessagesBySenderAfter(
					sc.getId(), null, SalonLuxuryChatSender.CLIENT, watermark);
		}
		if (staffCanAccessSalonClientConversation(principal, sc, threadStaffOperatorId)) {
			Instant watermark = readStateRepository.findThreadReadState(sc.getId(), threadStaffOperatorId)
					.map(SalonLuxuryChatReadState::getLastReadAtOwner)
					.orElse(UNREAD_WATERMARK_START);
			return (int) chatMessageRepository.countThreadMessagesBySenderAfter(
					sc.getId(), threadStaffOperatorId, SalonLuxuryChatSender.CLIENT, watermark);
		}
		return 0;
	}

	private static String truncatePreview(String body) {
		if (body == null || body.isBlank()) {
			return "";
		}
		String oneLine = body.replaceAll("\\s+", " ").trim();
		int max = 160;
		if (oneLine.length() <= max) {
			return oneLine;
		}
		return oneLine.substring(0, max - 1) + "…";
	}

	private int countUnreadSalonSide(LuxuryUserPrincipal principal) {
		if (principal.hasAppRole("OWNER")) {
			return countUnreadAsOwner(principal);
		}
		if (principal.hasAppRole("STAFF")) {
			return countUnreadAsStaffSalon(principal);
		}
		return 0;
	}

	private int countUnreadAsClient(LuxuryUserPrincipal principal) {
		if (principal.hasAppRole("STAFF") && !principal.hasAppRole("CLIENT") && !principal.hasAppRole("OWNER")) {
			return 0;
		}
		ConsumerProfile me = consumerProfileService.requireActiveProfile(principal);
		List<SalonClient> rows = salonClientRepository.findByConsumerProfile_IdOrderByCreatedAtDesc(me.getId());
		int sum = 0;
		for (SalonClient sc : rows) {
			Set<UUID> staffThreadIds = new LinkedHashSet<>();
			staffThreadIds.add(null);
			staffThreadIds.addAll(consumerStaffThreadOperatorIds(sc));
			for (UUID staffOperatorId : staffThreadIds) {
				if (!consumerCanAccessStaffThread(principal, sc, staffOperatorId)) {
					continue;
				}
				Instant watermark = readStateRepository.findThreadReadState(sc.getId(), staffOperatorId)
						.map(SalonLuxuryChatReadState::getLastReadAtClient)
						.orElse(UNREAD_WATERMARK_START);
				sum += chatMessageRepository.countThreadMessagesBySenderAfter(
						sc.getId(), staffOperatorId, SalonLuxuryChatSender.OWNER, watermark);
			}
		}
		return sum;
	}

	private int countUnreadAsOwner(LuxuryUserPrincipal principal) {
		if (!principal.hasAppRole("OWNER")) {
			return 0;
		}
		var groupOpt = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		if (groupOpt.isEmpty()) {
			return 0;
		}
		StudioGroup group = groupOpt.get();
		if (!salonPremiumEntitlementService.hasActivePremium(group)) {
			return 0;
		}
		List<Location> locs = locationRepository.findByStudioGroup_IdOrderByNameAsc(group.getId());
		if (locs.isEmpty()) {
			return 0;
		}
		UUID locId = locs.get(0).getId();
		List<SalonClient> clients = salonClientRepository.findByLocation_IdOrderByDisplayName(locId);
		int sum = 0;
		for (SalonClient sc : clients) {
			Instant watermark = readStateRepository.findThreadReadState(sc.getId(), null)
					.map(SalonLuxuryChatReadState::getLastReadAtOwner)
					.orElse(UNREAD_WATERMARK_START);
			sum += chatMessageRepository.countThreadMessagesBySenderAfter(
					sc.getId(), null, SalonLuxuryChatSender.CLIENT, watermark);
		}
		return sum;
	}

	private int countUnreadAsStaffSalon(LuxuryUserPrincipal principal) {
		return resolveStaffOperator(principal)
				.map(op -> {
					Location loc = op.getLocation();
					StudioGroup group = loc.getStudioGroup();
					if (!salonPremiumEntitlementService.hasActivePremium(group)) {
						return 0;
					}
					List<SalonClient> clients = listBookedSalonClientsForStaffOperator(op, null);
					int sum = 0;
					for (SalonClient sc : clients) {
						Instant watermark = readStateRepository.findThreadReadState(sc.getId(), op.getId())
								.map(SalonLuxuryChatReadState::getLastReadAtOwner)
								.orElse(UNREAD_WATERMARK_START);
						sum += chatMessageRepository.countThreadMessagesBySenderAfter(
								sc.getId(), op.getId(), SalonLuxuryChatSender.CLIENT, watermark);
					}
					return sum;
				})
				.orElse(0);
	}

	private void markThreadReadForCurrentViewer(LuxuryUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
		Instant now = Instant.now();
		boolean markClient = canAccessAsLinkedConsumer(principal, sc)
				&& consumerCanAccessStaffThread(principal, sc, threadStaffOperatorId);
		boolean markOwnerAsSalonOwner = principal.hasAppRole("OWNER")
				&& ownerPremiumMatchesLocation(principal, sc.getLocation().getId())
				&& threadStaffOperatorId == null;
		boolean markOwnerAsStaff = staffCanAccessSalonClientConversation(principal, sc, threadStaffOperatorId);
		if (!markClient && !markOwnerAsSalonOwner && !markOwnerAsStaff) {
			return;
		}
		SalonLuxuryChatReadState state = findOrCreateReadState(sc, threadStaffOperatorId);
		if (markClient) {
			state.setLastReadAtClient(now);
		}
		else {
			state.setLastReadAtOwner(now);
		}
		readStateRepository.save(state);
	}

	private SalonLuxuryChatReadState findOrCreateReadState(SalonClient sc, UUID threadStaffOperatorId) {
		Optional<SalonLuxuryChatReadState> existing =
				readStateRepository.findThreadReadState(sc.getId(), threadStaffOperatorId);
		if (existing.isPresent()) {
			return existing.get();
		}
		return readStateInsertTransaction.execute(status -> {
			Optional<SalonLuxuryChatReadState> again =
					readStateRepository.findThreadReadState(sc.getId(), threadStaffOperatorId);
			if (again.isPresent()) {
				return again.get();
			}
			try {
				SalonLuxuryChatReadState created = new SalonLuxuryChatReadState(
						sc, resolveThreadStaffOperatorEntity(threadStaffOperatorId));
				return readStateRepository.saveAndFlush(created);
			}
			catch (DataIntegrityViolationException ex) {
				return readStateRepository.findThreadReadState(sc.getId(), threadStaffOperatorId)
						.orElseThrow(() -> ex);
			}
		});
	}

	private SalonClient loadSalonClient(UUID salonClientId) {
		return salonClientRepository.findById(salonClientId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Conversazione non trovata."));
	}

	private void assertReadAccess(LuxuryUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
		if (canAccessAsLinkedConsumer(principal, sc) && consumerCanAccessStaffThread(principal, sc, threadStaffOperatorId)) {
			return;
		}
		if (principal.hasAppRole("OWNER") && ownerPremiumMatchesLocation(principal, sc.getLocation().getId())
				&& threadStaffOperatorId == null) {
			return;
		}
		if (staffCanAccessSalonClientConversation(principal, sc, threadStaffOperatorId)) {
			return;
		}
		throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Accesso negato alla conversazione.");
	}

	private SalonLuxuryChatSender resolveWriteSender(
			LuxuryUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
		if (canAccessAsLinkedConsumer(principal, sc) && consumerCanAccessStaffThread(principal, sc, threadStaffOperatorId)) {
			return SalonLuxuryChatSender.CLIENT;
		}
		if (principal.hasAppRole("OWNER") && ownerPremiumMatchesLocation(principal, sc.getLocation().getId())
				&& threadStaffOperatorId == null) {
			return SalonLuxuryChatSender.OWNER;
		}
		if (staffCanAccessSalonClientConversation(principal, sc, threadStaffOperatorId)) {
			return SalonLuxuryChatSender.OWNER;
		}
		throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Non puoi inviare messaggi in questa conversazione.");
	}

	/**
	 * Thread effettivo per il viewer: titolare → sempre titolare ({@code null}); staff → il proprio operatore;
	 * cliente → parametro esplicito (default titolare).
	 */
	private UUID resolveThreadStaffOperatorId(
			LuxuryUserPrincipal principal, SalonClient sc, UUID requestedStaffOperatorId) {
		if (principal.hasAppRole("OWNER") && ownerPremiumMatchesLocation(principal, sc.getLocation().getId())) {
			if (requestedStaffOperatorId != null) {
				throw new BusinessException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Il titolare usa solo la chat del salone.");
			}
			return null;
		}
		if (principal.hasAppRole("STAFF")) {
			StaffOperator op = resolveStaffOperator(principal)
					.orElseThrow(() -> new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Operatore non collegato."));
			if (requestedStaffOperatorId != null && !requestedStaffOperatorId.equals(op.getId())) {
				throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Accesso negato alla conversazione.");
			}
			return op.getId();
		}
		if (canAccessAsLinkedConsumer(principal, sc)) {
			if (requestedStaffOperatorId == null) {
				return null;
			}
			if (!consumerCanAccessStaffThread(principal, sc, requestedStaffOperatorId)) {
				throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Accesso negato alla conversazione.");
			}
			return requestedStaffOperatorId;
		}
		throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Accesso negato alla conversazione.");
	}

	private Set<UUID> consumerStaffThreadOperatorIds(SalonClient sc) {
		Set<UUID> operatorIds = new LinkedHashSet<>();
		operatorIds.addAll(appointmentRepository.findDistinctOperatorIdsByLocationIdAndSalonClientId(
				sc.getLocation().getId(), sc.getId()));
		operatorIds.addAll(chatMessageRepository.findDistinctStaffOperatorIdsWithMessages(sc.getId()));
		return operatorIds;
	}

	private boolean consumerCanAccessStaffThread(LuxuryUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
		if (!canAccessAsLinkedConsumer(principal, sc)) {
			return false;
		}
		if (threadStaffOperatorId == null) {
			return true;
		}
		if (appointmentRepository.existsByLocation_IdAndOperator_IdAndSalonClient_Id(
				sc.getLocation().getId(), threadStaffOperatorId, sc.getId())) {
			return true;
		}
		return !chatMessageRepository.findThreadMessages(sc.getId(), threadStaffOperatorId).isEmpty();
	}

	private boolean canAccessAsLinkedConsumer(LuxuryUserPrincipal principal, SalonClient sc) {
		ConsumerProfile me = consumerProfileService.requireActiveProfile(principal);
		return sc.getConsumerProfile() != null && sc.getConsumerProfile().getId().equals(me.getId());
	}

	private boolean ownerPremiumMatchesLocation(LuxuryUserPrincipal principal, UUID locationId) {
		StudioGroup group = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal).orElse(null);
		if (group == null) {
			return false;
		}
		if (!salonPremiumEntitlementService.hasActivePremium(group)) {
			return false;
		}
		Location loc = locationRepository.findById(locationId).orElse(null);
		return loc != null && loc.getStudioGroup().getId().equals(group.getId());
	}

	private List<SalonClient> listBookedSalonClientsForStaffOperator(StaffOperator op, UUID xLocationId) {
		Location loc = op.getLocation();
		if (!salonPremiumEntitlementService.hasActivePremium(loc.getStudioGroup())) {
			return List.of();
		}
		if (xLocationId != null && !xLocationId.equals(loc.getId())) {
			return List.of();
		}
		List<UUID> ids = appointmentRepository.findDistinctSalonClientIdsByLocationIdAndOperatorId(loc.getId(), op.getId());
		if (ids.isEmpty()) {
			return List.of();
		}
		return salonClientRepository.findByLocation_IdAndIdInOrderByDisplayName(loc.getId(), ids);
	}

	private boolean staffCanAccessSalonClientConversation(
			LuxuryUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
		if (!principal.hasAppRole("STAFF") || threadStaffOperatorId == null) {
			return false;
		}
		return resolveStaffOperator(principal)
				.map(op -> {
					if (!op.getId().equals(threadStaffOperatorId)) {
						return false;
					}
					Location opLoc = op.getLocation();
					if (!opLoc.getId().equals(sc.getLocation().getId())) {
						return false;
					}
					if (!salonPremiumEntitlementService.hasActivePremium(opLoc.getStudioGroup())) {
						return false;
					}
					return appointmentRepository.existsByLocation_IdAndOperator_IdAndSalonClient_Id(
							opLoc.getId(), op.getId(), sc.getId());
				})
				.orElse(false);
	}

	private Optional<StaffOperator> resolveStaffOperator(LuxuryUserPrincipal principal) {
		UUID profileId = principal.getProfileId();
		String sub = principal.getSubject();
		if (profileId == null && (sub == null || sub.isBlank())) {
			return Optional.empty();
		}
		return staffOperatorRepository.resolveLinkedOperatorId(profileId, sub != null ? sub : "");
	}

	private StaffOperator resolveThreadStaffOperatorEntity(UUID threadStaffOperatorId) {
		if (threadStaffOperatorId == null) {
			return null;
		}
		return staffOperatorRepository.findById(threadStaffOperatorId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Operatore non trovato."));
	}

	private String resolveCounterpartyLabel(LuxuryUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
		if (principal.hasAppRole("OWNER") || principal.hasAppRole("STAFF")) {
			return sc.getDisplayName();
		}
		if (threadStaffOperatorId == null) {
			Location loc = sc.getLocation();
			return firstNonBlank(loc.getName(), loc.getSlug(), "Salone");
		}
		return staffOperatorRepository.findById(threadStaffOperatorId)
				.map(StaffOperator::getDisplayName)
				.orElse("Operatore");
	}

	private static String firstNonBlank(String... parts) {
		if (parts == null) {
			return "Salone";
		}
		for (String p : parts) {
			if (p != null && !p.isBlank()) {
				return p.trim();
			}
		}
		return "Salone";
	}

	private ReadWatermark readWatermarksForThread(UUID salonClientId, UUID threadStaffOperatorId) {
		return readStateRepository
				.findThreadReadState(salonClientId, threadStaffOperatorId)
				.map(rs -> new ReadWatermark(rs.getLastReadAtClient(), rs.getLastReadAtOwner()))
				.orElse(ReadWatermark.EMPTY);
	}

	/** Istante oltre il quale il viewer ha eliminato la chat ({@code null} = nessuna cancellazione). */
	private Instant clearedWatermarkForViewer(LuxuryUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
		Optional<SalonLuxuryChatReadState> state = readStateRepository.findThreadReadState(sc.getId(), threadStaffOperatorId);
		if (state.isEmpty()) {
			return null;
		}
		boolean viewerIsClient = canAccessAsLinkedConsumer(principal, sc)
				&& consumerCanAccessStaffThread(principal, sc, threadStaffOperatorId);
		return viewerIsClient ? state.get().getClearedAtClient() : state.get().getClearedAtOwner();
	}

	private record ChatThreadRef(SalonClient salonClient, UUID staffOperatorId) {
	}

	private record ReadWatermark(Instant lastReadAtClient, Instant lastReadAtOwner) {
		static final ReadWatermark EMPTY = new ReadWatermark(null, null);
	}

	public record SalonLuxuryChatMessageDto(UUID id, String sender, String body, Instant createdAt, boolean readByRecipient) {
		static SalonLuxuryChatMessageDto from(SalonLuxuryChatMessage m, ReadWatermark wm) {
			boolean readByRecipient = recipientHasReadUpTo(m, wm);
			return new SalonLuxuryChatMessageDto(
					m.getId(),
					m.getSender() == SalonLuxuryChatSender.CLIENT ? "CLIENT" : "OWNER",
					m.getBody(),
					m.getCreatedAt(),
					readByRecipient);
		}

		private static boolean recipientHasReadUpTo(SalonLuxuryChatMessage m, ReadWatermark wm) {
			Instant sentAt = m.getCreatedAt();
			if (m.getSender() == SalonLuxuryChatSender.CLIENT) {
				Instant ownerRead = wm.lastReadAtOwner();
				return ownerRead != null && !ownerRead.isBefore(sentAt);
			}
			Instant clientRead = wm.lastReadAtClient();
			return clientRead != null && !clientRead.isBefore(sentAt);
		}
	}

	public record SalonLuxuryChatUnreadDto(int clientUnread, int ownerUnread) {
	}

	public record SalonLuxuryChatInboxSummaryDto(
			UUID salonClientId,
			UUID staffOperatorId,
			String counterpartyLabel,
			int unreadCount,
			String lastPreview,
			Instant lastMessageAt,
			String lastSender) {
	}
}
