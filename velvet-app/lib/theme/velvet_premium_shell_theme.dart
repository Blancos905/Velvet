import 'package:flutter/material.dart';

/// Tema shell app — esperienza Premium / pre-login (arancione Velvet).
class VelvetPremiumShellTheme {
  VelvetPremiumShellTheme._();

  static const Color surface = Color(0xFF1C0A06);
  static const Color accent = Color(0xFFF97316);
  static const Color onSurface = Color(0xFFFFF7ED);

  static ThemeData get themeData {
    return ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: accent,
        brightness: Brightness.dark,
        surface: surface,
      ),
      scaffoldBackgroundColor: surface,
      useMaterial3: true,
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: accent),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: accent,
          foregroundColor: surface,
        ),
      ),
    );
  }
}
