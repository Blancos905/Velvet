import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import '../config/velvet_app_config.dart';
import '../geolocation/velvet_geolocation_web_bridge.dart';
import '../geolocation/velvet_native_geolocation_service.dart';
import '../push/velvet_fcm_service.dart';
import '../push/velvet_fcm_web_bridge.dart';
import '../config/velvet_subscription_guards.dart';
import '../free/velvet_free_plan_policy.dart';
import '../security/velvet_domain_guard.dart';
import '../session/velvet_salon_session.dart';
import '../session/velvet_session_controller.dart';
import '../theme/velvet_free_theme.dart';
import '../theme/velvet_premium_shell_theme.dart';
import '../webview/velvet_ios_webview_keyboard.dart';
import 'velvet_free_web_bridge.dart';
import 'velvet_native_app_web_bridge.dart';
import 'velvet_paywall_overlay.dart';
import 'velvet_paywall_web_bridge.dart';
import 'velvet_profile_menu_item.dart';
import 'velvet_profile_menu_sheet.dart';
import 'velvet_profile_menu_web_bridge.dart';

/// Carica **velvet-frontend** in WebView; per titolari piano Free applica tema e vincoli solo in app.
class VelvetWebShell extends StatefulWidget {
  const VelvetWebShell({
    super.key,
    this.initialUrl,
    this.sessionController,
  });

  final String? initialUrl;
  final VelvetSessionController? sessionController;

  @override
  State<VelvetWebShell> createState() => _VelvetWebShellState();
}

class _VelvetWebShellState extends State<VelvetWebShell> {
  late final WebViewController _controller;
  late final Key _webViewKey;
  var _loading = true;
  var _loadError = false;
  var _mainFrameRetryCount = 0;
  var _showPaywall = false;
  var _showProfileMenu = false;
  String? _blockedFeatureTitle;
  String _currentWebPath = '/';
  var _fcmInitialized = false;

  VelvetSessionController? get _session => widget.sessionController;

  bool get _isFreeOwner => _session?.isFreeSalonOwner ?? false;

  bool get _useFreeProfileShell =>
      _isFreeOwner && VelvetFreePlanPolicy.usesAccountProfileTheme(_currentWebPath);

  Color get _shellBackground =>
      _useFreeProfileShell ? VelvetFreeTheme.surface : VelvetPremiumShellTheme.surface;

  Color get _spinnerColor =>
      _useFreeProfileShell ? VelvetFreeTheme.accent : VelvetPremiumShellTheme.accent;

  @override
  void initState() {
    super.initState();
    widget.sessionController?.addListener(_onSessionChanged);

    _webViewKey = UniqueKey();
    _controller = _createWebViewController();
    unawaited(
      _controller.loadRequest(Uri.parse(widget.initialUrl ?? VelvetAppConfig.homeUrl)),
    );

    _configureWebViewPlatform();
    unawaited(_configureJavaScriptDialogs());
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(VelvetIosWebViewKeyboard.keepVisibleOnScroll());
    });
    unawaited(_initializeFcm());
  }

  WebViewController _createWebViewController() {
    return WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(_shellBackground)
      ..setUserAgent('${VelvetAppConfig.userAgent} VelvetMobileApp/1.0 SaloniLuxuryApp/1.0')
      ..addJavaScriptChannel(
        VelvetGeolocationWebBridge.channelName,
        onMessageReceived: (JavaScriptMessage message) {
          _handleNativeGeolocationMessage(message.message);
        },
      )
      ..addJavaScriptChannel(
        VelvetProfileMenuWebBridge.channelName,
        onMessageReceived: (message) {
          if (message.message == 'sync') {
            unawaited(_syncSessionAndProfileMenu());
            return;
          }
          unawaited(_openProfileMenu());
        },
      )
      ..addJavaScriptChannel(
        VelvetPaywallWebBridge.channelName,
        onMessageReceived: (message) {
          _handlePaywallChannelMessage(message.message);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) {
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
    if (VelvetAppConfig.isLocalDev && _mainFrameRetryCount < 2) {
      _mainFrameRetryCount += 1;
      Future<void>.delayed(const Duration(seconds: 2), () {
        if (!mounted) {
          return;
        }
        unawaited(
          _controller.loadRequest(
            Uri.parse(widget.initialUrl ?? VelvetAppConfig.homeUrl),
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
    await VelvetFcmService.initialize(_sendTokenToWebView);
    await _sendTokenToWebView(VelvetFcmService.currentToken);
  }

  Future<void> _sendTokenToWebView(String? token) async {
    final script = VelvetFcmWebBridge.deliverTokenScript(token);
    if (script.isEmpty) return;
    try {
      await _controller.runJavaScript(script);
    } catch (e) {
      debugPrint('VelvetWebShell: iniezione token FCM fallita: $e');
    }
  }

  Future<void> _configureWebViewPlatform() async {
    final platform = _controller.platform;
    if (platform is AndroidWebViewController) {
      platform.setMediaPlaybackRequiresUserGesture(false);
      await platform.setGeolocationEnabled(true);
      await platform.setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (_) async {
          final allowed = await VelvetNativeGeolocationService.ensurePermission();
          return GeolocationPermissionsResponse(
            allow: allowed,
            retain: true,
          );
        },
      );
    } else if (platform is WebKitWebViewController) {
      await platform.setOnPlatformPermissionRequest((request) async {
        await request.grant();
      });
      await VelvetIosWebViewKeyboard.keepVisibleOnScroll();
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
    String? requestId;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return;
      final map = Map<String, dynamic>.from(decoded);
      requestId = map['requestId'] as String?;
      if (requestId == null || requestId.isEmpty) return;

      final position = await VelvetNativeGeolocationService.getCurrentPosition();
      await _controller.runJavaScript(
        VelvetGeolocationWebBridge.deliverSuccessScript(
          requestId: requestId,
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
        ),
      );
    } catch (e) {
      if (requestId == null) return;
      final geo = e is VelvetGeoException
          ? e
          : const VelvetGeoException(2, 'Impossibile ottenere la posizione.');
      await _controller.runJavaScript(
        VelvetGeolocationWebBridge.deliverErrorScript(
          requestId: requestId,
          code: geo.code,
          message: geo.message,
        ),
      );
    }
  }

  @override
  void dispose() {
    widget.sessionController?.removeListener(_onSessionChanged);
    unawaited(_controller.loadRequest(Uri.parse('about:blank')));
    unawaited(VelvetFcmService.dispose());
    super.dispose();
  }

  void _onSessionChanged() {
    if (!mounted) return;
    _controller.setBackgroundColor(_shellBackground);
    _applyFreeModeToWebView();
    _applyProfileMenuToWebView();
    if (_profileMenuItems.isEmpty) {
      _showProfileMenu = false;
    }
    setState(() {});
  }

  Future<void> _onPageFinished() async {
    if (!mounted) return;
    _mainFrameRetryCount = 0;
    setState(() => _loading = false);
    await VelvetIosWebViewKeyboard.keepVisibleOnScroll();
    await _controller.runJavaScript(VelvetGeolocationWebBridge.installScript);
    await _controller.runJavaScript(VelvetNativeAppWebBridge.installScript);
    await _controller.runJavaScript(
      VelvetNativeAppWebBridge.applyPanoramaAccountPageScript,
    );
    VelvetFcmService.notifyWebViewIfReady();
    await _sendTokenToWebView(VelvetFcmService.currentToken);
    await _session?.syncFromWebView(_controller);
    await _refreshWebPathAndShell();
    await _applyFreeModeToWebView();
    await _applyProfileMenuToWebView();
    await _installSessionSyncWatcher();
  }

  Future<void> _installSessionSyncWatcher() async {
    await _controller.runJavaScript('''
(function() {
  if (window.__velvetAppSessionSyncWatch) return;
  window.__velvetAppSessionSyncWatch = true;
  var lastToken = '';
  try { lastToken = sessionStorage.getItem('velvet_access_token') || ''; } catch (e) {}
  setInterval(function() {
    var token = '';
    try { token = sessionStorage.getItem('velvet_access_token') || ''; } catch (e) {}
    if (token === lastToken) return;
    lastToken = token;
    try {
      if (window.VelvetProfileMenu && window.VelvetProfileMenu.postMessage) {
        window.VelvetProfileMenu.postMessage('sync');
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
    await _applyFreeModeToWebView();
    await _applyProfileMenuToWebView();
    if (_profileMenuItems.isEmpty) {
      _showProfileMenu = false;
    }
    setState(() {});
  }

  Future<void> _refreshWebPathAndShell() async {
    final url = await _controller.currentUrl();
    if (url == null || !mounted) return;
    final path = VelvetFreePlanPolicy.normalizePath(Uri.parse(url).path);
    final pathChanged = path != _currentWebPath;
    if (pathChanged) {
      setState(() => _currentWebPath = path);
      await _controller.scrollTo(0, 0);
    }
    if (pathChanged || _isFreeOwner) {
      await _controller.setBackgroundColor(_shellBackground);
    }
  }

  Future<void> _openProfileMenu() async {
    await _session?.syncFromWebView(_controller);
    if (!mounted) return;
    final session = _session?.session ?? VelvetSalonSession.guest;
    if (!VelvetProfileMenuWebBridge.usesNativeProfileSheet(session)) return;
    if (VelvetProfileMenuWebBridge.itemsForSession(session).isEmpty) return;
    setState(() => _showProfileMenu = true);
  }

  void _closeProfileMenu() {
    if (!mounted) return;
    setState(() => _showProfileMenu = false);
  }

  Future<void> _onProfileMenuItemSelected(VelvetProfileMenuItem item) async {
    _closeProfileMenu();
    if (item.logout) {
      final apiBase = VelvetAppConfig.webBaseUrl.replaceAll(RegExp(r'/+$'), '');
      await _controller.runJavaScript(
        VelvetFcmWebBridge.nativeLogoutScript(apiBaseUrl: apiBase),
      );
      await _session?.syncFromWebView(_controller);
      return;
    }
    final href = item.href;
    if (href == null || href.isEmpty) return;
    final base = VelvetAppConfig.webBaseUrl.replaceAll(RegExp(r'/+$'), '');
    final path = href.startsWith('/') ? href : '/$href';
    await _controller.loadRequest(Uri.parse('$base$path'));
  }

  Future<void> _applyProfileMenuToWebView() async {
    await _controller.runJavaScript(
      VelvetProfileMenuWebBridge.enableConsumerWebDropdownScript,
    );
  }

  List<VelvetProfileMenuItem> get _profileMenuItems {
    final session = _session?.session ?? VelvetSalonSession.guest;
    if (!VelvetProfileMenuWebBridge.usesNativeProfileSheet(session)) {
      return const [];
    }
    return VelvetProfileMenuWebBridge.itemsForSession(session);
  }

  Future<void> _applyFreeModeToWebView() async {
    if (_isFreeOwner) {
      await _controller.runJavaScript(
        VelvetSubscriptionGuards.installNativeWebViewGuardsScript,
      );
      await _controller.runJavaScript(VelvetFreeWebBridge.applyFreeVisualThemeScript);
      await _controller.runJavaScript(VelvetFreeWebBridge.filterNavigationScript);
      await _controller.runJavaScript(
        VelvetFreeWebBridge.applyFreeServiziNoPhotoScript,
      );
      await _controller.runJavaScript(
        VelvetFreeWebBridge.applyFreeAgendaRestrictionsScript,
      );
    } else {
      await _controller.runJavaScript(VelvetFreeWebBridge.removeFreeVisualThemeScript);
    }
  }

  NavigationDecision _onNavigationRequest(NavigationRequest request) {
    final uri = Uri.tryParse(request.url);
    if (uri == null) {
      return NavigationDecision.navigate;
    }

    if (_shouldOpenExternally(uri)) {
      _launchExternal(uri);
      return NavigationDecision.prevent;
    }

    if ((uri.scheme == 'http' || uri.scheme == 'https') &&
        !VelvetDomainGuard.isAllowedNavigation(uri, VelvetAppConfig.webBaseUrl)) {
      return NavigationDecision.prevent;
    }

    if (_isFreeOwner && _isBlockedAccountPath(uri.path)) {
      _showPaywallForPath(uri.path);
      return NavigationDecision.prevent;
    }

    return NavigationDecision.navigate;
  }

  bool _isBlockedAccountPath(String path) {
    final normalized = VelvetFreePlanPolicy.normalizePath(path);
    if (!normalized.startsWith('/account')) {
      return false;
    }
    return !VelvetFreePlanPolicy.isPathAllowed(normalized);
  }

  void _showPaywallForPath(String path) {
    _openPaywall(VelvetFreePlanPolicy.paywallFeatureTitleForPath(path));
  }

  void _openPaywall([String? featureTitle]) {
    if (!mounted) return;
    setState(() {
      _showPaywall = true;
      _blockedFeatureTitle = featureTitle?.trim().isNotEmpty == true ? featureTitle!.trim() : null;
    });
  }

  void _handlePaywallChannelMessage(String raw) {
    var featureTitle = raw.trim();
    if (featureTitle.startsWith('{')) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is Map && decoded['feature'] != null) {
          featureTitle = decoded['feature'].toString().trim();
        }
      } catch (_) {}
    }
    _openPaywall(featureTitle.isEmpty ? null : featureTitle);
  }

  void _dismissPaywall() {
    if (!mounted) return;
    setState(() {
      _showPaywall = false;
      _blockedFeatureTitle = null;
    });
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
    if (_showPaywall) {
      _dismissPaywall();
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
    final onSurface =
        _useFreeProfileShell ? VelvetFreeTheme.onSurface : VelvetPremiumShellTheme.onSurface;
    final accentBtn =
        _useFreeProfileShell ? VelvetFreeTheme.accent : VelvetPremiumShellTheme.accent;
    final onAccentBtn =
        _useFreeProfileShell ? VelvetFreeTheme.surface : VelvetPremiumShellTheme.surface;

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
              if (_loading)
                Center(
                  child: CircularProgressIndicator(color: _spinnerColor),
                ),
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
                          VelvetAppConfig.homeUrl,
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
                                widget.initialUrl ?? VelvetAppConfig.homeUrl,
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
              if (_showPaywall)
                VelvetPaywallOverlay(
                  featureTitle: _blockedFeatureTitle,
                  onDismiss: _dismissPaywall,
                ),
              if (_showProfileMenu && _profileMenuItems.isNotEmpty)
                VelvetProfileMenuSheet(
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
