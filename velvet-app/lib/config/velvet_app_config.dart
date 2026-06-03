/// Configurazione shell app — nessuna logica di business, solo URL del sito web.
class VelvetAppConfig {
  VelvetAppConfig._();

  /// Base del sito **velvet-frontend** (senza slash finale).
  ///
  /// Produzione: `https://salonivelvet.it`
  /// Dev emulatore Android: `http://10.0.2.2:5173`
  /// Dev simulatore iOS: `http://127.0.0.1:5173`
  /// Dev dispositivo fisico: `http://<IP-LAN>:5173`
  static const String webBaseUrl = String.fromEnvironment(
    'VELVET_WEB_BASE_URL',
    defaultValue: 'https://salonivelvet.it',
  );

  /// Path iniziale (es. `/`, `/ricerca`).
  static const String initialPath = String.fromEnvironment(
    'VELVET_WEB_INITIAL_PATH',
    defaultValue: '/',
  );

  static String get homeUrl {
    final base = webBaseUrl.replaceAll(RegExp(r'/+$'), '');
    final path = initialPath.startsWith('/') ? initialPath : '/$initialPath';
    return '$base$path';
  }

  static bool get isLocalDev {
    final lower = webBaseUrl.toLowerCase();
    return lower.startsWith('http://localhost') ||
        lower.startsWith('http://127.0.0.1') ||
        lower.startsWith('http://10.0.2.2') ||
        RegExp(r'^http://192\.168\.\d+\.\d+').hasMatch(lower);
  }

  /// User-Agent di base (WebView); suffisso `SaloniVelvetApp/` aggiunto in shell.
  static const String userAgent = String.fromEnvironment(
    'VELVET_WEB_USER_AGENT',
    defaultValue: 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  );
}
