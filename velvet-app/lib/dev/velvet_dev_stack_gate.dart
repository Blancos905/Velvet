import 'dart:async';

import 'package:flutter/material.dart';

import '../config/velvet_app_config.dart';
import '../theme/velvet_premium_shell_theme.dart';
import 'velvet_dev_stack_health.dart';

/// Saltato se gli script dev hanno già verificato la catena (`--dart-define=VELVET_STACK_READY=true`).
const _stackReadyFromScript = bool.fromEnvironment('VELVET_STACK_READY');

/// Bypass manuale (es. iPhone fisico con permesso Rete locale appena concesso).
const _skipDevGate = bool.fromEnvironment('VELVET_SKIP_DEV_GATE');

/// In dev locale attende Vite + Spring prima di aprire la WebView (evita API «mute»).
class VelvetDevStackGate extends StatefulWidget {
  const VelvetDevStackGate({super.key, required this.child});

  final Widget child;

  @override
  State<VelvetDevStackGate> createState() => _VelvetDevStackGateState();
}

class _VelvetDevStackGateState extends State<VelvetDevStackGate> {
  VelvetDevStackIssue? _issue;
  var _checking = true;
  var _forceOpen = false;
  Timer? _pollTimer;

  bool get _bypassGate =>
      _stackReadyFromScript ||
      _skipDevGate ||
      _forceOpen ||
      VelvetAppConfig.isLanDevHost;

  @override
  void initState() {
    super.initState();
    if (_bypassGate) {
      _issue = VelvetDevStackIssue.ok;
      _checking = false;
      return;
    }
    unawaited(_probe());
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (_) => unawaited(_probe()));
  }

  Future<void> _probe() async {
    final next = await probeVelvetDevStack();
    if (!mounted) {
      return;
    }
    setState(() {
      _issue = next;
      _checking = false;
    });
    if (next == VelvetDevStackIssue.ok) {
      _pollTimer?.cancel();
      _pollTimer = null;
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!VelvetAppConfig.isLocalDev || _issue == VelvetDevStackIssue.ok) {
      return widget.child;
    }

    if (_issue == null) {
      return Scaffold(
        backgroundColor: VelvetPremiumShellTheme.surface,
        body: Center(
          child: CircularProgressIndicator(color: VelvetPremiumShellTheme.accent),
        ),
      );
    }

    final base = VelvetAppConfig.webBaseUrl.replaceAll(RegExp(r'/+$'), '');
    final (title, body, commands) = switch (_issue!) {
      VelvetDevStackIssue.viteDown => (
          'Frontend dev non raggiungibile',
          'Vite non risponde su $base.\n'
              'Senza il dev server la WebView non può caricare la UI né inoltrare le API.',
          'cd velvet-frontend && npm run dev:local\n'
              '# oppure dalla root:\n'
              './scripts/dev-app-ios.sh',
        ),
      VelvetDevStackIssue.backendDown => (
          'Backend Spring non raggiungibile',
          'Vite è su $base ma il proxy /api non raggiunge Spring Boot su :8080.\n'
              'Le chiamate API dall’app falliscono con ECONNREFUSED.',
          'cd velvet && ./mvnw spring-boot:run -Dmaven.test.skip=true\n'
              '# oppure dalla root:\n'
              './scripts/dev-backend.sh\n'
              './scripts/dev-app-ios.sh',
        ),
      VelvetDevStackIssue.ok => ('', '', ''),
    };

    return Scaffold(
      backgroundColor: VelvetPremiumShellTheme.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 24),
              Text(
                title,
                style: const TextStyle(
                  color: VelvetPremiumShellTheme.onSurface,
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                body,
                style: TextStyle(
                  color: VelvetPremiumShellTheme.onSurface.withValues(alpha: 0.85),
                  fontSize: 15,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 20),
              DecoratedBox(
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: SelectableText(
                    commands,
                    style: const TextStyle(
                      fontFamily: 'Menlo',
                      fontSize: 12,
                      color: Color(0xFFE8E8E8),
                      height: 1.5,
                    ),
                  ),
                ),
              ),
              const Spacer(),
              if (_checking)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Text(
                      'Verifica connessione…',
                      style: TextStyle(color: VelvetPremiumShellTheme.onSurface),
                    ),
                  ),
                ),
              FilledButton(
                onPressed: () {
                  setState(() => _checking = true);
                  unawaited(_probe());
                },
                style: FilledButton.styleFrom(
                  backgroundColor: VelvetPremiumShellTheme.accent,
                  foregroundColor: VelvetPremiumShellTheme.surface,
                ),
                child: const Text('Riprova'),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: () => setState(() => _forceOpen = true),
                child: Text(
                  'Apri comunque (iPhone fisico / Rete locale)',
                  style: TextStyle(
                    color: VelvetPremiumShellTheme.onSurface.withValues(alpha: 0.9),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
