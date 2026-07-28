/// Voce del menu profilo iniettato nella WebView (solo app mobile).
class LuxuryProfileMenuItem {
  const LuxuryProfileMenuItem({
    required this.label,
    this.href,
    this.logout = false,
  });

  final String label;
  final String? href;
  final bool logout;
}
