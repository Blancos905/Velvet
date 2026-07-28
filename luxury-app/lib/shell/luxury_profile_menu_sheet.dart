import 'package:flutter/material.dart';

import '../theme/luxury_premium_shell_theme.dart';
import 'luxury_profile_menu_item.dart';

/// Menu profilo nativo (bottom sheet) — stesse voci del frontend, solo pulsanti.
class LuxuryProfileMenuSheet extends StatelessWidget {
  const LuxuryProfileMenuSheet({
    super.key,
    required this.items,
    required this.onClose,
    required this.onSelectItem,
  });

  final List<LuxuryProfileMenuItem> items;
  final VoidCallback onClose;
  final void Function(LuxuryProfileMenuItem item) onSelectItem;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.45),
      child: GestureDetector(
        onTap: onClose,
        behavior: HitTestBehavior.opaque,
        child: SafeArea(
          child: Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: GestureDetector(
                onTap: () {},
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: const Color(0xFF1C0A06),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFF0A0A0A), width: 2),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x66000000),
                        blurRadius: 24,
                        offset: Offset(0, -4),
                      ),
                    ],
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 14, 12, 12),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            const Expanded(
                              child: Text(
                                'Profilo',
                                style: TextStyle(
                                  color: Color(0xFFFFF7ED),
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                            IconButton(
                              onPressed: onClose,
                              icon: const Icon(Icons.close, color: Color(0xFFFFF7ED)),
                              tooltip: 'Chiudi',
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ...items.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: FilledButton(
                              onPressed: () => onSelectItem(item),
                              style: FilledButton.styleFrom(
                                backgroundColor: item.logout
                                    ? const Color(0xFF1A1A1A)
                                    : LuxuryPremiumShellTheme.accent,
                                foregroundColor: item.logout
                                    ? const Color(0xFFFECACA)
                                    : LuxuryPremiumShellTheme.surface,
                                minimumSize: const Size.fromHeight(48),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(999),
                                  side: const BorderSide(
                                    color: Color(0xFF0A0A0A),
                                    width: 2,
                                  ),
                                ),
                              ),
                              child: Text(
                                item.label,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
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
    );
  }
}
