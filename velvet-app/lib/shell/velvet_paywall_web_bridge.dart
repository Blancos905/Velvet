/// Bridge WebView → Flutter per popup «Passa a Premium» (solo piano Free in app).
class VelvetPaywallWebBridge {
  VelvetPaywallWebBridge._();

  static const channelName = 'VelvetPaywall';

  /// Notifica Flutter di aprire il popup paywall (`{ "feature": "Staff" }` o `{}`).
  static void postOpenFromJs(String featureTitle) {
    // Documentazione canale — l'invio avviene da JS iniettato.
  }
}
