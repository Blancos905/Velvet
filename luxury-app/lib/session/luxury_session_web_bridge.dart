/// Lettura JWT + `GET /api/v1/me/salon` dalla WebView (sync sessione shell).
class LuxurySessionWebBridge {
  LuxurySessionWebBridge._();

  /// Lettura immediata JWT/sessionStorage (senza fetch).
  static const readSessionJsonSyncScript = '''
(function() {
  function b64urlDecode(seg) {
    var b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    var pad = b64.length % 4;
    if (pad === 2) b64 += '==';
    else if (pad === 3) b64 += '=';
    else if (pad === 1) return null;
    return JSON.parse(atob(b64));
  }
  function rolesFromPayload(p) {
    if (!p) return [];
    if (Array.isArray(p.roles)) {
      return p.roles.map(function(r) { return String(r).trim().toUpperCase(); });
    }
    if (p.realm_access && Array.isArray(p.realm_access.roles)) {
      return p.realm_access.roles.map(function(r) { return String(r).trim().toUpperCase(); });
    }
    return [];
  }
  var token = '';
  try { token = sessionStorage.getItem('luxury_access_token') || ''; } catch (e) {}
  var sessionPlanHint = '';
  try { sessionPlanHint = sessionStorage.getItem('luxury_intended_salon_plan') || ''; } catch (e) {}
  var jwtPlanHint = null;
  var roles = [];
  if (token && token.indexOf('.') > 0) {
    try {
      var payload = b64urlDecode(token.split('.')[1]);
      roles = rolesFromPayload(payload);
      jwtPlanHint = payload.plan || payload.organization_plan || null;
    } catch (e) {}
  }
  return JSON.stringify({
    hasToken: !!token,
    roles: roles,
    jwtPlanHint: jwtPlanHint,
    sessionPlanHint: sessionPlanHint,
    apiProvisioned: false,
    apiPlanTier: null
  });
})();
''';

  /// JWT + piano da API (Promise — preferito dopo login titolare).
  static const readSessionJsonScript = '''
(function() {
  function b64urlDecode(seg) {
    var b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    var pad = b64.length % 4;
    if (pad === 2) b64 += '==';
    else if (pad === 3) b64 += '=';
    else if (pad === 1) return null;
    return JSON.parse(atob(b64));
  }
  function rolesFromPayload(p) {
    if (!p) return [];
    if (Array.isArray(p.roles)) {
      return p.roles.map(function(r) { return String(r).trim().toUpperCase(); });
    }
    if (p.realm_access && Array.isArray(p.realm_access.roles)) {
      return p.realm_access.roles.map(function(r) { return String(r).trim().toUpperCase(); });
    }
    return [];
  }
  var token = '';
  try { token = sessionStorage.getItem('luxury_access_token') || ''; } catch (e) {}
  var sessionPlanHint = '';
  try { sessionPlanHint = sessionStorage.getItem('luxury_intended_salon_plan') || ''; } catch (e) {}
  var jwtPlanHint = null;
  var roles = [];
  if (token && token.indexOf('.') > 0) {
    try {
      var payload = b64urlDecode(token.split('.')[1]);
      roles = rolesFromPayload(payload);
      jwtPlanHint = payload.plan || payload.organization_plan || null;
    } catch (e) {}
  }
  var isOwner = roles.indexOf('OWNER') >= 0;
  var out = {
    hasToken: !!token,
    roles: roles,
    jwtPlanHint: jwtPlanHint,
    sessionPlanHint: sessionPlanHint,
    apiProvisioned: false,
    apiPlanTier: null
  };
  if (!isOwner || !token) {
    return JSON.stringify(out);
  }
  return fetch('/api/v1/me/salon', {
    headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
  })
  .then(function(res) {
    if (!res.ok) return out;
    return res.json().then(function(body) {
      if (body && body.provisioned && body.planTier) {
        out.apiProvisioned = true;
        out.apiPlanTier = body.planTier;
      }
      return out;
    });
  })
  .catch(function() { return out; })
  .then(function(final) { return JSON.stringify(final); });
})();
''';
}
