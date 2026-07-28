import 'package:flutter/material.dart';

import '../theme/luxury_premium_shell_theme.dart';

/// Overlay informativo piano Free — solo shell mobile (Apple 3.1.1: niente prezzi né CTA acquisto).
class LuxuryPremiumPaywallDialog extends StatefulWidget {
  const LuxuryPremiumPaywallDialog({
    super.key,
    required this.onClose,
    this.featureTitle,
  });

  final VoidCallback onClose;
  final String? featureTitle;

  static const Color accent = LuxuryPremiumShellTheme.accent;
  static const Color accentHot = Color(0xFFEA580C);
  static const Color ink = Color(0xFF0A0A0A);
  static const Color surface = LuxuryPremiumShellTheme.surface;
  static const Color surfacePanel = Color(0xFF2A1008);
  static const Color onSurface = LuxuryPremiumShellTheme.onSurface;
  static const Color onMuted = Color(0xFFFED7AA);

  static const featureBlockedLead =
      'Questa sezione è inclusa nel piano Premium del salone.';

  @override
  State<LuxuryPremiumPaywallDialog> createState() => _LuxuryPremiumPaywallDialogState();
}

class _LuxuryPremiumPaywallDialogState extends State<LuxuryPremiumPaywallDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  late final Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );
    _scale = CurvedAnimation(parent: _controller, curve: Curves.easeOutBack);
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _close() {
    _controller.reverse().then((_) {
      if (mounted) widget.onClose();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: FadeTransition(
        opacity: _fade,
        child: GestureDetector(
          onTap: _close,
          behavior: HitTestBehavior.opaque,
          child: ColoredBox(
            color: Colors.black.withValues(alpha: 0.74),
            child: SafeArea(
              child: Center(
                child: GestureDetector(
                  onTap: () {},
                  child: ScaleTransition(
                    scale: _scale,
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 420),
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            DecoratedBox(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(20),
                                gradient: const LinearGradient(
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                  colors: [
                                    LuxuryPremiumPaywallDialog.surface,
                                    LuxuryPremiumPaywallDialog.surfacePanel,
                                    LuxuryPremiumPaywallDialog.surface,
                                  ],
                                ),
                                border: Border.all(color: LuxuryPremiumPaywallDialog.ink, width: 2),
                                boxShadow: [
                                  BoxShadow(
                                    color: LuxuryPremiumPaywallDialog.accentHot.withValues(alpha: 0.32),
                                    blurRadius: 52,
                                  ),
                                  const BoxShadow(
                                    color: Colors.black54,
                                    offset: Offset(0, 8),
                                    blurRadius: 0,
                                  ),
                                ],
                              ),
                              child: Padding(
                                padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.stretch,
                                  children: [
                                    const Text(
                                      'Passa a Premium',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: LuxuryPremiumPaywallDialog.accent,
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: -0.3,
                                        height: 1.15,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    const Text(
                                      LuxuryPremiumPaywallDialog.featureBlockedLead,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: LuxuryPremiumPaywallDialog.onMuted,
                                        fontSize: 14,
                                        height: 1.5,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 20),
                                    _CloseButton(onClose: _close),
                                  ],
                                ),
                              ),
                            ),
                            Positioned(
                              top: -6,
                              right: -6,
                              child: Material(
                                color: LuxuryPremiumPaywallDialog.surfacePanel,
                                shape: CircleBorder(
                                  side: BorderSide(
                                    color: LuxuryPremiumPaywallDialog.accentHot.withValues(alpha: 0.85),
                                    width: 1.2,
                                  ),
                                ),
                                child: IconButton(
                                  onPressed: _close,
                                  icon: const Icon(
                                    Icons.close,
                                    color: LuxuryPremiumPaywallDialog.onSurface,
                                    size: 20,
                                  ),
                                  tooltip: 'Chiudi',
                                  visualDensity: VisualDensity.compact,
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
            ),
          ),
        ),
      ),
    );
  }
}

class _CloseButton extends StatelessWidget {
  const _CloseButton({required this.onClose});

  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: LuxuryPremiumPaywallDialog.accentHot.withValues(alpha: 0.55),
        ),
        color: Colors.black.withValues(alpha: 0.22),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onClose,
          borderRadius: BorderRadius.circular(999),
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            child: Text(
              'Chiudi',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: LuxuryPremiumPaywallDialog.onSurface,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
