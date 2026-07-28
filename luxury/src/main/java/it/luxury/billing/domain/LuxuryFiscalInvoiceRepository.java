package it.luxury.billing.domain;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface LuxuryFiscalInvoiceRepository extends JpaRepository<LuxuryFiscalInvoice, UUID> {

	boolean existsByStripeInvoiceId(String stripeInvoiceId);

	Optional<LuxuryFiscalInvoice> findByStripeInvoiceId(String stripeInvoiceId);

	@Query("select coalesce(max(v.progressive), 0) from LuxuryFiscalInvoice v where v.fiscalYear = :year and v.status = :status")
	int findMaxProgressiveForReadyInvoices(@Param("year") int year, @Param("status") LuxuryFiscalInvoiceStatus status);

	Page<LuxuryFiscalInvoice> findAllByOrderByCreatedAtDesc(Pageable pageable);

	Page<LuxuryFiscalInvoice> findByStatusOrderByCreatedAtDesc(LuxuryFiscalInvoiceStatus status, Pageable pageable);
}
