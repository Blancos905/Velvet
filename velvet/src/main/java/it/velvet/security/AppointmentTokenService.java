package it.velvet.security;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import it.velvet.common.api.BusinessException;
import it.velvet.config.VelvetSecurityProperties;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Service
public class AppointmentTokenService {

	private static final String HMAC_SHA256 = "HmacSHA256";

	private final VelvetSecurityProperties securityProperties;
	private final ObjectMapper objectMapper;

	public AppointmentTokenService(VelvetSecurityProperties securityProperties, ObjectMapper objectMapper) {
		this.securityProperties = securityProperties;
		this.objectMapper = objectMapper;
	}

	public String mintManageToken(UUID appointmentId) {
		long expSeconds = Instant.now().getEpochSecond() + securityProperties.manageTokenTtlHours() * 3600L;
		return sign(new Payload(appointmentId.toString(), TokenPurpose.MANAGE.name(), expSeconds));
	}

	public String mintReviewToken(UUID appointmentId) {
		long expSeconds = Instant.now().getEpochSecond() + securityProperties.reviewTokenTtlDays() * 86400L;
		return sign(new Payload(appointmentId.toString(), TokenPurpose.REVIEW.name(), expSeconds));
	}

	private String sign(Payload payload) {
		try {
			String json = objectMapper.writeValueAsString(payload);
			String encoded = base64UrlEncode(json.getBytes(StandardCharsets.UTF_8));
			byte[] sig = hmac(encoded.getBytes(StandardCharsets.UTF_8));
			return encoded + "." + base64UrlEncode(sig);
		}
		catch (JsonProcessingException e) {
			throw new IllegalStateException(e);
		}
	}

	public Payload verify(String rawToken, TokenPurpose expectedPurpose) {
		if (rawToken == null || rawToken.isBlank() || !rawToken.contains(".")) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "INVALID_TOKEN", "Token non valido.");
		}
		int dot = rawToken.indexOf('.');
		String encoded = rawToken.substring(0, dot);
		String sigB64 = rawToken.substring(dot + 1);
		byte[] expectedSig = hmac(encoded.getBytes(StandardCharsets.UTF_8));
		byte[] gotSig;
		try {
			gotSig = base64UrlDecode(sigB64);
		}
		catch (IllegalArgumentException e) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "INVALID_TOKEN", "Token non valido.");
		}
		if (!constantTimeEquals(expectedSig, gotSig)) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "INVALID_TOKEN", "Token non valido.");
		}
		String json = new String(base64UrlDecode(encoded), StandardCharsets.UTF_8);
		Payload payload;
		try {
			payload = objectMapper.readValue(json, Payload.class);
		}
		catch (JsonProcessingException e) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "INVALID_TOKEN", "Token non valido.");
		}
		if (!expectedPurpose.name().equals(payload.purpose())) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "INVALID_TOKEN", "Token non valido.");
		}
		if (Instant.now().getEpochSecond() > payload.exp()) {
			throw new BusinessException(HttpStatus.GONE, "TOKEN_EXPIRED", "Token scaduto.");
		}
		return payload;
	}

	public UUID appointmentId(Payload payload) {
		try {
			return UUID.fromString(payload.appointmentId());
		}
		catch (Exception e) {
			throw new BusinessException(HttpStatus.NOT_FOUND, "INVALID_TOKEN", "Token non valido.");
		}
	}

	private byte[] hmac(byte[] data) {
		try {
			Mac mac = Mac.getInstance(HMAC_SHA256);
			mac.init(new SecretKeySpec(
					securityProperties.tokenSecret().getBytes(StandardCharsets.UTF_8),
					HMAC_SHA256));
			return mac.doFinal(data);
		}
		catch (NoSuchAlgorithmException | InvalidKeyException e) {
			throw new IllegalStateException(e);
		}
	}

	private static String base64UrlEncode(byte[] bytes) {
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private static byte[] base64UrlDecode(String s) {
		return Base64.getUrlDecoder().decode(s);
	}

	private static boolean constantTimeEquals(byte[] a, byte[] b) {
		if (a.length != b.length) {
			return false;
		}
		int r = 0;
		for (int i = 0; i < a.length; i++) {
			r |= a[i] ^ b[i];
		}
		return r == 0;
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Payload(String appointmentId, String purpose, long exp) {
	}
}
