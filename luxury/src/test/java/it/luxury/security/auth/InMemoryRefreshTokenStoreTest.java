package it.luxury.security.auth;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class InMemoryRefreshTokenStoreTest {

	@Test
	void rotate_allowsRefreshWithinSessionMaxTtl() {
		InMemoryRefreshTokenStore store = new InMemoryRefreshTokenStore();
		UUID profileId = UUID.randomUUID();
		UUID familyId = UUID.randomUUID();
		UUID tokenId = UUID.randomUUID();
		long ttlSeconds = 86_400;

		store.issue(profileId, "old-hash", familyId, tokenId, ttlSeconds);

		RefreshTokenStore.RotateOutcome outcome = store.rotate(
				"old-hash",
				"new-hash",
				UUID.randomUUID(),
				ttlSeconds);
		assertThat(outcome.status()).isEqualTo(RefreshTokenStore.RotateStatus.SUCCESS);
		assertThat(outcome.profileId()).isEqualTo(profileId);
	}
}
