package it.luxury.sponsor;

/**
 * Posti in cui il super admin può appendere sponsor diversi.
 * Per ora il carousel vive solo in fondo all'agenda cliente.
 */
public final class PlacementSponsorSlots {

	public static final String CLIENT_BOOKINGS = "client_bookings";

	/** Quanti marchi ruotano insieme nel carousel dell'agenda. */
	public static final int AGENDA_CAROUSEL_SIZE = 5;

	private PlacementSponsorSlots() {
	}

	public static boolean isKnown(String placement) {
		return CLIENT_BOOKINGS.equals(placement);
	}
}
