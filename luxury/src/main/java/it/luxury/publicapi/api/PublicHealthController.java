package it.luxury.publicapi.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Probe leggera per dev (proxy Vite, banner WebView, script {@code wait-for-backend.sh}).
 * Evita query pesanti su {@code /api/v1/public/organizations} solo per verificare che Spring risponda.
 */
@RestController
@RequestMapping("/api/v1/public/health")
@Tag(name = "Pubblico — health")
public class PublicHealthController {

	private final DataSource dataSource;

	public PublicHealthController(DataSource dataSource) {
		this.dataSource = dataSource;
	}

	@GetMapping
	@Operation(summary = "Readiness pubblica — Tomcat + connessione DB (probe dev/ops)")
	public ResponseEntity<HealthResponse> health() {
		try (Connection connection = dataSource.getConnection()) {
			if (!connection.isValid(2)) {
				return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
						.body(new HealthResponse("DOWN", "database"));
			}
			return ResponseEntity.ok(new HealthResponse("UP", "database"));
		}
		catch (SQLException ex) {
			return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
					.body(new HealthResponse("DOWN", "database"));
		}
	}

	public record HealthResponse(String status, String database) {
	}
}
