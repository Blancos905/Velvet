import '../config/velvet_subscription_guards.dart';

/// Compatibilità: delega a [VelvetSubscriptionGuards] (asset allineato alla SPA).
class VelvetFreePlanPolicy {
  VelvetFreePlanPolicy._();

  static bool isPathAllowed(String path) => VelvetSubscriptionGuards.isPathAllowed(path);

  static Set<String> get allowedNavLabels => VelvetSubscriptionGuards.allowedNavLabels;

  static Set<String> get blockedNavLabels => VelvetSubscriptionGuards.blockedNavLabels;

  static String normalizePath(String path) => VelvetSubscriptionGuards.normalizePath(path);

  static bool usesAccountProfileTheme(String path) =>
      VelvetSubscriptionGuards.usesAccountProfileTheme(path);

  static String premiumPaywallMessage(String featureTitle) =>
      VelvetSubscriptionGuards.premiumPaywallMessage(featureTitle);

  static String paywallFeatureTitleForPath(String path) =>
      VelvetSubscriptionGuards.paywallFeatureTitleForPath(path);
}
