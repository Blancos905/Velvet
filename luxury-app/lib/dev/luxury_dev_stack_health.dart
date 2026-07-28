import 'dart:async';
import 'dart:io';

import '../config/luxury_app_config.dart';

/// Cosa manca nella catena dev WebView → Vite :5173 → Spring :8080.
enum LuxuryDevStackIssue {
  /// Vite non risponde su {@link LuxuryAppConfig.webBaseUrl}.
  viteDown,

  /// Vite ok ma il proxy `/api` non raggiunge Spring Boot (:8080).
  backendDown,

  /// Catena completa ok.
  ok,
}

/// Verifica la stessa catena usata dal frontend in WebView (path relativi `/api/...`).
Future<LuxuryDevStackIssue> probeLuxuryDevStack({
  Duration timeout = const Duration(seconds: 3),
}) async {
  final base = LuxuryAppConfig.webBaseUrl.replaceAll(RegExp(r'/+$'), '');

  final results = await Future.wait([
    _httpOk('$base/', timeout: timeout),
    _httpOk('$base/api/v1/public/health', timeout: timeout),
  ]);

  if (!results[0]) {
    return LuxuryDevStackIssue.viteDown;
  }
  if (!results[1]) {
    return LuxuryDevStackIssue.backendDown;
  }

  return LuxuryDevStackIssue.ok;
}

Future<bool> _httpOk(String url, {required Duration timeout}) async {
  final client = HttpClient();
  try {
    final request = await client.getUrl(Uri.parse(url)).timeout(timeout);
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    final response = await request.close().timeout(timeout);
    await response.drain<void>();
    return response.statusCode >= 200 && response.statusCode < 300;
  } on Object {
    return false;
  } finally {
    client.close(force: true);
  }
}
