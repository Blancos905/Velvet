import '../config/luxury_subscription_guards.dart';

/// Compatibilità: delega a [LuxurySubscriptionGuards] (asset allineato alla SPA).
class LuxuryFreePlanPolicy {
  LuxuryFreePlanPolicy._();

  static bool isPathAllowed(String path) => LuxurySubscriptionGuards.isPathAllowed(path);

  static Set<String> get allowedNavLabels => LuxurySubscriptionGuards.allowedNavLabels;

  static Set<String> get blockedNavLabels => LuxurySubscriptionGuards.blockedNavLabels;

  static String normalizePath(String path) => LuxurySubscriptionGuards.normalizePath(path);

  static bool usesAccountProfileTheme(String path) =>
      LuxurySubscriptionGuards.usesAccountProfileTheme(path);

  static String premiumPaywallMessage(String featureTitle) =>
      LuxurySubscriptionGuards.premiumPaywallMessage(featureTitle);

  static String paywallFeatureTitleForPath(String path) =>
      LuxurySubscriptionGuards.paywallFeatureTitleForPath(path);
}
