package it.luxury.notification.domain;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ScheduledNotificationRepository extends JpaRepository<ScheduledNotification, UUID> {

	@Query(
			"""
					select distinct n from ScheduledNotification n
					join fetch n.appointment a
					join fetch a.location
					join fetch a.service
					left join fetch a.consumerProfile
					join fetch a.salonClient
					where n.status = :pending and n.scheduledAt <= :now and n.ownerDeletedAt is null
					and n.appointment is not null
					order by n.scheduledAt asc
					""")
	List<ScheduledNotification> findDuePending(
			@Param("pending") QueuedNotificationStatus pending,
			@Param("now") Instant now,
			Pageable pageable);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(
			"""
					update ScheduledNotification n set n.status = :cancelled
					where n.appointment.id = :appointmentId and n.status = :pending
					""")
	int cancelAllPendingForAppointment(
			@Param("appointmentId") UUID appointmentId,
			@Param("pending") QueuedNotificationStatus pending,
			@Param("cancelled") QueuedNotificationStatus cancelled);

	@Query(
			"""
					select count(n) > 0 from ScheduledNotification n
					where n.appointment.id = :appointmentId
					and n.type = :type
					and n.status = :status
					""")
	boolean existsByAppointmentIdAndTypeAndStatus(
			@Param("appointmentId") UUID appointmentId,
			@Param("type") NotificationType type,
			@Param("status") QueuedNotificationStatus status);

	@Query(
			"""
					select n.type, count(n)
					from ScheduledNotification n
					join n.appointment a
					join a.location loc
					where loc.studioGroup.id = :studioGroupId and n.status = :status and n.ownerDeletedAt is null
					group by n.type
					""")
	List<Object[]> countByStudioGroupIdAndStatus(
			@Param("studioGroupId") UUID studioGroupId,
			@Param("status") QueuedNotificationStatus status);

	/**
	 * Conteggio inviate dopo il punto in cui il titolare ha confermato di aver consultato il registro
	 * ({@code ack} null = nessun filtro, come conteggio pieno).
	 */
	@Query(
			"""
					select n.type, count(n)
					from ScheduledNotification n
					join n.appointment a
					join a.location loc
					where loc.studioGroup.id = :studioGroupId
					and n.status = :status
					and (cast(:ack as timestamp) is null or n.sentAt > :ack)
					and n.ownerDeletedAt is null
					group by n.type
					""")
	List<Object[]> countByStudioGroupIdAndSentStatusSentAfter(
			@Param("studioGroupId") UUID studioGroupId,
			@Param("status") QueuedNotificationStatus status,
			@Param("ack") Instant ack);

	@Query(
			"""
					select n from ScheduledNotification n
					join fetch n.appointment a
					left join fetch a.salonClient sc
					left join fetch a.operator op
					join fetch a.service
					join fetch a.location loc
					where loc.studioGroup.id = :studioGroupId
					and n.type in :types
					and n.ownerDeletedAt is null
					and (cast(:operatorId as string) is null or (a.operator.id = :operatorId and n.staffDeletedAt is null))
					and (
						(n.status = :pending and (cast(:ack as timestamp) is null or n.scheduledAt > :ack))
						or (n.status = :sent and (cast(:ack as timestamp) is null or n.sentAt > :ack))
					)
					order by coalesce(n.sentAt, n.scheduledAt) desc
					""")
	List<ScheduledNotification> findRecentByStudioGroupAndTypesAck(
			@Param("studioGroupId") UUID studioGroupId,
			@Param("types") Collection<NotificationType> types,
			@Param("pending") QueuedNotificationStatus pending,
			@Param("sent") QueuedNotificationStatus sent,
			@Param("ack") Instant ack,
			@Param("operatorId") UUID operatorId,
			Pageable pageable);

	@Query(
			"""
					select count(n)
					from ScheduledNotification n
					join n.appointment a
					join a.location loc
					where loc.studioGroup.id = :studioGroupId
					and n.type in :types
					and n.status = :status
					and (cast(:cutoff as timestamp) is null or n.scheduledAt > :cutoff)
					and n.ownerDeletedAt is null
					and (cast(:operatorId as string) is null or (a.operator.id = :operatorId and n.staffDeletedAt is null))
					""")
	long countPendingByStudioGroupAndTypesAfter(
			@Param("studioGroupId") UUID studioGroupId,
			@Param("types") Collection<NotificationType> types,
			@Param("status") QueuedNotificationStatus status,
			@Param("cutoff") Instant cutoff,
			@Param("operatorId") UUID operatorId);

	@Query(
			"""
					select count(n)
					from ScheduledNotification n
					join n.appointment a
					join a.location loc
					where loc.studioGroup.id = :studioGroupId
					and n.type in :types
					and n.status = :status
					and (cast(:cutoff as timestamp) is null or n.sentAt > :cutoff)
					and n.ownerDeletedAt is null
					and (cast(:operatorId as string) is null or (a.operator.id = :operatorId and n.staffDeletedAt is null))
					""")
	long countSentByStudioGroupAndTypesAfter(
			@Param("studioGroupId") UUID studioGroupId,
			@Param("types") Collection<NotificationType> types,
			@Param("status") QueuedNotificationStatus status,
			@Param("cutoff") Instant cutoff,
			@Param("operatorId") UUID operatorId);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(
			"""
					update ScheduledNotification n
					set n.ownerDeletedAt = :deletedAt
					where n.id = :id
					and n.ownerDeletedAt is null
					and exists (
						select 1 from Appointment a
						join a.location loc
						where a = n.appointment and loc.studioGroup.id = :studioGroupId
					)
					""")
	int markDeletedForOwner(
			@Param("id") UUID id,
			@Param("studioGroupId") UUID studioGroupId,
			@Param("deletedAt") Instant deletedAt);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(
			"""
					update ScheduledNotification n
					set n.staffDeletedAt = :deletedAt
					where n.id = :id
					and n.staffDeletedAt is null
					and exists (
						select 1 from Appointment a
						join a.location loc
						where a = n.appointment and loc.studioGroup.id = :studioGroupId
						and a.operator.id = :operatorId
					)
					""")
	int markStaffDeletedForAppointmentMessage(
			@Param("id") UUID id,
			@Param("studioGroupId") UUID studioGroupId,
			@Param("operatorId") UUID operatorId,
			@Param("deletedAt") Instant deletedAt);

	/**
	 * Dopo conferma/rifiuto: nasconde all'operatore le richieste Accetta/Rifiuta ancora in inbox
	 * (il titolare continua a vederle — il filtro {@code staffDeletedAt} vale solo con {@code operatorId}).
	 */
	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(
			"""
					update ScheduledNotification n
					set n.staffDeletedAt = :deletedAt
					where n.staffDeletedAt is null
					and n.appointment.id = :appointmentId
					and n.type in :types
					""")
	int markStaffDeletedBookingRequestsForAppointment(
			@Param("appointmentId") UUID appointmentId,
			@Param("types") Collection<NotificationType> types,
			@Param("deletedAt") Instant deletedAt);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(
			"""
					update ScheduledNotification n
					set n.staffDeletedAt = :deletedAt
					where n.id = :id
					and n.staffDeletedAt is null
					and n.appointment is null
					and n.studioGroup.id = :studioGroupId
					and n.type = :type
					""")
	int markStaffDeletedPlatformMessage(
			@Param("id") UUID id,
			@Param("studioGroupId") UUID studioGroupId,
			@Param("type") NotificationType type,
			@Param("deletedAt") Instant deletedAt);

	@Query(
			"""
					select count(n)
					from ScheduledNotification n
					join n.appointment a
					where a.consumerProfile.id = :consumerProfileId
					and n.type in :types
					and n.status = :status
					and (cast(:cutoff as timestamp) is null or n.scheduledAt > :cutoff)
					and n.consumerDeletedAt is null
					""")
	long countPendingByConsumerAndTypesAfter(
			@Param("consumerProfileId") UUID consumerProfileId,
			@Param("types") Collection<NotificationType> types,
			@Param("status") QueuedNotificationStatus status,
			@Param("cutoff") Instant cutoff);

	@Query(
			"""
					select count(n)
					from ScheduledNotification n
					join n.appointment a
					where a.consumerProfile.id = :consumerProfileId
					and n.type in :types
					and n.status = :status
					and (cast(:cutoff as timestamp) is null or n.sentAt > :cutoff)
					and n.consumerDeletedAt is null
					""")
	long countSentByConsumerAndTypesAfter(
			@Param("consumerProfileId") UUID consumerProfileId,
			@Param("types") Collection<NotificationType> types,
			@Param("status") QueuedNotificationStatus status,
			@Param("cutoff") Instant cutoff);

	@Query(
			"""
					select n from ScheduledNotification n
					join fetch n.appointment a
					join fetch a.location loc
					where a.consumerProfile.id = :consumerProfileId
					and n.type in :types
					and n.consumerDeletedAt is null
					and (
						(n.status = :pending and (cast(:ack as timestamp) is null or n.scheduledAt > :ack))
						or (n.status = :sent and (cast(:ack as timestamp) is null or n.sentAt > :ack))
					)
					order by coalesce(n.sentAt, n.scheduledAt) desc
					""")
	List<ScheduledNotification> findRecentByConsumerAndTypesAck(
			@Param("consumerProfileId") UUID consumerProfileId,
			@Param("types") Collection<NotificationType> types,
			@Param("pending") QueuedNotificationStatus pending,
			@Param("sent") QueuedNotificationStatus sent,
			@Param("ack") Instant ack,
			Pageable pageable);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(
			"""
					update ScheduledNotification n
					set n.consumerDeletedAt = :deletedAt
					where n.id = :id
					and n.consumerDeletedAt is null
					and exists (
						select 1 from Appointment a
						where a = n.appointment and a.consumerProfile.id = :consumerProfileId
					)
					""")
	int markDeletedForConsumer(
			@Param("id") UUID id,
			@Param("consumerProfileId") UUID consumerProfileId,
			@Param("deletedAt") Instant deletedAt);

	@Query(
			"""
					select count(n) from ScheduledNotification n
					where n.studioGroup.id = :studioGroupId
					and n.type = :type
					and n.status = :status
					and (cast(:cutoff as timestamp) is null or n.sentAt > :cutoff)
					and n.ownerDeletedAt is null
					and (cast(:operatorId as string) is null or n.staffDeletedAt is null)
					and (n.platformMessageSubject is null or n.platformMessageSubject <> :excludePlatformSubject)
					""")
	long countSentPlatformByStudioGroupAfter(
			@Param("studioGroupId") UUID studioGroupId,
			@Param("type") NotificationType type,
			@Param("status") QueuedNotificationStatus status,
			@Param("cutoff") Instant cutoff,
			@Param("operatorId") UUID operatorId,
			@Param("excludePlatformSubject") String excludePlatformSubject);

	@Query(
			"""
					select n from ScheduledNotification n
					where n.studioGroup.id = :studioGroupId
					and n.type = :type
					and n.ownerDeletedAt is null
					and (cast(:operatorId as string) is null or n.staffDeletedAt is null)
					and n.status = :sent
					and (cast(:ack as timestamp) is null or n.sentAt > :ack)
					and (n.platformMessageSubject is null or n.platformMessageSubject <> :excludePlatformSubject)
					order by n.sentAt desc
					""")
	List<ScheduledNotification> findRecentPlatformByStudioGroupAck(
			@Param("studioGroupId") UUID studioGroupId,
			@Param("type") NotificationType type,
			@Param("sent") QueuedNotificationStatus sent,
			@Param("ack") Instant ack,
			@Param("operatorId") UUID operatorId,
			@Param("excludePlatformSubject") String excludePlatformSubject,
			Pageable pageable);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(
			"""
					update ScheduledNotification n
					set n.ownerDeletedAt = :deletedAt
					where n.id = :id
					and n.ownerDeletedAt is null
					and n.studioGroup.id = :studioGroupId
					and n.type = :type
					""")
	int markDeletedPlatformForOwner(
			@Param("id") UUID id,
			@Param("studioGroupId") UUID studioGroupId,
			@Param("type") NotificationType type,
			@Param("deletedAt") Instant deletedAt);

	@Query(
			"""
					select count(n) from ScheduledNotification n
					where n.recipientConsumer.id = :recipientConsumerId
					and n.type = :type
					and n.status = :status
					and (cast(:cutoff as timestamp) is null or n.sentAt > :cutoff)
					and n.recipientConsumerDeletedAt is null
					""")
	long countSentSupportToLuxuryAfter(
			@Param("recipientConsumerId") UUID recipientConsumerId,
			@Param("type") NotificationType type,
			@Param("status") QueuedNotificationStatus status,
			@Param("cutoff") Instant cutoff);

	@Query(
			"""
					select count(n) from ScheduledNotification n
					where n.recipientConsumer.id = :recipientConsumerId
					and n.type = :type
					and n.status = :status
					and n.recipientConsumerDeletedAt is null
					and n.supportRequestFromSalon = true
					and (cast(:seenAt as timestamp) is null or n.sentAt > :seenAt)
					""")
	long countSentSupportToLuxuryFromSalonsAfterSeen(
			@Param("recipientConsumerId") UUID recipientConsumerId,
			@Param("type") NotificationType type,
			@Param("status") QueuedNotificationStatus status,
			@Param("seenAt") Instant seenAt);

	@Query(
			"""
					select n from ScheduledNotification n
					where n.recipientConsumer.id = :recipientConsumerId
					and n.type = :type
					and n.recipientConsumerDeletedAt is null
					and n.status = :sent
					and (cast(:ack as timestamp) is null or n.sentAt > :ack)
					order by n.sentAt desc
					""")
	List<ScheduledNotification> findRecentSupportToLuxuryAck(
			@Param("recipientConsumerId") UUID recipientConsumerId,
			@Param("type") NotificationType type,
			@Param("sent") QueuedNotificationStatus sent,
			@Param("ack") Instant ack,
			Pageable pageable);

	@Query(
			"""
					select n from ScheduledNotification n
					where n.recipientConsumer.id = :recipientConsumerId
					and n.type = :type
					and n.recipientConsumerDeletedAt is null
					and n.status = :sent
					and n.supportRequestFromSalon = true
					and (cast(:ack as timestamp) is null or n.sentAt > :ack)
					order by n.sentAt desc
					""")
	List<ScheduledNotification> findRecentSupportToLuxuryAckFromSalonsOnly(
			@Param("recipientConsumerId") UUID recipientConsumerId,
			@Param("type") NotificationType type,
			@Param("sent") QueuedNotificationStatus sent,
			@Param("ack") Instant ack,
			Pageable pageable);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(
			"""
					update ScheduledNotification n
					set n.recipientConsumerDeletedAt = :deletedAt
					where n.id = :id
					and n.recipientConsumerDeletedAt is null
					and n.recipientConsumer.id = :recipientConsumerId
					and n.type = :type
					""")
	int markDeletedSupportToLuxuryRecipient(
			@Param("id") UUID id,
			@Param("recipientConsumerId") UUID recipientConsumerId,
			@Param("type") NotificationType type,
			@Param("deletedAt") Instant deletedAt);

	@Query(
			"""
					select count(n) from ScheduledNotification n
					where n.recipientConsumer.id = :consumerProfileId
					and n.appointment is null
					and n.type = :type
					and n.status = :status
					and (cast(:cutoff as timestamp) is null or n.sentAt > :cutoff)
					and n.consumerDeletedAt is null
					""")
	long countSentPlatformByConsumerAfter(
			@Param("consumerProfileId") UUID consumerProfileId,
			@Param("type") NotificationType type,
			@Param("status") QueuedNotificationStatus status,
			@Param("cutoff") Instant cutoff);

	@Query(
			"""
					select n from ScheduledNotification n
					where n.recipientConsumer.id = :consumerProfileId
					and n.appointment is null
					and n.type = :type
					and n.consumerDeletedAt is null
					and n.status = :sent
					and (cast(:ack as timestamp) is null or n.sentAt > :ack)
					order by n.sentAt desc
					""")
	List<ScheduledNotification> findRecentPlatformByConsumerAck(
			@Param("consumerProfileId") UUID consumerProfileId,
			@Param("type") NotificationType type,
			@Param("sent") QueuedNotificationStatus sent,
			@Param("ack") Instant ack,
			Pageable pageable);

	@Modifying(clearAutomatically = true, flushAutomatically = true)
	@Query(
			"""
					update ScheduledNotification n
					set n.consumerDeletedAt = :deletedAt
					where n.id = :id
					and n.consumerDeletedAt is null
					and n.appointment is null
					and n.recipientConsumer.id = :consumerProfileId
					and n.type = :type
					""")
	int markDeletedPlatformForConsumer(
			@Param("id") UUID id,
			@Param("consumerProfileId") UUID consumerProfileId,
			@Param("type") NotificationType type,
			@Param("deletedAt") Instant deletedAt);

	@Query("""
			select count(n) from ScheduledNotification n
			where n.type = :type and n.status = :status and n.supportRequestFromSalon = true
			""")
	long countByTypeStatusAndSupportFromSalon(
			@Param("type") NotificationType type, @Param("status") QueuedNotificationStatus status);

	@Query("select count(n) from ScheduledNotification n where n.type = :type and n.status = :status")
	long countByTypeAndStatus(@Param("type") NotificationType type, @Param("status") QueuedNotificationStatus status);

	@Query(
			"""
					select n from ScheduledNotification n
					left join fetch n.appointment a
					where (
						(a is not null and a.consumerProfile.id = :consumerProfileId and n.consumerDeletedAt is null)
						or (n.recipientConsumer.id = :consumerProfileId and n.recipientConsumerDeletedAt is null)
					)
					order by coalesce(n.sentAt, n.scheduledAt) desc
					""")
	List<ScheduledNotification> findAllForConsumerDataExport(
			@Param("consumerProfileId") UUID consumerProfileId, Pageable pageable);
}
