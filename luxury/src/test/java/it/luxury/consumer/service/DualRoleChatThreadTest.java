package it.luxury.consumer.service;

import it.luxury.catalog.domain.SalonClient;
import it.luxury.catalog.domain.SalonClientRepository;
import it.luxury.catalog.domain.SalonLuxuryChatMessageRepository;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.security.auth.LuxuryUserPrincipal;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class DualRoleChatThreadTest {

	@Autowired
	private SalonLuxuryChatService chatService;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private StudioGroupRepository studioGroupRepository;

	@Autowired
	private LocationRepository locationRepository;

	@Autowired
	private StaffOperatorRepository staffOperatorRepository;

	@Autowired
	private SalonClientRepository salonClientRepository;

	@Autowired
	private SalonLuxuryChatMessageRepository chatMessageRepository;

	@Test
	void staffWhoIsClientOfAnotherSalonUsesTheClientThread() {
		ConsumerProfile person = new ConsumerProfile("dual-" + UUID.randomUUID(), UUID.randomUUID() + "@example.com", "Operatore Cliente");
		person.setSecurityRoles("CLIENT,STAFF");
		person = consumerProfileRepository.save(person);

		Location workplace = location("workplace");
		StaffOperator operator = new StaffOperator(workplace, "Operatore Cliente");
		operator.setConsumerProfile(person);
		staffOperatorRepository.save(operator);

		Location other = location("other");
		SalonClient draft = new SalonClient(other, "Operatore Cliente");
		draft.setConsumerProfile(person);
		SalonClient membership = salonClientRepository.save(draft);
		UUID operatorId = operator.getId();

		LuxuryUserPrincipal principal = new LuxuryUserPrincipal(
				person.getId(), person.getAuthSub(), person.getEmail(), List.of("CLIENT", "STAFF"));
		var posted = chatService.postMessage(principal, membership.getId(), null, "Ciao dal cliente");
		assertThat(posted.sender()).isEqualTo("CLIENT");
		var stored = chatMessageRepository.findThreadMessages(membership.getId(), null);
		assertThat(stored).hasSize(1);
		assertThat(stored.get(0).getStaffOperator()).isNull();

		var inbox = chatService.listInboxSummaries(principal, null);
		assertThat(inbox).anyMatch(row -> membership.getId().equals(row.salonClientId()) && row.staffOperatorId() == null);
		assertThat(inbox).noneMatch(row -> membership.getId().equals(row.salonClientId()) && operatorId.equals(row.staffOperatorId()));
	}

	private Location location(String prefix) {
		StudioGroup group = studioGroupRepository.save(new StudioGroup(prefix + "-" + UUID.randomUUID()));
		return locationRepository.save(new Location(group, prefix + "-" + UUID.randomUUID(), prefix, "Roma"));
	}
}
