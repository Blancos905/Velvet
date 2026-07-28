import 'dart:convert';

/// Bridge JS: `navigator.geolocation` nella WebView delega al canale Flutter.
class LuxuryGeolocationWebBridge {
  LuxuryGeolocationWebBridge._();

  static const channelName = 'LuxuryNativeGeolocation';

  static String get installScript => '''
(function() {
  if (window.__luxuryNativeGeolocationInstalled && window.$channelName) return;
  window.__luxuryNativeGeolocationInstalled = true;
  window.__luxuryGeoCallbacks = window.__luxuryGeoCallbacks || {};

  window.__luxuryGeoFinish = function(requestId, kind, payload) {
    var entry = window.__luxuryGeoCallbacks && window.__luxuryGeoCallbacks[requestId];
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    delete window.__luxuryGeoCallbacks[requestId];
    if (kind === 'success' && typeof entry.success === 'function') {
      entry.success(payload);
    } else if (kind === 'error' && typeof entry.error === 'function') {
      entry.error(payload);
    }
  };

  function postToNative(requestId, options) {
    if (!window.$channelName || typeof window.$channelName.postMessage !== 'function') {
      window.__luxuryGeoFinish(requestId, 'error', { code: 2, message: 'Geolocalizzazione non disponibile nell\\'app.' });
      return;
    }
    window.$channelName.postMessage(JSON.stringify({
      requestId: requestId,
      enableHighAccuracy: !!(options && options.enableHighAccuracy),
      timeout: options && options.timeout,
      maximumAge: options && options.maximumAge
    }));
  }

  if (!navigator.geolocation) {
    navigator.geolocation = {};
  }
  var nativeGeo = navigator.geolocation;
  var originalGet = nativeGeo.getCurrentPosition
    ? nativeGeo.getCurrentPosition.bind(nativeGeo)
    : null;

  nativeGeo.getCurrentPosition = function(success, error, options) {
    var requestId = 'vg' + Date.now() + Math.random().toString(36).slice(2, 8);
    var timeoutMs = (options && options.timeout) || 18000;
    var entry = { success: success, error: error, timer: null };
    entry.timer = setTimeout(function() {
      window.__luxuryGeoFinish(requestId, 'error', { code: 3, message: 'Richiesta posizione in timeout. Riprova.' });
    }, timeoutMs + 1500);
    window.__luxuryGeoCallbacks[requestId] = entry;
    try {
      postToNative(requestId, options);
    } catch (e) {
      window.__luxuryGeoFinish(requestId, 'error', { code: 2, message: 'Geolocalizzazione non disponibile nell\\'app.' });
      if (typeof error !== 'function' && originalGet) {
        originalGet(success, error, options);
      }
    }
  };

  if (!nativeGeo.watchPosition) {
    nativeGeo.watchPosition = function() { return 0; };
  }
  if (!nativeGeo.clearWatch) {
    nativeGeo.clearWatch = function() {};
  }
})();
''';

  static String deliverSuccessScript({
    required String requestId,
    required double latitude,
    required double longitude,
    required double accuracy,
  }) {
    final payload = jsonEncode({
      'requestId': requestId,
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
    });
    return '''
(function() {
  var data = $payload;
  if (typeof window.__luxuryGeoFinish !== 'function') return;
  window.__luxuryGeoFinish(data.requestId, 'success', {
    coords: {
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null
    },
    timestamp: Date.now()
  });
})();
''';
  }

  static String deliverErrorScript({
    required String requestId,
    required int code,
    required String message,
  }) {
    final payload = jsonEncode({
      'requestId': requestId,
      'code': code,
      'message': message,
    });
    return '''
(function() {
  var data = $payload;
  if (typeof window.__luxuryGeoFinish !== 'function') return;
  window.__luxuryGeoFinish(data.requestId, 'error', { code: data.code, message: data.message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
})();
''';
  }
}
