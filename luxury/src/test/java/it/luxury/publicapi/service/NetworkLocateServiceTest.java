package it.luxury.publicapi.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NetworkLocateServiceTest {

	private final ObjectMapper objectMapper = new ObjectMapper();

	@Test
	void parsesSuccessfulPayload() throws Exception {
		var node = objectMapper.readTree("""
				{"success":true,"latitude":45.4642,"longitude":9.19}
				""");
		assertThat(NetworkLocateService.parse(node))
				.hasValueSatisfying(point -> {
					assertThat(point.lat()).isEqualTo(45.4642);
					assertThat(point.lng()).isEqualTo(9.19);
				});
	}

	@Test
	void rejectsFailureNullIslandAndGarbage() throws Exception {
		assertThat(NetworkLocateService.parse(objectMapper.readTree("{\"success\":false}"))).isEmpty();
		assertThat(NetworkLocateService.parse(objectMapper.readTree(
				"{\"success\":true,\"latitude\":0,\"longitude\":0}"))).isEmpty();
		assertThat(NetworkLocateService.parse(objectMapper.readTree(
				"{\"success\":true,\"latitude\":\"nope\",\"longitude\":9}"))).isEmpty();
	}

	@Test
	void acceptsNumericStrings() throws Exception {
		var node = objectMapper.readTree("""
				{"success":true,"latitude":"41.9028","longitude":"12.4964"}
				""");
		assertThat(NetworkLocateService.parse(node)).isPresent();
	}
}
