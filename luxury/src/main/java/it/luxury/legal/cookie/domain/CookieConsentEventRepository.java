package it.luxury.legal.cookie.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CookieConsentEventRepository extends JpaRepository<CookieConsentEvent, UUID> {
}
