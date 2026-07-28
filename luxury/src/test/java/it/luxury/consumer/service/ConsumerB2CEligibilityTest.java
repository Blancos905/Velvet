package it.luxury.consumer.service;

import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConsumerB2CEligibilityTest {

	@Test
	void allowsPureClient() {
		ConsumerProfile p = new ConsumerProfile("sub", "c@test.com", "Cliente");
		p.setSecurityRoles("CLIENT");
		ConsumerB2CEligibility.assertMayActAsConsumer(p);
	}

	@Test
	void rejectsOwner() {
		ConsumerProfile p = new ConsumerProfile("sub", "o@test.com", "Titolare");
		p.setSecurityRoles("OWNER");
		assertThatThrownBy(() -> ConsumerB2CEligibility.assertMayActAsConsumer(p))
				.isInstanceOf(BusinessException.class)
				.satisfies(ex -> assertThat(((BusinessException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
	}

	@Test
	void rejectsStaff() {
		ConsumerProfile p = new ConsumerProfile("sub", "s@test.com", "Staff");
		p.setSecurityRoles("STAFF");
		assertThatThrownBy(() -> ConsumerB2CEligibility.assertMayActAsConsumer(p))
				.isInstanceOf(BusinessException.class);
	}

	@Test
	void rejectsOwnerWithClientRole() {
		ConsumerProfile p = new ConsumerProfile("sub", "o@test.com", "Titolare");
		p.setSecurityRoles("CLIENT,OWNER");
		assertThatThrownBy(() -> ConsumerB2CEligibility.assertMayActAsConsumer(p))
				.isInstanceOf(BusinessException.class);
	}
}
