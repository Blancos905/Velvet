package it.velvet.billing.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface VelvetFiscalInvoiceRepository extends JpaRepository<VelvetFiscalInvoice, UUID> {

	boolean existsByStripeInvoiceId(String stripeInvoiceId);

	Optional<VelvetFiscalInvoice> findByStripeInvoiceId(String stripeInvoiceId);

	@Query("select coalesce(max(v.progressive), 0) from VelvetFiscalInvoice v where v.fiscalYear = :year and v.status = :status")
	int findMaxProgressiveForReadyInvoices(@Param("year") int year, @Param("status") VelvetFiscalInvoiceStatus status);

	Page<VelvetFiscalInvoice> findAllByOrderByCreatedAtDesc(Pageable pageable);

	Page<VelvetFiscalInvoice> findByStatusOrderByCreatedAtDesc(VelvetFiscalInvoiceStatus status, Pageable pageable);
}
