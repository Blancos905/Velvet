import 'dart:convert';

/// Bridge JS: `navigator.geolocation` nella WebView delega al canale Flutter.
class VelvetGeolocationWebBridge {
  VelvetGeolocationWebBridge._();

  static const channelName = 'VelvetNativeGeolocation';

  static String get installScript => '''
(function() {
  if (window.__velvetNativeGeolocationInstalled) return;
  window.__velvetNativeGeolocationInstalled = true;
  window.__velvetGeoCallbacks = {};

  function postToNative(requestId, options) {
    if (!window.$channelName) {
      console.warn('VelvetNativeGeolocation channel missing');
      return;
    }
    window.$channelName.postMessage(JSON.stringify({
      requestId: requestId,
      enableHighAccuracy: !!(options && options.enableHighAccuracy),
      timeout: options && options.timeout,
      maximumAge: options && options.maximumAge
    }));
  }

  var nativeGeo = navigator.geolocation;
  var originalGet = nativeGeo && nativeGeo.getCurrentPosition
    ? nativeGeo.getCurrentPosition.bind(nativeGeo)
    : null;

  nativeGeo.getCurrentPosition = function(success, error, options) {
    var requestId = 'vg' + Date.now() + Math.random().toString(36).slice(2, 8);
    window.__velvetGeoCallbacks[requestId] = { success: success, error: error };
    try {
      postToNative(requestId, options);
    } catch (e) {
      if (typeof error === 'function') {
        error({ code: 2, message: 'Geolocalizzazione non disponibile nell\\'app.' });
      } else if (originalGet) {
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
  var cb = window.__velvetGeoCallbacks && window.__velvetGeoCallbacks[data.requestId];
  if (!cb || typeof cb.success !== 'function') return;
  delete window.__velvetGeoCallbacks[data.requestId];
  cb.success({
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
  var cb = window.__velvetGeoCallbacks && window.__velvetGeoCallbacks[data.requestId];
  if (!cb || typeof cb.error !== 'function') return;
  delete window.__velvetGeoCallbacks[data.requestId];
  cb.error({ code: data.code, message: data.message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 });
})();
''';
  }
}
