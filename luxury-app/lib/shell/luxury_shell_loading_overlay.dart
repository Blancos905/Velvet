import 'package:flutter/material.dart';

import '../theme/luxury_premium_shell_theme.dart';

/// Overlay di caricamento: sfondo brand scuro, logo circolare grande (niente riquadro bianco).
class LuxuryShellLoadingOverlay extends StatelessWidget {
  const LuxuryShellLoadingOverlay({super.key});

  static const Color _surface = LuxuryPremiumShellTheme.surface;
  static const Color _accent = LuxuryPremiumShellTheme.accent;

  @override
  Widget build(BuildContext context) {
    final shortest = MediaQuery.sizeOf(context).shortestSide;
    // Circa il doppio rispetto al vecchio ~42% / max 260.
    final logoSize = (shortest * 0.72).clamp(280.0, 420.0);

    return ColoredBox(
      color: _surface,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              _surface,
              Color.lerp(_surface, _accent, 0.14) ?? _surface,
              _surface,
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset(
                  'assets/splash-logo-circle.png',
                  width: logoSize,
                  height: logoSize,
                  fit: BoxFit.contain,
                  filterQuality: FilterQuality.high,
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: 36,
                  height: 36,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.6,
                    color: _accent.withValues(alpha: 0.95),
                    backgroundColor: LuxuryPremiumShellTheme.onSurface.withValues(alpha: 0.12),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
