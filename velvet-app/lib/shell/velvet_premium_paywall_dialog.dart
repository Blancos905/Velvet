import 'package:flutter/material.dart';

/// Popup «Passa a Premium» con card piano Premium — palette azzurra (solo app Free).
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

  static const features = [
    'Brand, layout catalogo, contenuti del sito e ricerca geolocalizzata.',
    'Notifiche su prenotazioni e messaggi di servizio.',
    'Staff, servizi, clienti e agenda per operatore.',
    'Statistiche con ricavo stimato e report PDF semestrale.',
  ];

  static const steps = [
    ('Carica logo e foto.', 'Brand'),
    ('Completa testi e galleria del sito pubblico.', 'Crea il sito'),
    ('Verifica indirizzo e posizione sulla mappa.', 'Posizione'),
    ('Servizi in listino e team con agenda.', 'Servizi'),
    ('Controlla trend e (se serve) report PDF semestrale.', 'Statistiche'),
  ];

  static const billingNotice =
      "Questo account non dispone di licenze attive per l'accesso a questa sezione. "
      'Se fai parte di un\'organizzazione, contatta l\'amministratore del sistema '
      'all\'indirizzo assistenza@saloniluxury.it.';

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
                              child: Stack(
                                children: [
                                  Positioned(
                                    left: 0,
                                    top: 48,
                                    bottom: 48,
                                    child: Container(
                                      width: 3,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(4),
                                        gradient: LinearGradient(
                                          begin: Alignment.topCenter,
                                          end: Alignment.bottomCenter,
                                          colors: [
                                            VelvetPremiumPaywallDialog.sky.withValues(alpha: 0.95),
                                            VelvetPremiumPaywallDialog.skyDeep.withValues(alpha: 0.55),
                                            VelvetPremiumPaywallDialog.skyDeep.withValues(alpha: 0.15),
                                          ],
                                        ),
                                        boxShadow: [
                                          BoxShadow(
                                            color: VelvetPremiumPaywallDialog.skyDeep.withValues(alpha: 0.35),
                                            blurRadius: 12,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  Positioned.fill(
                                    child: DecoratedBox(
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(18),
                                        gradient: RadialGradient(
                                          center: const Alignment(1, -0.2),
                                          radius: 1.1,
                                          colors: [
                                            VelvetPremiumPaywallDialog.skyDeep.withValues(alpha: 0.18),
                                            Colors.transparent,
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                  Padding(
                                    padding: const EdgeInsets.fromLTRB(20, 22, 20, 20),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Expanded(
                                              child: Text(
                                                'Premium',
                                                style: TextStyle(
                                                  color: VelvetPremiumPaywallDialog.sky,
                                                  fontSize: 28,
                                                  fontWeight: FontWeight.w800,
                                                  letterSpacing: -0.4,
                                                  height: 1.05,
                                                ),
                                              ),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(
                                                horizontal: 10,
                                                vertical: 5,
                                              ),
                                              decoration: BoxDecoration(
                                                gradient: const LinearGradient(
                                                  colors: [
                                                    Color(0xFFE0F2FE),
                                                    VelvetPremiumPaywallDialog.sky,
                                                  ],
                                                ),
                                                borderRadius: BorderRadius.circular(999),
                                                border: Border.all(
                                                  color: VelvetPremiumPaywallDialog.skyHot.withValues(alpha: 0.65),
                                                ),
                                              ),
                                              child: const Text(
                                                'CONSIGLIATO',
                                                style: TextStyle(
                                                  color: VelvetPremiumPaywallDialog.ink,
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.w800,
                                                  letterSpacing: 0.08,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        if (hasFeature) ...[
                                          const SizedBox(height: 14),
                                          Text(
                                            'Passa a premium per utilizzare $feature',
                                            textAlign: TextAlign.center,
                                            style: const TextStyle(
                                              color: VelvetPremiumPaywallDialog.sky,
                                              fontSize: 15,
                                              fontWeight: FontWeight.w700,
                                              height: 1.35,
                                            ),
                                          ),
                                        ],
                                        const SizedBox(height: 16),
                                        const _PriceBlock(),
                                        const SizedBox(height: 14),
                                        const Text(
                                          'Abbonamento pensato per la vetrina completa: sito del salone '
                                          'personalizzabile, brand in evidenza e strumenti per gestire e '
                                          'misurare l\'attività.',
                                          style: TextStyle(
                                            color: VelvetPremiumPaywallDialog.onMuted,
                                            fontSize: 13.5,
                                            height: 1.45,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        const SizedBox(height: 14),
                                        const _PreviewBlock(),
                                        const SizedBox(height: 16),
                                        _CtaButton(onClose: _close),
                                        const SizedBox(height: 14),
                                        Text(
                                          VelvetPremiumPaywallDialog.billingNotice,
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            color: VelvetPremiumPaywallDialog.onMuted.withValues(alpha: 0.72),
                                            fontSize: 12,
                                            height: 1.45,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
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

class _PriceBlock extends StatelessWidget {
  const _PriceBlock();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: VelvetPremiumPaywallDialog.skyHot.withValues(alpha: 0.55),
          width: 1.5,
        ),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            VelvetPremiumPaywallDialog.skyDeep.withValues(alpha: 0.12),
            Colors.black.withValues(alpha: 0.35),
          ],
        ),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [
                    Color(0xFFE0F2FE),
                    VelvetPremiumPaywallDialog.sky,
                    VelvetPremiumPaywallDialog.skyDeep,
                  ],
                ).createShader(bounds),
                child: const Text(
                  '20',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 42,
                    fontWeight: FontWeight.w800,
                    height: 1,
                    letterSpacing: -1,
                  ),
                ),
              ),
              const Padding(
                padding: EdgeInsets.only(bottom: 6, left: 2),
                child: Text(
                  '€',
                  style: TextStyle(
                    color: VelvetPremiumPaywallDialog.sky,
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'AL MESE',
            style: TextStyle(
              color: VelvetPremiumPaywallDialog.skyHot,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.14,
            ),
          ),
        ],
      ),
    );
  }
}

class _PreviewBlock extends StatelessWidget {
  const _PreviewBlock();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: VelvetPremiumPaywallDialog.skyHot.withValues(alpha: 0.35),
        ),
        color: Colors.black.withValues(alpha: 0.28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: VelvetPremiumPaywallDialog.skyDeep.withValues(alpha: 0.22),
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: VelvetPremiumPaywallDialog.sky.withValues(alpha: 0.35),
                ),
              ),
              child: const Text(
                '4 AREE',
                style: TextStyle(
                  color: VelvetPremiumPaywallDialog.onMuted,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.08,
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          ...VelvetPremiumPaywallDialog.features.map(
            (f) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Text(
                f,
                style: const TextStyle(
                  color: VelvetPremiumPaywallDialog.onSurface,
                  fontSize: 12.5,
                  height: 1.4,
                ),
              ),
            ),
          ),
          Divider(color: Colors.white.withValues(alpha: 0.08), height: 20),
          ...VelvetPremiumPaywallDialog.steps.map(
            (step) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      step.$1,
                      style: TextStyle(
                        color: VelvetPremiumPaywallDialog.onSurface.withValues(alpha: 0.88),
                        fontSize: 12,
                        height: 1.35,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    step.$2,
                    style: const TextStyle(
                      color: VelvetPremiumPaywallDialog.sky,
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CtaButton extends StatelessWidget {
  const _CtaButton({required this.onClose});

  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFFE0F2FE),
            VelvetPremiumPaywallDialog.sky,
            VelvetPremiumPaywallDialog.skyDeep,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: VelvetPremiumPaywallDialog.skyDeep.withValues(alpha: 0.35),
            offset: const Offset(0, 4),
            blurRadius: 16,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onClose,
          borderRadius: BorderRadius.circular(999),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Passa a',
                  style: TextStyle(
                    color: VelvetPremiumPaywallDialog.ink,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: VelvetPremiumPaywallDialog.ink.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Premium',
                    style: TextStyle(
                      color: VelvetPremiumPaywallDialog.ink,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
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
