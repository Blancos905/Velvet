package it.velvet.consumer.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import it.velvet.consumer.service.MePersonalDataExportService;
import it.velvet.security.auth.VelvetUserPrincipal;
import java.util.Map;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/data-export")
@Tag(name = "Account consumatore (/me)")
@SecurityRequirement(name = "bearer-jwt")
public class MeDataExportController {

	private final MePersonalDataExportService mePersonalDataExportService;

	public MeDataExportController(MePersonalDataExportService mePersonalDataExportService) {
		this.mePersonalDataExportService = mePersonalDataExportService;
	}

	@GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
	@Operation(summary = "Export portabilità dati personali (JSON)")
	@PreAuthorize("hasAnyAuthority('ROLE_CLIENT','ROLE_OWNER')")
	public ResponseEntity<Map<String, Object>> export(@AuthenticationPrincipal VelvetUserPrincipal principal) {
		Map<String, Object> body = mePersonalDataExportService.exportForPrincipal(principal);
		return ResponseEntity.ok()
				.header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
						.filename("saloni-luxury-data-export.json")
						.build()
						.toString())
				.body(body);
	}
}
