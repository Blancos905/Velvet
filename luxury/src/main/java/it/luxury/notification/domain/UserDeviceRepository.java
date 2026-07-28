package it.luxury.notification.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserDeviceRepository extends JpaRepository<UserDevice, Long> {

	Optional<UserDevice> findByFcmToken(String fcmToken);

	List<UserDevice> findByUserId(UUID userId);

	void deleteByFcmToken(String fcmToken);

	void deleteByFcmTokenAndUserId(String fcmToken, UUID userId);

	void deleteByUserId(UUID userId);
}
