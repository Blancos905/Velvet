import 'package:flutter/material.dart';

import 'luxury_premium_paywall_dialog.dart';

/// Overlay informativo piano Free — solo shell mobile (senza CTA acquisto).
class LuxuryPaywallOverlay extends StatelessWidget {
  const LuxuryPaywallOverlay({
    super.key,
    required this.onDismiss,
    this.featureTitle,
  });

  final VoidCallback onDismiss;
  final String? featureTitle;

  @override
  Widget build(BuildContext context) {
    return LuxuryPremiumPaywallDialog(
      featureTitle: featureTitle,
      onClose: onDismiss,
    );
  }
}
