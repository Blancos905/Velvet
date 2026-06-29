package it.velvet.studio.dto;

import java.util.UUID;

/**
 * Contesto salone per account operatore ({@code GET /api/v1/me/staff/salon}).
 *
 * @param staffOperatorId     id operatore collegato (thread chat staff)
 * @param primaryLocationId sede a cui è assegnato l'operatore (es. header {@code X-Location-Id} per catalogo clienti / chat)
 * @param planTier          piano dello studio ({@code BASE} / {@code PREMIUM}), stessa semantica del titolare
 */
public record MeStaffSalonDto(String salonDisplayName, UUID staffOperatorId, UUID primaryLocationId, String planTier) {
}
