package it.luxury.admin.domain;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PlatformSuperAdminCredentialRepository extends JpaRepository<PlatformSuperAdminCredential, UUID> {
}
