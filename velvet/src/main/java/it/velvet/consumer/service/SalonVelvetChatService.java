package it.velvet.consumer.service;

import it.velvet.appointment.domain.AppointmentRepository;
import it.velvet.catalog.domain.StaffOperator;
import it.velvet.catalog.domain.StaffOperatorRepository;
import it.velvet.catalog.domain.SalonClient;
import it.velvet.catalog.domain.SalonClientRepository;
import it.velvet.catalog.domain.SalonVelvetChatMessage;
import it.velvet.catalog.domain.SalonVelvetChatMessageRepository;
import it.velvet.catalog.domain.SalonVelvetChatReadState;
import it.velvet.catalog.domain.SalonVelvetChatReadStateRepository;
import it.velvet.catalog.domain.SalonVelvetChatSender;
import it.velvet.common.api.BusinessException;
import it.velvet.consumer.domain.ConsumerProfile;
import it.velvet.security.auth.VelvetUserPrincipal;
import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.StudioGroup;
import it.velvet.studio.service.StudioGroupOwnerResolver;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class SalonVelvetChatService {

	private static final Instant UNREAD_WATERMARK_START = Instant.EPOCH;

	private final SalonClientRepository salonClientRepository;
	private final SalonVelvetChatMessageRepository chatMessageRepository;
	private final SalonVelvetChatReadStateRepository readStateRepository;
	private final ConsumerProfileService consumerProfileService;
	private final StudioGroupOwnerResolver studioGroupOwnerResolver;
	private final LocationRepository locationRepository;
	private final StaffOperatorRepository staffOperatorRepository;
	private final AppointmentRepository appointmentRepository;

	public SalonVelvetChatService(
			SalonClientRepository salonClientRepository,
			SalonVelvetChatMessageRepository chatMessageRepository,
			SalonVelvetChatReadStateRepository readStateRepository,
			ConsumerProfileService consumerProfileService,
			StudioGroupOwnerResolver studioGroupOwnerResolver,
			LocationRepository locationRepository,
			StaffOperatorRepository staffOperatorRepository,
			AppointmentRepository appointmentRepository) {
		this.salonClientRepository = salonClientRepository;
		this.chatMessageRepository = chatMessageRepository;
		this.readStateRepository = readStateRepository;
		this.consumerProfileService = consumerProfileService;
		this.studioGroupOwnerResolver = studioGroupOwnerResolver;
		this.locationRepository = locationRepository;
		this.staffOperatorRepository = staffOperatorRepository;
		this.appointmentRepository = appointmentRepository;
	}

	@Transactional
	public List<SalonVelvetChatMessageDto> listMessages(
			VelvetUserPrincipal principal, UUID salonClientId, UUID requestedStaffOperatorId) {
		SalonClient sc = loadSalonClient(salonClientId);
		UUID threadStaffOperatorId = resolveThreadStaffOperatorId(principal, sc, requestedStaffOperatorId);
		assertReadAccess(principal, sc, threadStaffOperatorId);
		ReadWatermark wm = readWatermarksForThread(salonClientId, threadStaffOperatorId);
		List<SalonVelvetChatMessageDto> out = chatMessageRepository
				.findThreadMessages(salonClientId, threadStaffOperatorId).stream()
				.map(m -> SalonVelvetChatMessageDto.from(m, wm))
				.toList();
		markThreadReadForCurrentViewer(principal, sc, threadStaffOperatorId);
		return out;
	}

	@Transactional
	public SalonVelvetChatMessageDto postMessage(
			VelvetUserPrincipal principal, UUID salonClientId, UUID requestedStaffOperatorId, String rawBody) {
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
		SalonVelvetChatSender sender = resolveWriteSender(principal, sc, threadStaffOperatorId);
		StaffOperator threadOperator = resolveThreadStaffOperatorEntity(threadStaffOperatorId);
		SalonVelvetChatMessage row = new SalonVelvetChatMessage(sc, threadOperator, sender, body);
		SalonVelvetChatMessage saved = chatMessageRepository.save(row);
		ReadWatermark wm = readWatermarksForThread(salonClientId, threadStaffOperatorId);
		SalonVelvetChatMessageDto dto = SalonVelvetChatMessageDto.from(saved, wm);
		markThreadReadForCurrentViewer(principal, sc, threadStaffOperatorId);
		return dto;
	}

	@Transactional(readOnly = true)
	public SalonVelvetChatUnreadDto unreadTotals(VelvetUserPrincipal principal) {
		int salonSideUnread = countUnreadSalonSide(principal);
		return new SalonVelvetChatUnreadDto(countUnreadAsClient(principal), salonSideUnread);
	}

	@Transactional(readOnly = true)
	public List<SalonVelvetChatInboxSummaryDto> listInboxSummaries(VelvetUserPrincipal principal, UUID xLocationId) {
		List<ChatThreadRef> threads = resolveChatInboxThreads(principal, xLocationId);
		List<SalonVelvetChatInboxSummaryDto> out = new ArrayList<>(threads.size());
		for (ChatThreadRef thread : threads) {
			SalonClient sc = thread.salonClient();
			UUID staffOperatorId = thread.staffOperatorId();
			int unread = unreadCountForViewer(principal, sc, staffOperatorId);
			List<SalonVelvetChatMessage> messages = chatMessageRepository.findThreadMessages(sc.getId(), staffOperatorId);
			Instant lastAt = null;
			String lastSender = null;
			String preview = "";
			if (!messages.isEmpty()) {
				SalonVelvetChatMessage m = messages.get(messages.size() - 1);
				lastAt = m.getCreatedAt();
				lastSender = m.getSender() == SalonVelvetChatSender.CLIENT ? "CLIENT" : "OWNER";
				preview = truncatePreview(m.getBody());
			}
			String counterpartyLabel = resolveCounterpartyLabel(principal, sc, staffOperatorId);
			out.add(new SalonVelvetChatInboxSummaryDto(
					sc.getId(), staffOperatorId, counterpartyLabel, unread, preview, lastAt, lastSender));
		}
		out.sort(Comparator.comparing(SalonVelvetChatInboxSummaryDto::lastMessageAt, Comparator.nullsFirst(Comparator.naturalOrder()))
				.reversed());
		return out;
	}

	private List<ChatThreadRef> resolveChatInboxThreads(VelvetUserPrincipal principal, UUID xLocationId) {
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
			for (UUID staffOperatorId : chatMessageRepository.findDistinctStaffOperatorIdsWithMessages(sc.getId())) {
				if (consumerCanAccessStaffThread(principal, sc, staffOperatorId)) {
					out.add(new ChatThreadRef(sc, staffOperatorId));
				}
			}
		}
		return out;
	}

	private List<SalonClient> resolveChatInboxSalonClients(VelvetUserPrincipal principal, UUID xLocationId) {
		if (principal.hasAppRole("OWNER")) {
			var groupOpt = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
			if (groupOpt.isEmpty()) {
				return List.of();
			}
			if (!"PREMIUM".equals(StudioGroup.canonicalPlanTier(groupOpt.get().getPlanTier()))) {
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

	private int unreadCountForViewer(VelvetUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
		if (canAccessAsLinkedConsumer(principal, sc) && consumerCanAccessStaffThread(principal, sc, threadStaffOperatorId)) {
			Instant watermark = readStateRepository.findThreadReadState(sc.getId(), threadStaffOperatorId)
					.map(SalonVelvetChatReadState::getLastReadAtClient)
					.orElse(UNREAD_WATERMARK_START);
			return (int) chatMessageRepository.countThreadMessagesBySenderAfter(
					sc.getId(), threadStaffOperatorId, SalonVelvetChatSender.OWNER, watermark);
		}
		if (principal.hasAppRole("OWNER") && ownerPremiumMatchesLocation(principal, sc.getLocation().getId())
				&& threadStaffOperatorId == null) {
			Instant watermark = readStateRepository.findThreadReadState(sc.getId(), null)
					.map(SalonVelvetChatReadState::getLastReadAtOwner)
					.orElse(UNREAD_WATERMARK_START);
			return (int) chatMessageRepository.countThreadMessagesBySenderAfter(
					sc.getId(), null, SalonVelvetChatSender.CLIENT, watermark);
		}
		if (staffCanAccessSalonClientConversation(principal, sc, threadStaffOperatorId)) {
			Instant watermark = readStateRepository.findThreadReadState(sc.getId(), threadStaffOperatorId)
					.map(SalonVelvetChatReadState::getLastReadAtOwner)
					.orElse(UNREAD_WATERMARK_START);
			return (int) chatMessageRepository.countThreadMessagesBySenderAfter(
					sc.getId(), threadStaffOperatorId, SalonVelvetChatSender.CLIENT, watermark);
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

	private int countUnreadSalonSide(VelvetUserPrincipal principal) {
		if (principal.hasAppRole("OWNER")) {
			return countUnreadAsOwner(principal);
		}
		if (principal.hasAppRole("STAFF")) {
			return countUnreadAsStaffSalon(principal);
		}
		return 0;
	}

	private int countUnreadAsClient(VelvetUserPrincipal principal) {
		if (principal.hasAppRole("STAFF") && !principal.hasAppRole("CLIENT") && !principal.hasAppRole("OWNER")) {
			return 0;
		}
		ConsumerProfile me = consumerProfileService.requireActiveProfile(principal);
		List<SalonClient> rows = salonClientRepository.findByConsumerProfile_IdOrderByCreatedAtDesc(me.getId());
		int sum = 0;
		for (SalonClient sc : rows) {
			Set<UUID> staffThreadIds = new LinkedHashSet<>();
			staffThreadIds.add(null);
			staffThreadIds.addAll(chatMessageRepository.findDistinctStaffOperatorIdsWithMessages(sc.getId()));
			for (UUID staffOperatorId : staffThreadIds) {
				if (!consumerCanAccessStaffThread(principal, sc, staffOperatorId)) {
					continue;
				}
				Instant watermark = readStateRepository.findThreadReadState(sc.getId(), staffOperatorId)
						.map(SalonVelvetChatReadState::getLastReadAtClient)
						.orElse(UNREAD_WATERMARK_START);
				sum += chatMessageRepository.countThreadMessagesBySenderAfter(
						sc.getId(), staffOperatorId, SalonVelvetChatSender.OWNER, watermark);
			}
		}
		return sum;
	}

	private int countUnreadAsOwner(VelvetUserPrincipal principal) {
		if (!principal.hasAppRole("OWNER")) {
			return 0;
		}
		var groupOpt = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal);
		if (groupOpt.isEmpty()) {
			return 0;
		}
		StudioGroup group = groupOpt.get();
		if (!"PREMIUM".equals(StudioGroup.canonicalPlanTier(group.getPlanTier()))) {
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
					.map(SalonVelvetChatReadState::getLastReadAtOwner)
					.orElse(UNREAD_WATERMARK_START);
			sum += chatMessageRepository.countThreadMessagesBySenderAfter(
					sc.getId(), null, SalonVelvetChatSender.CLIENT, watermark);
		}
		return sum;
	}

	private int countUnreadAsStaffSalon(VelvetUserPrincipal principal) {
		return resolveStaffOperator(principal)
				.map(op -> {
					Location loc = op.getLocation();
					StudioGroup group = loc.getStudioGroup();
					if (!"PREMIUM".equals(StudioGroup.canonicalPlanTier(group.getPlanTier()))) {
						return 0;
					}
					List<SalonClient> clients = listBookedSalonClientsForStaffOperator(op, null);
					int sum = 0;
					for (SalonClient sc : clients) {
						Instant watermark = readStateRepository.findThreadReadState(sc.getId(), op.getId())
								.map(SalonVelvetChatReadState::getLastReadAtOwner)
								.orElse(UNREAD_WATERMARK_START);
						sum += chatMessageRepository.countThreadMessagesBySenderAfter(
								sc.getId(), op.getId(), SalonVelvetChatSender.CLIENT, watermark);
					}
					return sum;
				})
				.orElse(0);
	}

	private void markThreadReadForCurrentViewer(VelvetUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
		Instant now = Instant.now();
		SalonVelvetChatReadState state = readStateRepository.findThreadReadState(sc.getId(), threadStaffOperatorId)
				.orElseGet(() -> new SalonVelvetChatReadState(sc, resolveThreadStaffOperatorEntity(threadStaffOperatorId)));
		if (canAccessAsLinkedConsumer(principal, sc) && consumerCanAccessStaffThread(principal, sc, threadStaffOperatorId)) {
			state.setLastReadAtClient(now);
		}
		else if (principal.hasAppRole("OWNER") && ownerPremiumMatchesLocation(principal, sc.getLocation().getId())
				&& threadStaffOperatorId == null) {
			state.setLastReadAtOwner(now);
		}
		else if (staffCanAccessSalonClientConversation(principal, sc, threadStaffOperatorId)) {
			state.setLastReadAtOwner(now);
		}
		else {
			return;
		}
		readStateRepository.save(state);
	}

	private SalonClient loadSalonClient(UUID salonClientId) {
		return salonClientRepository.findById(salonClientId)
				.orElseThrow(() -> new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Conversazione non trovata."));
	}

	private void assertReadAccess(VelvetUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
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

	private SalonVelvetChatSender resolveWriteSender(
			VelvetUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
		if (canAccessAsLinkedConsumer(principal, sc) && consumerCanAccessStaffThread(principal, sc, threadStaffOperatorId)) {
			return SalonVelvetChatSender.CLIENT;
		}
		if (principal.hasAppRole("OWNER") && ownerPremiumMatchesLocation(principal, sc.getLocation().getId())
				&& threadStaffOperatorId == null) {
			return SalonVelvetChatSender.OWNER;
		}
		if (staffCanAccessSalonClientConversation(principal, sc, threadStaffOperatorId)) {
			return SalonVelvetChatSender.OWNER;
		}
		throw new BusinessException(HttpStatus.FORBIDDEN, "FORBIDDEN", "Non puoi inviare messaggi in questa conversazione.");
	}

	/**
	 * Thread effettivo per il viewer: titolare → sempre titolare ({@code null}); staff → il proprio operatore;
	 * cliente → parametro esplicito (default titolare).
	 */
	private UUID resolveThreadStaffOperatorId(
			VelvetUserPrincipal principal, SalonClient sc, UUID requestedStaffOperatorId) {
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

	private boolean consumerCanAccessStaffThread(VelvetUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
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

	private boolean canAccessAsLinkedConsumer(VelvetUserPrincipal principal, SalonClient sc) {
		ConsumerProfile me = consumerProfileService.requireActiveProfile(principal);
		return sc.getConsumerProfile() != null && sc.getConsumerProfile().getId().equals(me.getId());
	}

	private boolean ownerPremiumMatchesLocation(VelvetUserPrincipal principal, UUID locationId) {
		StudioGroup group = studioGroupOwnerResolver.resolveStudioGroupForOwner(principal).orElse(null);
		if (group == null) {
			return false;
		}
		if (!"PREMIUM".equals(StudioGroup.canonicalPlanTier(group.getPlanTier()))) {
			return false;
		}
		Location loc = locationRepository.findById(locationId).orElse(null);
		return loc != null && loc.getStudioGroup().getId().equals(group.getId());
	}

	private List<SalonClient> listBookedSalonClientsForStaffOperator(StaffOperator op, UUID xLocationId) {
		Location loc = op.getLocation();
		if (!"PREMIUM".equals(StudioGroup.canonicalPlanTier(loc.getStudioGroup().getPlanTier()))) {
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
			VelvetUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
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
					if (!"PREMIUM".equals(StudioGroup.canonicalPlanTier(opLoc.getStudioGroup().getPlanTier()))) {
						return false;
					}
					return appointmentRepository.existsByLocation_IdAndOperator_IdAndSalonClient_Id(
							opLoc.getId(), op.getId(), sc.getId());
				})
				.orElse(false);
	}

	private Optional<StaffOperator> resolveStaffOperator(VelvetUserPrincipal principal) {
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

	private String resolveCounterpartyLabel(VelvetUserPrincipal principal, SalonClient sc, UUID threadStaffOperatorId) {
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

	private record ChatThreadRef(SalonClient salonClient, UUID staffOperatorId) {
	}

	private record ReadWatermark(Instant lastReadAtClient, Instant lastReadAtOwner) {
		static final ReadWatermark EMPTY = new ReadWatermark(null, null);
	}

	public record SalonVelvetChatMessageDto(UUID id, String sender, String body, Instant createdAt, boolean readByRecipient) {
		static SalonVelvetChatMessageDto from(SalonVelvetChatMessage m, ReadWatermark wm) {
			boolean readByRecipient = recipientHasReadUpTo(m, wm);
			return new SalonVelvetChatMessageDto(
					m.getId(),
					m.getSender() == SalonVelvetChatSender.CLIENT ? "CLIENT" : "OWNER",
					m.getBody(),
					m.getCreatedAt(),
					readByRecipient);
		}

		private static boolean recipientHasReadUpTo(SalonVelvetChatMessage m, ReadWatermark wm) {
			Instant sentAt = m.getCreatedAt();
			if (m.getSender() == SalonVelvetChatSender.CLIENT) {
				Instant ownerRead = wm.lastReadAtOwner();
				return ownerRead != null && !ownerRead.isBefore(sentAt);
			}
			Instant clientRead = wm.lastReadAtClient();
			return clientRead != null && !clientRead.isBefore(sentAt);
		}
	}

	public record SalonVelvetChatUnreadDto(int clientUnread, int ownerUnread) {
	}

	public record SalonVelvetChatInboxSummaryDto(
			UUID salonClientId,
			UUID staffOperatorId,
			String counterpartyLabel,
			int unreadCount,
			String lastPreview,
			Instant lastMessageAt,
			String lastSender) {
	}
}
