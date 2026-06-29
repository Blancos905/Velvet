package it.velvet.publicapi.seo;

import it.velvet.studio.domain.Location;
import it.velvet.studio.domain.LocationRepository;
import it.velvet.studio.domain.SalonSiteContentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SalonSeoSitemapService {

	private static final DateTimeFormatter LASTMOD_FORMAT =
			DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneOffset.UTC);

	private final LocationRepository locationRepository;
	private final SalonSiteContentRepository salonSiteContentRepository;
	private final SalonSeoSiteContext siteContext;

	public SalonSeoSitemapService(
			LocationRepository locationRepository,
			SalonSiteContentRepository salonSiteContentRepository,
			SalonSeoSiteContext siteContext) {
		this.locationRepository = locationRepository;
		this.salonSiteContentRepository = salonSiteContentRepository;
		this.siteContext = siteContext;
	}

	@Transactional(readOnly = true)
	public String renderXml() {
		List<Location> salons = locationRepository.findAllPremiumLocationsOrderBySlug();
		Map<String, Instant> contentUpdatedBySlug = loadContentUpdatedBySlug();
		StringBuilder xml = new StringBuilder(512 + salons.size() * 180);
		xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
		xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
		appendUrl(xml, siteContext.absolutePath("/"), Instant.now(), "daily", "1.0");
		appendUrl(xml, siteContext.absolutePath("/search"), Instant.now(), "daily", "0.9");
		for (Location location : salons) {
			Instant lastmod = resolveLastmod(location, contentUpdatedBySlug.get(location.getSlug()));
			appendUrl(
					xml,
					siteContext.absolutePath("/saloni/" + location.getSlug()),
					lastmod,
					"weekly",
					"0.8");
		}
		xml.append("</urlset>\n");
		return xml.toString();
	}

	private Map<String, Instant> loadContentUpdatedBySlug() {
		Map<String, Instant> out = new HashMap<>();
		for (Object[] row : salonSiteContentRepository.findMaxUpdatedAtGroupedBySlug()) {
			if (row == null || row.length < 2 || row[0] == null || row[1] == null) {
				continue;
			}
			out.put(String.valueOf(row[0]), (Instant) row[1]);
		}
		return out;
	}

	private static Instant resolveLastmod(Location location, Instant contentUpdatedAt) {
		Instant studioCreatedAt = location.getStudioGroup() != null ? location.getStudioGroup().getCreatedAt() : null;
		if (contentUpdatedAt == null) {
			return studioCreatedAt != null ? studioCreatedAt : Instant.now();
		}
		if (studioCreatedAt == null) {
			return contentUpdatedAt;
		}
		return contentUpdatedAt.isAfter(studioCreatedAt) ? contentUpdatedAt : studioCreatedAt;
	}

	private static void appendUrl(
			StringBuilder xml,
			String loc,
			Instant lastmod,
			String changeFreq,
			String priority) {
		xml.append("  <url>\n");
		xml.append("    <loc>").append(SalonSeoXmlSupport.escapeXml(loc)).append("</loc>\n");
		if (lastmod != null) {
			xml.append("    <lastmod>").append(LASTMOD_FORMAT.format(lastmod)).append("</lastmod>\n");
		}
		xml.append("    <changefreq>").append(changeFreq).append("</changefreq>\n");
		xml.append("    <priority>").append(priority).append("</priority>\n");
		xml.append("  </url>\n");
	}
}
