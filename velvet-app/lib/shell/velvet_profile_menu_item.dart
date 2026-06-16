/// Voce del menu profilo iniettato nella WebView (solo app mobile).
class VelvetProfileMenuItem {
  const VelvetProfileMenuItem({
    required this.label,
    this.href,
    this.logout = false,
  });

  final String label;
  final String? href;
  final bool logout;
}
