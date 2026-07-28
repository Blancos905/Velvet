package it.luxury.notification.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.MimeMessageHelper;

import jakarta.mail.MessagingException;

/** Allegato logo condiviso per email HTML multipart Saloni Luxury. */
public final class LuxuryEmailMimeSupport {

	private static final String LOGO_CLASSPATH = "email/logo-saloni-luxury.png";

	private LuxuryEmailMimeSupport() {
	}

	public static void setMultipartWithLogo(MimeMessageHelper helper, String plainText, String htmlBody)
			throws MessagingException {
		helper.setText(plainText, htmlBody);
		helper.addInline(LuxuryEmailHtml.LOGO_CONTENT_ID, new ClassPathResource(LOGO_CLASSPATH), "image/png");
	}
}
