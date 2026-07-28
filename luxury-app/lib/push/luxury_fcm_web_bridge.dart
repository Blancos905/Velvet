import 'dart:convert';

/// Inietta il token FCM nel contesto JS della WebView (luxury-frontend).
class LuxuryFcmWebBridge {
  LuxuryFcmWebBridge._();

  static const fcmTokenStorageKey = 'luxury_fcm_device_token';
  static const pendingPushOpenStorageKey = 'luxury_pending_push_open';

  static String deliverTokenScript(String? token) {
    if (token == null || token.isEmpty) {
      return '';
    }
    final encoded = jsonEncode(token);
    return '''
(function() {
  var token = $encoded;
  if (!token) return;
  window.luxuryFcmToken = token;
  try { sessionStorage.setItem('$fcmTokenStorageKey', token); } catch (e) {}
  if (typeof window.onLuxuryFcmTokenReceived === 'function') {
    try { window.onLuxuryFcmTokenReceived(token); } catch (e) {}
  }
})();
''';
  }

  /// Tap su push FCM (app in background o cold start) → popup notifica nel frontend.
  static String deliverPushOpenScript(Map<String, String> data, {String? title, String? body}) {
    final payload = <String, String>{
      ...data,
      if (title != null && title.isNotEmpty) 'title': title,
      if (body != null && body.isNotEmpty) 'body': body,
    };
    final encoded = jsonEncode(payload);
    return '''
(function() {
  var payload = $encoded;
  try { sessionStorage.setItem('$pendingPushOpenStorageKey', JSON.stringify(payload)); } catch (e) {}
  if (typeof window.onLuxuryPushNotificationOpen === 'function') {
    try { window.onLuxuryPushNotificationOpen(payload); } catch (e2) {}
    try { sessionStorage.removeItem('$pendingPushOpenStorageKey'); } catch (e3) {}
  }
})();
''';
  }

  /// Dopo ogni `onPageFinished`: riprova l'apertura popup se il tap push è arrivato prima del frontend.
  static String get flushPendingPushOpenScript => '''
(function() {
  var raw = '';
  try { raw = sessionStorage.getItem('$pendingPushOpenStorageKey') || ''; } catch (e) {}
  if (!raw) return;
  var payload = null;
  try { payload = JSON.parse(raw); } catch (e2) { return; }
  if (typeof window.onLuxuryPushNotificationOpen !== 'function') return;
  try { window.onLuxuryPushNotificationOpen(payload); } catch (e3) {}
  try { sessionStorage.removeItem('$pendingPushOpenStorageKey'); } catch (e4) {}
})();
''';

  /// DELETE token FCM prima di rimuovere la sessione JWT (logout menu nativo).
  static String nativeLogoutScript({required String apiBaseUrl}) {
    final base = jsonEncode(apiBaseUrl.replaceAll(RegExp(r'/+$'), ''));
    return '''
(function() {
  var apiBase = $base;
  var accessToken = '';
  var fcmToken = '';
  try { accessToken = sessionStorage.getItem('luxury_access_token') || ''; } catch (e) {}
  try { fcmToken = sessionStorage.getItem('$fcmTokenStorageKey') || window.luxuryFcmToken || ''; } catch (e2) {}
  if (accessToken && fcmToken) {
    try {
      fetch(apiBase + '/api/v1/me/devices/' + encodeURIComponent(fcmToken), {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + accessToken }
      }).catch(function() {});
    } catch (e3) {}
  }
  try { sessionStorage.removeItem('$fcmTokenStorageKey'); } catch (e4) {}
  try { delete window.luxuryFcmToken; } catch (e5) {}
  try { sessionStorage.removeItem('luxury_access_token'); } catch (e6) {}
  try { sessionStorage.removeItem('luxury_refresh_token'); } catch (e7) {}
  try { sessionStorage.setItem('luxury_clear_login_on_next_login_form', '1'); } catch (e8) {}
  window.location.href = '/';
})();
''';
  }
}
