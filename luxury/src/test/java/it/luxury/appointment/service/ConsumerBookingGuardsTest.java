package it.luxury.appointment.service;

import it.luxury.appointment.domain.AppointmentRepository;
import it.luxury.catalog.domain.SalonService;
import it.luxury.catalog.domain.SalonServiceRepository;
import it.luxury.catalog.domain.StaffOperator;
import it.luxury.catalog.domain.StaffOperatorRepository;
import it.luxury.common.api.BusinessException;
import it.luxury.consumer.domain.ConsumerProfile;
import it.luxury.consumer.domain.ConsumerProfileRepository;
import it.luxury.studio.domain.Location;
import it.luxury.studio.domain.LocationRepository;
import it.luxury.studio.domain.StudioGroup;
import it.luxury.studio.domain.StudioGroupRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class ConsumerBookingGuardsTest {

	@Autowired
	private AppointmentBookingService bookingService;

	@Autowired
	private AppointmentRepository appointmentRepository;

	@Autowired
	private StudioGroupRepository studioGroupRepository;

	@Autowired
	private LocationRepository locationRepository;

	@Autowired
	private SalonServiceRepository salonServiceRepository;

	@Autowired
	private StaffOperatorRepository staffOperatorRepository;

	@Autowired
	private ConsumerProfileRepository consumerProfileRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	@Test
	void rejectsPastStartHiddenLocationAndMissingOperator() {
		ConsumerProfile consumer = client();
		Location hidden = location(false);
		SalonService hiddenService = salonServiceRepository.save(new SalonService(hidden, "Taglio", 30, 2000));
		assertThatThrownBy(() -> bookingService.createForConsumer(
				consumer, hidden.getSlug(), hiddenService.getId(), null, futureSlot()))
				.isInstanceOf(BusinessException.class)
				.extracting("status")
				.hasToString("404 NOT_FOUND");

		Location visible = location(true);
		assertThatThrownBy(() -> bookingService.createForConsumer(
				consumer, visible.getSlug(), hiddenService.getId(), null, Instant.now().minusSeconds(60)))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining("non è prenotabile");

		SalonService lonely = salonServiceRepository.save(new SalonService(visible, "Piega", 30, 2500));
		assertThatThrownBy(() -> bookingService.createForConsumer(
				consumer, visible.getSlug(), lonely.getId(), null, futureSlot()))
				.isInstanceOf(BusinessException.class)
				.hasMessageContaining("Nessun operatore");
	}

	@Test
	void concurrentSameSlotKeepsOneAppointment() throws Exception {
		ConsumerProfile first = client();
		ConsumerProfile second = client();
		Location location = location(true);
		SalonService service = salonServiceRepository.save(new SalonService(location, "Colore", 30, 4000));
		StaffOperator operator = staffOperatorRepository.save(new StaffOperator(location, "Inès"));
		operator.setRequireBookingConfirmation(false);
		staffOperatorRepository.save(operator);
		Instant start = futureSlot();

		ExecutorService pool = Executors.newFixedThreadPool(2);
		CountDownLatch ready = new CountDownLatch(2);
		CountDownLatch go = new CountDownLatch(1);
		AtomicInteger wins = new AtomicInteger();
		AtomicInteger conflicts = new AtomicInteger();
		try {
			Future<?> a = pool.submit(() -> book(first, location, service, operator, start, ready, go, wins, conflicts));
			Future<?> b = pool.submit(() -> book(second, location, service, operator, start, ready, go, wins, conflicts));
			ready.await();
			go.countDown();
			a.get();
			b.get();
		}
		finally {
			pool.shutdownNow();
		}
		assertThat(wins.get()).isEqualTo(1);
		assertThat(conflicts.get()).isEqualTo(1);
		assertThat(appointmentRepository.countByOperator_Id(operator.getId())).isEqualTo(1);
	}

	private void book(
			ConsumerProfile consumer,
			Location location,
			SalonService service,
			StaffOperator operator,
			Instant start,
			CountDownLatch ready,
			CountDownLatch go,
			AtomicInteger wins,
			AtomicInteger conflicts) {
		ready.countDown();
		try {
			go.await();
			bookingService.createForConsumer(consumer, location.getSlug(), service.getId(), operator.getId(), start);
			wins.incrementAndGet();
		}
		catch (BusinessException ex) {
			conflicts.incrementAndGet();
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
		}
	}

	private ConsumerProfile client() {
		ConsumerProfile profile = new ConsumerProfile("book-" + UUID.randomUUID(), UUID.randomUUID() + "@example.com", "Cliente");
		profile.setPasswordHash(passwordEncoder.encode("Password1!"));
		profile.setSecurityRoles("CLIENT");
		return consumerProfileRepository.save(profile);
	}

	private Location location(boolean visible) {
		StudioGroup group = studioGroupRepository.save(new StudioGroup("Salone " + UUID.randomUUID()));
		Location location = new Location(group, "sede-" + UUID.randomUUID(), "Sede test", "Roma");
		location.setVisibleToClients(visible);
		return locationRepository.save(location);
	}

	private static Instant futureSlot() {
		ZonedDateTime slot = ZonedDateTime.of(LocalDate.now(ZoneId.of("Europe/Rome")).plusDays(2), LocalTime.of(10, 0), ZoneId.of("Europe/Rome"));
		return slot.toInstant();
	}
}
