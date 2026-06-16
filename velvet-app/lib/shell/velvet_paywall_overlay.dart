import 'package:flutter/material.dart';

import 'velvet_premium_paywall_dialog.dart';

/// Overlay paywall piano Free — popup con card Premium (solo shell mobile).
class VelvetPaywallOverlay extends StatelessWidget {
  const VelvetPaywallOverlay({
    super.key,
    required this.onDismiss,
    this.featureTitle,
  });

  final VoidCallback onDismiss;
  final String? featureTitle;

  @override
  Widget build(BuildContext context) {
    return VelvetPremiumPaywallDialog(
      featureTitle: featureTitle,
      onClose: onDismiss,
    );
  }
}
