import 'package:flutter/material.dart';

import '../config/velvet_app_config.dart';
import '../dev/velvet_dev_stack_gate.dart';
import '../session/velvet_session_controller.dart';
import '../theme/velvet_free_theme.dart';
import '../theme/velvet_premium_shell_theme.dart';
import 'velvet_web_shell.dart';

/// Applica tema e vincoli piano Free in base alla sessione WebView.
class FreeAccountWrapper extends StatefulWidget {
  const FreeAccountWrapper({super.key});

  @override
  State<FreeAccountWrapper> createState() => _FreeAccountWrapperState();
}

class _FreeAccountWrapperState extends State<FreeAccountWrapper> {
  late final VelvetSessionController _sessionController;

  @override
  void initState() {
    super.initState();
    _sessionController = VelvetSessionController();
  }

  @override
  void dispose() {
    _sessionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _sessionController,
      builder: (context, _) {
        final isFree = _sessionController.isFreeSalonOwner;
        final theme =
            isFree ? VelvetFreeTheme.themeData : VelvetPremiumShellTheme.themeData;

        return VelvetSessionScope(
          controller: _sessionController,
          child: AnimatedTheme(
            duration: const Duration(milliseconds: 320),
            data: theme,
            child: MaterialApp(
              title: 'SaloniLuxury',
              debugShowCheckedModeBanner: VelvetAppConfig.isLocalDev,
              theme: theme,
              home: VelvetDevStackGate(
                child: VelvetWebShell(sessionController: _sessionController),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Espone il controller sessione ai discendenti della shell.
class VelvetSessionScope extends InheritedWidget {
  const VelvetSessionScope({
    super.key,
    required this.controller,
    required super.child,
  });

  final VelvetSessionController controller;

  static VelvetSessionController of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<VelvetSessionScope>();
    assert(scope != null, 'VelvetSessionScope non trovato');
    return scope!.controller;
  }

  @override
  bool updateShouldNotify(VelvetSessionScope oldWidget) {
    return oldWidget.controller != controller;
  }
}
