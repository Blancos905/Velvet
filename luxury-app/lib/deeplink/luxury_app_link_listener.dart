import 'dart:async';

import 'package:app_links/app_links.dart';

/// Ascolta link https (Universal/App Links) e li inoltra alla WebView.
class LuxuryAppLinkListener {
  LuxuryAppLinkListener() : _appLinks = AppLinks();

  final AppLinks _appLinks;
  StreamSubscription<Uri>? _subscription;
  void Function(Uri uri)? _onLink;

  Future<Uri?> initialLink() => _appLinks.getInitialLink();

  void listen(void Function(Uri uri) onLink) {
    _onLink = onLink;
    _subscription ??= _appLinks.uriLinkStream.listen((uri) {
      _onLink?.call(uri);
    });
  }

  Future<void> dispose() async {
    await _subscription?.cancel();
    _subscription = null;
    _onLink = null;
  }
}
