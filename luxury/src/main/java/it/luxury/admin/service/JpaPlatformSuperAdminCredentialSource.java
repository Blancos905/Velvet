package it.luxury.admin.service;

import it.luxury.admin.domain.PlatformSuperAdminCredential;
import it.luxury.admin.domain.PlatformSuperAdminCredentialRepository;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class JpaPlatformSuperAdminCredentialSource implements PlatformSuperAdminCredentialSource {

	private final PlatformSuperAdminCredentialRepository repository;

	public JpaPlatformSuperAdminCredentialSource(PlatformSuperAdminCredentialRepository repository) {
		this.repository = repository;
	}

	@Override
	public Optional<PlatformSuperAdminCredential> loadSingleton() {
		return repository.findById(PlatformSuperAdminCredential.SINGLETON_ID);
	}
}
