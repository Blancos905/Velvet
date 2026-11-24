import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import '../config/luxury_app_config.dart';
import '../geolocation/luxury_geolocation_web_bridge.dart';
import '../geolocation/luxury_native_geolocation_service.dart';
import '../push/luxury_fcm_service.dart';
import '../push/luxury_fcm_web_bridge.dart';
import '../deeplink/luxury_app_link_listener.dart';
import '../security/luxury_domain_guard.dart';
import '../session/luxury_salon_session.dart';
import '../session/luxury_session_controller.dart';
import '../theme/luxury_premium_shell_theme.dart';
import '../webview/luxury_ios_webview_keyboard.dart';
import '../webview/luxury_webview_file_selector.dart';
import 'luxury_native_app_web_bridge.dart';
import 'luxury_profile_menu_item.dart';
import 'luxury_profile_menu_sheet.dart';
import 'luxury_profile_menu_web_bridge.dart';
import 'luxury_shell_loading_overlay.dart';

/// Carica **luxury-frontend** in WebView. Tema shell Premium; nessun vincolo di piano.
class LuxuryWebShell extends StatefulWidget {
  const LuxuryWebShell({
    super.key,
    this.initialUrl,
    this.sessionController,
  });

  final String? initialUrl;
  final LuxurySessionController? sessionController;

  @override
  State<LuxuryWebShell> createState() => _LuxuryWebShellState();
}

class _LuxuryWebShellState extends State<LuxuryWebShell> with WidgetsBindingObserver {
  late final WebViewController _controller;
  late final LuxuryAppLinkListener _appLinks;
  late final Key _webViewKey;
  var _loading = true;
  var _hasFinishedInitialLoad = false;
  var _loadError = false;
  var _mainFrameRetryCount = 0;
  var _showProfileMenu = false;
  String _currentWebPath = '/';
  var _fcmInitialized = false;
  var _webShellActive = true;

  bool get _canUseWebController => _webShellActive && mounted;

  LuxurySessionController? get _session => widget.sessionController;

  Color get _shellBackground => LuxuryPremiumShellTheme.surface;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    widget.sessionController?.addListener(_onSessionChanged);

    _webViewKey = UniqueKey();
    _appLinks = LuxuryAppLinkListener();
    _controller = _createWebViewController();
    unawaited(_bootstrapInitialNavigation());
    _appLinks.listen(_openIncomingWebLink);

    _configureWebViewPlatform();
    unawaited(_configureJavaScriptDialogs());
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(LuxuryIosWebViewKeyboard.keepVisibleOnScroll());
    });
    unawaited(_initializeFcm());
  }

  WebViewController _createWebViewController() {
    return WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(_shellBackground)
      ..setUserAgent('${LuxuryAppConfig.userAgent} LuxuryMobileApp/1.0 SaloniLuxuryApp/1.0')
      ..addJavaScriptChannel(
        LuxuryGeolocationWebBridge.channelName,
        onMessageReceived: (JavaScriptMessage message) {
          if (!_webShellActive) return;
          _handleNativeGeolocationMessage(message.message);
        },
      )
      ..addJavaScriptChannel(
        LuxuryProfileMenuWebBridge.channelName,
        onMessageReceived: (message) {
          if (!_webShellActive) return;
          if (message.message == 'sync') {
            unawaited(_syncSessionAndProfileMenu());
            return;
          }
          unawaited(_openProfileMenu());
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (url) {
            if (mounted && _shouldShowPageLoadingOverlay(url)) {
              setState(() {
                _loading = true;
                _loadError = false;
              });
            }
          },
          onPageFinished: (_) => _onPageFinished(),
          onWebResourceError: _onWebResourceError,
          onNavigationRequest: _onNavigationRequest,
        ),
      );
  }

  void _onWebResourceError(WebResourceError error) {
    // Errori su fetch /api o asset secondari non devono coprire l'intera app.
    if (error.isForMainFrame != true) {
      return;
    }
    if (!mounted) {
      return;
    }
    if (LuxuryAppConfig.isLocalDev && _mainFrameRetryCount < 2) {
      _mainFrameRetryCount += 1;
      Future<void>.delayed(const Duration(seconds: 2), () {
        if (!mounted) {
          return;
        }
        unawaited(
          _controller.loadRequest(
            Uri.parse(widget.initialUrl ?? LuxuryAppConfig.homeUrl),
          ),
        );
      });
      return;
    }
    setState(() {
      _loading = false;
      _loadError = true;
    });
  }

  Future<void> _initializeFcm() async {
    if (_fcmInitialized) return;
    _fcmInitialized = true;
    await LuxuryFcmService.initialize(
      _sendTokenToWebView,
      onNotificationOpened: _forwardPushOpenToWebView,
    );
    await _sendTokenToWebView(LuxuryFcmService.currentToken);
  }

  Future<void> _forwardPushOpenToWebView(
    Map<String, String> data, {
    String? title,
    String? body,
  }) async {
    if (!_canUseWebController) return;
    final script = LuxuryFcmWebBridge.deliverPushOpenScript(
      data,
      title: title,
      body: body,
    );
    if (script.isEmpty) return;
    try {
      await _controller.runJavaScript(script);
    } catch (e) {
      debugPrint('LuxuryWebShell: iniezione tap push FCM fallita: $e');
    }
  }

  Future<void> _sendTokenToWebView(String? token) async {
    if (!_canUseWebController) return;
    final script = LuxuryFcmWebBridge.deliverTokenScript(token);
    if (script.isEmpty) return;
    try {
      await _controller.runJavaScript(script);
    } catch (e) {
      debugPrint('LuxuryWebShell: iniezione token FCM fallita: $e');
    }
  }

  Future<void> _configureWebViewPlatform() async {
    final platform = _controller.platform;
    if (platform is AndroidWebViewController) {
      platform.setMediaPlaybackRequiresUserGesture(false);
      await platform.setGeolocationEnabled(true);
      await platform.setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (_) async {
          final allowed = await LuxuryNativeGeolocationService.ensurePermission();
          return GeolocationPermissionsResponse(
            allow: allowed,
            retain: true,
          );
        },
      );
      await platform.setOnShowFileSelector(luxuryAndroidWebViewFileSelector);
    } else if (platform is WebKitWebViewController) {
      await platform.setOnPlatformPermissionRequest((request) async {
        await request.grant();
      });
      await LuxuryIosWebViewKeyboard.keepVisibleOnScroll();
    }
  }

  /// WKWebView/Android WebView: senza handler, `window.confirm()` restituisce sempre false.
  Future<void> _configureJavaScriptDialogs() async {
    await _controller.setOnJavaScriptConfirmDialog(_onJavaScriptConfirm);
    await _controller.setOnJavaScriptAlertDialog(_onJavaScriptAlert);
  }

  Future<bool> _onJavaScriptConfirm(JavaScriptConfirmDialogRequest request) async {
    if (!mounted) return false;
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        content: Text(request.message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Annulla'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Conferma'),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  Future<void> _onJavaScriptAlert(JavaScriptAlertDialogRequest request) async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        content: Text(request.message),
        actions: [
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleNativeGeolocationMessage(String raw) async {
    if (!_webShellActive) return;
    String? requestId;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return;
      final map = Map<String, dynamic>.from(decoded);
      requestId = map['requestId'] as String?;
      if (requestId == null || requestId.isEmpty) return;

      final position = await LuxuryNativeGeolocationService.getCurrentPosition();
      if (!_canUseWebController) return;
      await _controller.runJavaScript(
        LuxuryGeolocationWebBridge.deliverSuccessScript(
          requestId: requestId,
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
        ),
      );
    } catch (e) {
      if (requestId == null || !_canUseWebController) return;
      final geo = e is LuxuryGeoException
          ? e
          : const LuxuryGeoException(2, 'Impossibile ottenere la posizione.');
      await _controller.runJavaScript(
        LuxuryGeolocationWebBridge.deliverErrorScript(
          requestId: requestId,
          code: geo.code,
          message: geo.message,
        ),
      );
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_notifyWebAppResumed());
    }
  }

  Future<void> _notifyWebAppResumed() async {
    if (!_canUseWebController || !_hasFinishedInitialLoad) return;
    try {
      await _controller.runJavaScript(
        'window.dispatchEvent(new CustomEvent("luxury-app-resume"));',
      );
    } catch (_) {
      /* WebView non pronta */
    }
  }

  Future<void> _teardownWebViewScripts() async {
    try {
      await _controller.runJavaScript('''
(function() {
  if (window.__luxuryAppSessionSyncInterval) {
    clearInterval(window.__luxuryAppSessionSyncInterval);
    window.__luxuryAppSessionSyncInterval = null;
  }
  window.__luxuryAppSessionSyncWatch = false;
})();
''');
    } catch (_) {
      /* Controller già distrutto (hot restart / dispose) */
    }
  }

  @override
  void dispose() {
    _webShellActive = false;
    _hasFinishedInitialLoad = false;
    WidgetsBinding.instance.removeObserver(this);
    widget.sessionController?.removeListener(_onSessionChanged);
    unawaited(_appLinks.dispose());
    unawaited(_teardownWebViewScripts());
    unawaited(LuxuryFcmService.dispose());
    super.dispose();
  }

  void _onSessionChanged() {
    if (!mounted) return;
    _controller.setBackgroundColor(_shellBackground);
    _applyProfileMenuToWebView();
    if (_profileMenuItems.isEmpty) {
      _showProfileMenu = false;
    }
    setState(() {});
  }

  Future<void> _onPageFinished() async {
    if (!_canUseWebController) return;
    _mainFrameRetryCount = 0;
    _hasFinishedInitialLoad = true;
    // Bridge geolocalizzazione prima di togliere l'overlay: evita tap su GPS prima che il canale nativo sia attivo.
    await _controller.runJavaScript(LuxuryGeolocationWebBridge.installScript);
    await LuxuryIosWebViewKeyboard.keepVisibleOnScroll();
    if (mounted) {
      setState(() => _loading = false);
    }
    await _controller.runJavaScript(LuxuryNativeAppWebBridge.installScript);
    await _controller.runJavaScript(
      LuxuryNativeAppWebBridge.applyPanoramaAccountPageScript,
    );
    LuxuryFcmService.notifyWebViewIfReady();
    await _sendTokenToWebView(LuxuryFcmService.currentToken);
    await _controller.runJavaScript(LuxuryFcmWebBridge.flushPendingPushOpenScript);
    await _session?.syncFromWebView(_controller);
    await _refreshWebPathAndShell();
    await _applyProfileMenuToWebView();
    await _installSessionSyncWatcher();
  }

  Future<void> _installSessionSyncWatcher() async {
    if (!_canUseWebController) return;
    await _controller.runJavaScript('''
(function() {
  if (window.__luxuryAppSessionSyncInterval) {
    clearInterval(window.__luxuryAppSessionSyncInterval);
    window.__luxuryAppSessionSyncInterval = null;
  }
  if (window.__luxuryAppSessionSyncWatch) return;
  window.__luxuryAppSessionSyncWatch = true;
  var lastToken = '';
  var lastPlanEpoch = '';
  try { lastToken = sessionStorage.getItem('luxury_access_token') || ''; } catch (e) {}
  try { lastPlanEpoch = sessionStorage.getItem('luxury_native_salon_plan_epoch') || ''; } catch (e) {}
  window.__luxuryAppSessionSyncInterval = setInterval(function() {
    var token = '';
    var planEpoch = '';
    try { token = sessionStorage.getItem('luxury_access_token') || ''; } catch (e) {}
    try { planEpoch = sessionStorage.getItem('luxury_native_salon_plan_epoch') || ''; } catch (e) {}
    if (token === lastToken && planEpoch === lastPlanEpoch) return;
    lastToken = token;
    lastPlanEpoch = planEpoch;
    try {
      if (window.LuxuryProfileMenu && window.LuxuryProfileMenu.postMessage) {
        window.LuxuryProfileMenu.postMessage('sync');
      }
    } catch (e) {}
  }, 1200);
})();
''');
  }

  Future<void> _syncSessionAndProfileMenu() async {
    await _session?.syncFromWebView(_controller);
    if (!mounted) return;
    await _refreshWebPathAndShell();
    await _applyProfileMenuToWebView();
    if (_profileMenuItems.isEmpty) {
      _showProfileMenu = false;
    }
    setState(() {});
  }

  Future<void> _refreshWebPathAndShell() async {
    final url = await _controller.currentUrl();
    if (url == null || !mounted) return;
    final path = _normalizeWebPath(Uri.parse(url).path);
    final pathChanged = path != _currentWebPath;
    if (pathChanged) {
      setState(() => _currentWebPath = path);
      await _controller.scrollTo(0, 0);
    }
    if (pathChanged) {
      await _controller.setBackgroundColor(_shellBackground);
    }
  }

  Future<void> _openProfileMenu() async {
    await _session?.syncFromWebView(_controller);
    if (!mounted) return;
    final session = _session?.session ?? LuxurySalonSession.guest;
    if (!LuxuryProfileMenuWebBridge.usesNativeProfileSheet(session)) return;
    if (LuxuryProfileMenuWebBridge.itemsForSession(session).isEmpty) return;
    setState(() => _showProfileMenu = true);
  }

  bool _shouldShowPageLoadingOverlay(String url) {
    if (!_hasFinishedInitialLoad) return true;
    final uri = Uri.tryParse(url);
    if (uri == null) return true;
    if (uri.scheme != 'http' && uri.scheme != 'https') return true;
    final base = Uri.tryParse(LuxuryAppConfig.webBaseUrl);
    if (base == null) return true;
    if (uri.host != base.host) return true;
    // Navigazione SPA in-app: niente overlay a tutto schermo (evita flash logo/spinner).
    return false;
  }

  void _closeProfileMenu() {
    if (!mounted) return;
    setState(() => _showProfileMenu = false);
  }

  Future<void> _onProfileMenuItemSelected(LuxuryProfileMenuItem item) async {
    _closeProfileMenu();
    if (item.logout) {
      final apiBase = LuxuryAppConfig.webBaseUrl.replaceAll(RegExp(r'/+$'), '');
      await _controller.runJavaScript(
        LuxuryFcmWebBridge.nativeLogoutScript(apiBaseUrl: apiBase),
      );
      await _session?.syncFromWebView(_controller);
      return;
    }
    final href = item.href;
    if (href == null || href.isEmpty) return;
    final base = LuxuryAppConfig.webBaseUrl.replaceAll(RegExp(r'/+$'), '');
    final path = href.startsWith('/') ? href : '/$href';
    await _controller.loadRequest(Uri.parse('$base$path'));
  }

  Future<void> _applyProfileMenuToWebView() async {
    await _controller.runJavaScript(
      LuxuryProfileMenuWebBridge.enableConsumerWebDropdownScript,
    );
  }

  List<LuxuryProfileMenuItem> get _profileMenuItems {
    final session = _session?.session ?? LuxurySalonSession.guest;
    if (!LuxuryProfileMenuWebBridge.usesNativeProfileSheet(session)) {
      return const [];
    }
    return LuxuryProfileMenuWebBridge.itemsForSession(session);
  }

  String _normalizeWebPath(String path) {
    var normalized = path.trim();
    if (normalized.isEmpty) return '/';
    if (!normalized.startsWith('/')) normalized = '/$normalized';
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.substring(0, normalized.length - 1);
    }
    return normalized;
  }

  NavigationDecision _onNavigationRequest(NavigationRequest request) {
    final uri = Uri.tryParse(request.url);
    if (uri == null) {
      return NavigationDecision.navigate;
    }

    if (!request.isMainFrame && LuxuryDomainGuard.isGoogleMapsEmbedNavigation(uri)) {
      return NavigationDecision.navigate;
    }

    final normalizedUri = _normalizeDevWebHost(uri);
    if (normalizedUri != uri) {
      unawaited(_controller.loadRequest(normalizedUri));
      return NavigationDecision.prevent;
    }

    if (_shouldOpenExternally(uri)) {
      _launchExternal(uri);
      return NavigationDecision.prevent;
    }

    if ((uri.scheme == 'http' || uri.scheme == 'https') &&
        !LuxuryDomainGuard.isAllowedNavigation(uri, LuxuryAppConfig.webBaseUrl)) {
      return NavigationDecision.prevent;
    }

    return NavigationDecision.navigate;
  }

  Future<void> _bootstrapInitialNavigation() async {
    final initialDeepLink = await _appLinks.initialLink();
    final fallback = Uri.parse(widget.initialUrl ?? LuxuryAppConfig.homeUrl);
    await _openIncomingWebLink(initialDeepLink ?? fallback);
  }

  Future<void> _openIncomingWebLink(Uri uri) async {
    final normalized = _normalizeDevWebHost(uri);
    if ((normalized.scheme == 'http' || normalized.scheme == 'https') &&
        !LuxuryDomainGuard.isAllowedNavigation(normalized, LuxuryAppConfig.webBaseUrl)) {
      return;
    }
    if (_hasFinishedInitialLoad && _canSpaNavigate(normalized)) {
      await _navigateWebSpa(normalized);
      return;
    }
    if (mounted) {
      setState(() {
        _loading = true;
        _loadError = false;
      });
    }
    await _controller.loadRequest(normalized);
  }

  bool _canSpaNavigate(Uri uri) {
    if (uri.scheme != 'http' && uri.scheme != 'https') {
      return false;
    }
    final base = Uri.tryParse(LuxuryAppConfig.webBaseUrl);
    if (base == null) {
      return false;
    }
    final uriPort = uri.hasPort ? uri.port : _defaultPort(uri.scheme);
    final basePort = base.hasPort ? base.port : _defaultPort(base.scheme);
    return uri.host.toLowerCase() == base.host.toLowerCase() && uriPort == basePort;
  }

  Future<void> _navigateWebSpa(Uri uri) async {
    final target = '${uri.path}${uri.hasQuery ? '?${uri.query}' : ''}${uri.hasFragment ? '#${uri.fragment}' : ''}';
    final encodedTarget = jsonEncode(target);
    try {
      await _controller.runJavaScript('''
(function() {
  var target = $encodedTarget;
  if (window.history && window.history.pushState) {
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } else {
    window.location.assign(target);
  }
})();
''');
      if (mounted) {
        setState(() {
          _loading = false;
          _loadError = false;
          _currentWebPath = uri.path.isEmpty ? '/' : uri.path;
        });
      }
      await _controller.runJavaScript(LuxuryNativeAppWebBridge.applyPanoramaAccountPageScript);
    } catch (_) {
      await _controller.loadRequest(uri);
    }
  }

  /// Dev: link email (localhost o altro IP LAN) → host della WebView per storage e API coerenti.
  Uri _normalizeDevWebHost(Uri uri) {
    if (!LuxuryAppConfig.isLocalDev) {
      return uri;
    }
    final baseUri = Uri.tryParse(LuxuryAppConfig.webBaseUrl);
    final baseHost = baseUri?.host.toLowerCase();
    if (baseHost == null || baseHost.isEmpty) {
      return uri;
    }
    final host = uri.host.toLowerCase();
    if (host == baseHost) {
      return uri;
    }
    if ((host == 'localhost' && baseHost == '127.0.0.1') ||
        (host == '127.0.0.1' && baseHost == 'localhost')) {
      return uri.replace(host: baseHost);
    }
    if (LuxuryDomainGuard.isPrivateLanHost(host) &&
        LuxuryDomainGuard.isPrivateLanHost(baseHost) &&
        _devPortsAlign(uri, baseUri!)) {
      return uri.replace(host: baseHost);
    }
    return uri;
  }

  bool _devPortsAlign(Uri uri, Uri baseUri) {
    final uriPort = uri.hasPort ? uri.port : _defaultPort(uri.scheme);
    final basePort = baseUri.hasPort ? baseUri.port : _defaultPort(baseUri.scheme);
    return uriPort == basePort;
  }

  int _defaultPort(String scheme) {
    return scheme.toLowerCase() == 'https' ? 443 : 80;
  }

  bool _shouldOpenExternally(Uri uri) {
    final scheme = uri.scheme.toLowerCase();
    if (scheme == 'tel' || scheme == 'sms' || scheme == 'mailto') {
      return true;
    }
    if (scheme == 'whatsapp' || scheme == 'geo' || scheme == 'maps') {
      return true;
    }
    if (scheme == 'https' || scheme == 'http') {
      final host = uri.host.toLowerCase();
      if (host == 'wa.me' || host.endsWith('.wa.me')) {
        return true;
      }
      if (LuxuryDomainGuard.isGoogleMapsExternalNavigation(uri)) {
        return true;
      }
      return false;
    }
    return scheme.isNotEmpty && scheme != 'about' && scheme != 'data';
  }

  Future<void> _launchExternal(Uri uri) async {
    final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Impossibile aprire: ${uri.scheme}')),
      );
    }
  }

  Future<bool> _handleBack() async {
    if (_showProfileMenu) {
      _closeProfileMenu();
      return false;
    }
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    const onSurface = LuxuryPremiumShellTheme.onSurface;
    const accentBtn = LuxuryPremiumShellTheme.accent;
    const onAccentBtn = LuxuryPremiumShellTheme.surface;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final shouldPop = await _handleBack();
        if (shouldPop && context.mounted) {
          await SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: _shellBackground,
        // WKWebView gestisce da solo l'inset tastiera; evita resize Flutter che fa perdere focus.
        resizeToAvoidBottomInset: false,
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(key: _webViewKey, controller: _controller),
              if (_loading) const LuxuryShellLoadingOverlay(),
              if (_loadError)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Impossibile caricare SaloniLuxury',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: onSurface,
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          LuxuryAppConfig.homeUrl,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: onSurface.withValues(alpha: 0.75),
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: () {
                            setState(() => _loadError = false);
                            _controller.loadRequest(
                              Uri.parse(
                                widget.initialUrl ?? LuxuryAppConfig.homeUrl,
                              ),
                            );
                          },
                          style: FilledButton.styleFrom(
                            backgroundColor: accentBtn,
                            foregroundColor: onAccentBtn,
                          ),
                          child: const Text('Riprova'),
                        ),
                      ],
                    ),
                  ),
                ),
              if (_showProfileMenu && _profileMenuItems.isNotEmpty)
                LuxuryProfileMenuSheet(
                  items: _profileMenuItems,
                  onClose: _closeProfileMenu,
                  onSelectItem: (item) => _onProfileMenuItemSelected(item),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
