import 'package:flutter/material.dart';

/// Tema shell app — piano Free (Navy / Dark Slate Blue).
class LuxuryFreeTheme {
  LuxuryFreeTheme._();

  static const Color primary = Color(0xFF1E3A5F);
  static const Color primaryLight = Color(0xFF3B5B8A);
  static const Color surface = Color(0xFF0F172A);
  static const Color surfacePanel = Color(0xFF1E293B);
  static const Color accent = Color(0xFF60A5FA);
  static const Color onSurface = Color(0xFFE2E8F0);

  static ThemeData get themeData {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.dark,
      primary: primaryLight,
      secondary: accent,
      surface: surface,
    );
    return ThemeData(
      colorScheme: scheme,
      scaffoldBackgroundColor: surface,
      useMaterial3: true,
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: accent),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: primaryLight,
          foregroundColor: onSurface,
        ),
      ),
      snackBarTheme: const SnackBarThemeData(
        backgroundColor: surfacePanel,
        contentTextStyle: TextStyle(color: onSurface),
      ),
    );
  }

  static Color shellBackground(bool loading) => surface;
  static Color spinnerColor() => accent;
}
