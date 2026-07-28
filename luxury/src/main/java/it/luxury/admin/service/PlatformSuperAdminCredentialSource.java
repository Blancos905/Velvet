package it.luxury.admin.service;

import it.luxury.admin.domain.PlatformSuperAdminCredential;

import java.util.Optional;

@FunctionalInterface
public interface PlatformSuperAdminCredentialSource {

	Optional<PlatformSuperAdminCredential> loadSingleton();
}
