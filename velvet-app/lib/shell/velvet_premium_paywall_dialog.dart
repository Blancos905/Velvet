import 'package:flutter/material.dart';

/// Overlay informativo per sezioni non incluse nel piano Free (solo app nativa).
/// Nessun prezzo, CTA commerciale o riferimento ad acquisti esterni (Apple 3.1.1 / Play billing).
class VelvetPremiumPaywallDialog extends StatefulWidget {
  const VelvetPremiumPaywallDialog({
    super.key,
    required this.onClose,
    this.featureTitle,
  });

  final VoidCallback onClose;
  final String? featureTitle;

  static const Color sky = Color(0xFF7DD3FC);
  static const Color skyHot = Color(0xFF38BDF8);
  static const Color skyDeep = Color(0xFF0EA5E9);
  static const Color ink = Color(0xFF020617);
  static const Color surface = Color(0xFF0A1628);
  static const Color surfacePanel = Color(0xFF0F2744);
  static const Color onSurface = Color(0xFFE0F2FE);
  static const Color onMuted = Color(0xFFBAE6FD);

  static const billingNotice =
      "Questo account non dispone di licenze attive per l'accesso a questa sezione. "
      'Se fai parte di un\'organizzazione, contatta l\'amministratore del sistema '
      'all\'indirizzo assistenza@saloniluxury.it.';

  static const featureBlockedLead =
      'Questa sezione non è disponibile con la configurazione attuale del tuo account.';

  @override
  State<VelvetPremiumPaywallDialog> createState() => _VelvetPremiumPaywallDialogState();
}

class _VelvetPremiumPaywallDialogState extends State<VelvetPremiumPaywallDialog>
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
    final feature = widget.featureTitle?.trim();
    final hasFeature = feature != null && feature.isNotEmpty;

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
                                    VelvetPremiumPaywallDialog.surface,
                                    VelvetPremiumPaywallDialog.surfacePanel,
                                    VelvetPremiumPaywallDialog.surface,
                                  ],
                                ),
                                border: Border.all(color: VelvetPremiumPaywallDialog.ink, width: 2),
                                boxShadow: [
                                  BoxShadow(
                                    color: VelvetPremiumPaywallDialog.skyDeep.withValues(alpha: 0.32),
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
                                      'Accesso alla sezione',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: VelvetPremiumPaywallDialog.sky,
                                        fontSize: 22,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: -0.3,
                                        height: 1.15,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      hasFeature
                                          ? '${VelvetPremiumPaywallDialog.featureBlockedLead}\n\nSezione: $feature.'
                                          : VelvetPremiumPaywallDialog.featureBlockedLead,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: VelvetPremiumPaywallDialog.onMuted,
                                        fontSize: 14,
                                        height: 1.5,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      VelvetPremiumPaywallDialog.billingNotice,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        color: VelvetPremiumPaywallDialog.onMuted.withValues(alpha: 0.88),
                                        fontSize: 13,
                                        height: 1.45,
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
                                color: VelvetPremiumPaywallDialog.surfacePanel,
                                shape: const CircleBorder(
                                  side: BorderSide(color: VelvetPremiumPaywallDialog.skyHot, width: 1.2),
                                ),
                                child: IconButton(
                                  onPressed: _close,
                                  icon: const Icon(
                                    Icons.close,
                                    color: VelvetPremiumPaywallDialog.onSurface,
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
          color: VelvetPremiumPaywallDialog.skyHot.withValues(alpha: 0.55),
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
                color: VelvetPremiumPaywallDialog.onSurface,
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
