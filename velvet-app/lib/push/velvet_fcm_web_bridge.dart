import 'dart:convert';

/// Inietta il token FCM nel contesto JS della WebView (velvet-frontend).
class VelvetFcmWebBridge {
  VelvetFcmWebBridge._();

  static const fcmTokenStorageKey = 'velvet_fcm_device_token';

  static String deliverTokenScript(String? token) {
    if (token == null || token.isEmpty) {
      return '';
    }
    final encoded = jsonEncode(token);
    return '''
(function() {
  var token = $encoded;
  if (!token) return;
  window.velvetFcmToken = token;
  try { sessionStorage.setItem('$fcmTokenStorageKey', token); } catch (e) {}
  if (typeof window.onVelvetFcmTokenReceived === 'function') {
    try { window.onVelvetFcmTokenReceived(token); } catch (e) {}
  }
})();
''';
  }

  /// DELETE token FCM prima di rimuovere la sessione JWT (logout menu nativo).
  static String nativeLogoutScript({required String apiBaseUrl}) {
    final base = jsonEncode(apiBaseUrl.replaceAll(RegExp(r'/+$'), ''));
    return '''
(function() {
  var apiBase = $base;
  var accessToken = '';
  var fcmToken = '';
  try { accessToken = sessionStorage.getItem('velvet_access_token') || ''; } catch (e) {}
  try { fcmToken = sessionStorage.getItem('$fcmTokenStorageKey') || window.velvetFcmToken || ''; } catch (e2) {}
  if (accessToken && fcmToken) {
    try {
      fetch(apiBase + '/api/v1/me/devices/' + encodeURIComponent(fcmToken), {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + accessToken }
      }).catch(function() {});
    } catch (e3) {}
  }
  try { sessionStorage.removeItem('$fcmTokenStorageKey'); } catch (e4) {}
  try { delete window.velvetFcmToken; } catch (e5) {}
  try { sessionStorage.removeItem('velvet_access_token'); } catch (e6) {}
  try { sessionStorage.removeItem('velvet_refresh_token'); } catch (e7) {}
  window.location.href = '/';
})();
''';
  }
}
