package it.velvet.studio.dto;

/**
 * Corpo PUT vetrina/sito: {@code payload} è il blob JSON serializzato dal frontend (può essere grande, immagini incluse).
 */
public record SalonSiteContentUpsertRequest(String payload) {
}
