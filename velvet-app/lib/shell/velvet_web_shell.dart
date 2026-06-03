import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../config/velvet_app_config.dart';
import '../security/velvet_domain_guard.dart';

/// Carica l'intero **velvet-frontend** in WebView: UI, auth, API e routing restano sul web.
class VelvetWebShell extends StatefulWidget {
  const VelvetWebShell({super.key, this.initialUrl});

  final String? initialUrl;

  @override
  State<VelvetWebShell> createState() => _VelvetWebShellState();
}

class _VelvetWebShellState extends State<VelvetWebShell> {
  late final WebViewController _controller;
  var _loading = true;
  var _loadError = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF1C0A06))
      ..setUserAgent('${VelvetAppConfig.userAgent} SaloniVelvetApp/1.0')
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
          onPageFinished: (_) {
            if (mounted) {
              setState(() => _loading = false);
            }
          },
          onWebResourceError: (_) {
            if (mounted) {
              setState(() {
                _loading = false;
                _loadError = true;
              });
            }
          },
          onNavigationRequest: _onNavigationRequest,
        ),
      )
      ..loadRequest(Uri.parse(widget.initialUrl ?? VelvetAppConfig.homeUrl));

    final platform = _controller.platform;
    if (platform is AndroidWebViewController) {
      platform.setMediaPlaybackRequiresUserGesture(false);
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

    if ((uri.scheme == 'http' || uri.scheme == 'https')
        && !VelvetDomainGuard.isAllowedNavigation(uri, VelvetAppConfig.webBaseUrl)) {
      return NavigationDecision.prevent;
    }

    return NavigationDecision.navigate;
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
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) {
          return;
        }
        final shouldPop = await _handleBack();
        if (shouldPop && context.mounted) {
          await SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF1C0A06),
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_loading)
                const Center(
                  child: CircularProgressIndicator(color: Color(0xFFF97316)),
                ),
              if (_loadError)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'Impossibile caricare SaloniVelvet',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Color(0xFFFFF7ED),
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          VelvetAppConfig.homeUrl,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: const Color(0xFFFFF7ED).withValues(alpha: 0.75),
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 16),
                        FilledButton(
                          onPressed: () {
                            setState(() => _loadError = false);
                            _controller.loadRequest(
                              Uri.parse(widget.initialUrl ?? VelvetAppConfig.homeUrl),
                            );
                          },
                          style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFFF97316),
                            foregroundColor: const Color(0xFF1C0A06),
                          ),
                          child: const Text('Riprova'),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
