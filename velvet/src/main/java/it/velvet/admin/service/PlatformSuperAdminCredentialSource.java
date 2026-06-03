package it.velvet.admin.service;

import it.velvet.admin.domain.PlatformSuperAdminCredential;

import java.util.Optional;

@FunctionalInterface
public interface PlatformSuperAdminCredentialSource {

	Optional<PlatformSuperAdminCredential> loadSingleton();
}
