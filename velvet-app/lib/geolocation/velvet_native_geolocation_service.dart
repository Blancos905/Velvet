import 'package:geolocator/geolocator.dart';

/// Errore allineato a `GeolocationPositionError` del browser (code 1–3).
class VelvetGeoException implements Exception {
  const VelvetGeoException(this.code, this.message);

  final int code;
  final String message;

  @override
  String toString() => message;
}

/// Posizione GPS nativa per la WebView (permessi + `geolocator`).
class VelvetNativeGeolocationService {
  VelvetNativeGeolocationService._();

  /// Richiede permesso se necessario; `false` se negato.
  static Future<bool> ensurePermission() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) return false;

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }

  static Future<Position> getCurrentPosition() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      throw const VelvetGeoException(
        2,
        'Attiva i servizi di localizzazione del dispositivo.',
      );
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      throw const VelvetGeoException(
        1,
        'Permesso posizione negato. Abilitalo per Saloni Luxury nelle impostazioni.',
      );
    }
    if (permission == LocationPermission.deniedForever) {
      throw const VelvetGeoException(
        1,
        'Permesso posizione negato. Abilitalo per Saloni Luxury nelle impostazioni di sistema.',
      );
    }

    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 18),
        ),
      );
    } on LocationServiceDisabledException {
      throw const VelvetGeoException(
        2,
        'Servizi di localizzazione non disponibili.',
      );
    } on PermissionDeniedException {
      throw const VelvetGeoException(1, 'Permesso posizione negato.');
    } catch (e) {
      if (e is VelvetGeoException) rethrow;
      final hint = e.toString().toLowerCase();
      if (hint.contains('timeout') || hint.contains('time limit')) {
        throw const VelvetGeoException(
          3,
          'Richiesta posizione in timeout. Riprova.',
        );
      }
      throw const VelvetGeoException(
        2,
        'Impossibile ottenere la posizione del dispositivo.',
      );
    }
  }
}
