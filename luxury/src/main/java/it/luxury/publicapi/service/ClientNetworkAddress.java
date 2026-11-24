package it.luxury.publicapi.service;

import java.net.InetAddress;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Indirizzo del client da usare per una geolocalizzazione di rete.
 * Un IP privato o di loopback (Vite in LAN, reverse proxy) non è geolocalizzabile:
 * in quel caso si risolve l’uscita pubblica del server.
 */
public final class ClientNetworkAddress {

	private static final Pattern IPV4 = Pattern.compile(
			"^(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$");

	private ClientNetworkAddress() {
	}

	/**
	 * Primo indirizzo pubblico affidabile.
	 * {@code X-Forwarded-For} si legge solo se il peer TCP è privato (proxy nostro):
	 * un client su Internet non può far geolocalizzare un IP a scelta.
	 */
	public static Optional<String> publicClientIp(String remoteAddr, String forwardedFor) {
		String remote = normalize(remoteAddr);
		if (isPublic(remote)) {
			return Optional.of(remote);
		}
		if (forwardedFor == null || forwardedFor.isBlank()) {
			return Optional.empty();
		}
		for (String part : forwardedFor.split(",")) {
			String candidate = normalize(part);
			if (isPublic(candidate)) {
				return Optional.of(candidate);
			}
		}
		return Optional.empty();
	}

	static boolean isPublic(String ip) {
		if (ip == null || ip.isBlank()) {
			return false;
		}
		String host = ip.trim();
		if (host.indexOf(':') >= 0) {
			if (!host.matches("^[0-9a-fA-F:]+$")) {
				return false;
			}
		}
		else if (!IPV4.matcher(host).matches()) {
			return false;
		}
		try {
			InetAddress addr = InetAddress.getByName(host);
			return !addr.isAnyLocalAddress()
					&& !addr.isLoopbackAddress()
					&& !addr.isLinkLocalAddress()
					&& !addr.isSiteLocalAddress();
		}
		catch (Exception e) {
			return false;
		}
	}

	static String normalize(String raw) {
		if (raw == null) {
			return "";
		}
		String value = raw.trim();
		if (value.length() >= 2 && value.charAt(0) == '"' && value.charAt(value.length() - 1) == '"') {
			value = value.substring(1, value.length() - 1).trim();
		}
		if (value.startsWith("[")) {
			int end = value.indexOf(']');
			if (end > 1) {
				value = value.substring(1, end);
			}
		}
		else {
			int colon = value.indexOf(':');
			int dotCount = 0;
			for (int i = 0; i < value.length() && (colon < 0 || i < colon); i++) {
				if (value.charAt(i) == '.') {
					dotCount++;
				}
			}
			if (colon > 0 && value.indexOf(':', colon + 1) < 0 && dotCount == 3) {
				value = value.substring(0, colon);
			}
		}
		int zone = value.indexOf('%');
		if (zone > 0) {
			value = value.substring(0, zone);
		}
		return value.trim();
	}
}
