import 'package:flutter/material.dart';

import '../config/luxury_app_config.dart';
import '../dev/luxury_dev_stack_gate.dart';
import '../session/luxury_session_controller.dart';
import '../theme/luxury_premium_shell_theme.dart';
import 'luxury_web_shell.dart';

/// Shell app: tema Premium unificato; vincoli piano Free solo via WebView (paywall, path, nav).
class FreeAccountWrapper extends StatefulWidget {
  const FreeAccountWrapper({super.key});

  @override
  State<FreeAccountWrapper> createState() => _FreeAccountWrapperState();
}

class _FreeAccountWrapperState extends State<FreeAccountWrapper> {
  late final LuxurySessionController _sessionController;

  @override
  void initState() {
    super.initState();
    _sessionController = LuxurySessionController();
  }

  @override
  void dispose() {
    _sessionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return LuxurySessionScope(
      controller: _sessionController,
      child: MaterialApp(
        title: 'SaloniLuxury',
        debugShowCheckedModeBanner: LuxuryAppConfig.isLocalDev,
        theme: LuxuryPremiumShellTheme.themeData,
        home: LuxuryDevStackGate(
          child: LuxuryWebShell(sessionController: _sessionController),
        ),
      ),
    );
  }
}

/// Espone il controller sessione ai discendenti della shell.
class LuxurySessionScope extends InheritedWidget {
  const LuxurySessionScope({
    super.key,
    required this.controller,
    required super.child,
  });

  final LuxurySessionController controller;

  static LuxurySessionController of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<LuxurySessionScope>();
    assert(scope != null, 'LuxurySessionScope non trovato');
    return scope!.controller;
  }

  @override
  bool updateShouldNotify(LuxurySessionScope oldWidget) {
    return oldWidget.controller != controller;
  }
}
