import 'dart:async';
import 'dart:io';

import '../config/velvet_app_config.dart';

/// Cosa manca nella catena dev WebView → Vite :5173 → Spring :8080.
enum VelvetDevStackIssue {
  /// Vite non risponde su {@link VelvetAppConfig.webBaseUrl}.
  viteDown,

  /// Vite ok ma il proxy `/api` non raggiunge Spring Boot (:8080).
  backendDown,

  /// Catena completa ok.
  ok,
}

/// Verifica la stessa catena usata dal frontend in WebView (path relativi `/api/...`).
Future<VelvetDevStackIssue> probeVelvetDevStack({
  Duration timeout = const Duration(seconds: 3),
}) async {
  final base = VelvetAppConfig.webBaseUrl.replaceAll(RegExp(r'/+$'), '');

  final results = await Future.wait([
    _httpOk('$base/', timeout: timeout),
    _httpOk('$base/api/v1/public/health', timeout: timeout),
  ]);

  if (!results[0]) {
    return VelvetDevStackIssue.viteDown;
  }
  if (!results[1]) {
    return VelvetDevStackIssue.backendDown;
  }

  return VelvetDevStackIssue.ok;
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
