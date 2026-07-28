package it.luxury.publicapi.seo;

final class SalonSeoXmlSupport {

	private SalonSeoXmlSupport() {
	}

	static String escapeXml(String value) {
		if (value == null || value.isEmpty()) {
			return "";
		}
		StringBuilder out = new StringBuilder(value.length() + 16);
		for (int i = 0; i < value.length(); i++) {
			char ch = value.charAt(i);
			switch (ch) {
				case '&' -> out.append("&amp;");
				case '<' -> out.append("&lt;");
				case '>' -> out.append("&gt;");
				case '"' -> out.append("&quot;");
				case '\'' -> out.append("&apos;");
				default -> out.append(ch);
			}
		}
		return out.toString();
	}
}
