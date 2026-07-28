import 'package:flutter/material.dart';

import '../theme/luxury_premium_shell_theme.dart';

/// Overlay di caricamento brandizzato sopra la WebView (primo paint e navigazioni interne).
class LuxuryShellLoadingOverlay extends StatelessWidget {
  const LuxuryShellLoadingOverlay({super.key});

  static const Color _surface = LuxuryPremiumShellTheme.surface;
  static const Color _accent = LuxuryPremiumShellTheme.accent;
  static const Color _onSurface = LuxuryPremiumShellTheme.onSurface;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: _surface,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              _surface,
              Color.lerp(_surface, _accent, 0.12) ?? _surface,
              _surface,
            ],
          ),
        ),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: _accent.withValues(alpha: 0.38)),
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    Colors.black.withValues(alpha: 0.92),
                    Color.lerp(_surface, Colors.black, 0.35) ?? _surface,
                  ],
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.42),
                    blurRadius: 28,
                    offset: const Offset(0, 14),
                  ),
                ],
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 28, 24, 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 88,
                      height: 88,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox(
                            width: 84,
                            height: 84,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.4,
                              color: _accent.withValues(alpha: 0.95),
                              backgroundColor: _onSurface.withValues(alpha: 0.12),
                            ),
                          ),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: Image.asset(
                              'assets/app-icon.png',
                              width: 54,
                              height: 54,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'SALONI',
                      style: TextStyle(
                        color: _onSurface.withValues(alpha: 0.78),
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 2.4,
                      ),
                    ),
                    Text(
                      'LUXURY',
                      style: TextStyle(
                        color: _accent,
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.6,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Caricamento…',
                      style: TextStyle(
                        color: _onSurface.withValues(alpha: 0.92),
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 14),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(999),
                      child: SizedBox(
                        width: 168,
                        height: 4,
                        child: LinearProgressIndicator(
                          minHeight: 4,
                          backgroundColor: _onSurface.withValues(alpha: 0.12),
                          color: _accent,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
