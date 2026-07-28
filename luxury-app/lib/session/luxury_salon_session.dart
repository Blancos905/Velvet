import '../auth/salon_plan_tier.dart';

/// Stato sessione salone rilevato dalla WebView (JWT + API `/me/salon`).
class LuxurySalonSession {
  const LuxurySalonSession({
    this.isAuthenticated = false,
    this.isSalonOwner = false,
    this.isSalonStaff = false,
    this.isLuxurySuperAdmin = false,
    this.planTier,
  });

  final bool isAuthenticated;
  final bool isSalonOwner;
  final bool isSalonStaff;
  final bool isLuxurySuperAdmin;
  final SalonPlanTier? planTier;

  /// Titolare salone con piano Free (`BASE`) — vincoli UI solo in app mobile.
  bool get isFreeSalonOwner =>
      isAuthenticated &&
      isSalonOwner &&
      !isLuxurySuperAdmin &&
      planTier == SalonPlanTier.base;

  static const LuxurySalonSession guest = LuxurySalonSession();

  LuxurySalonSession copyWith({
    bool? isAuthenticated,
    bool? isSalonOwner,
    bool? isSalonStaff,
    bool? isLuxurySuperAdmin,
    SalonPlanTier? planTier,
    bool clearPlanTier = false,
  }) {
    return LuxurySalonSession(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isSalonOwner: isSalonOwner ?? this.isSalonOwner,
      isSalonStaff: isSalonStaff ?? this.isSalonStaff,
      isLuxurySuperAdmin: isLuxurySuperAdmin ?? this.isLuxurySuperAdmin,
      planTier: clearPlanTier ? null : (planTier ?? this.planTier),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is LuxurySalonSession &&
        other.isAuthenticated == isAuthenticated &&
        other.isSalonOwner == isSalonOwner &&
        other.isSalonStaff == isSalonStaff &&
        other.isLuxurySuperAdmin == isLuxurySuperAdmin &&
        other.planTier == planTier;
  }

  @override
  int get hashCode => Object.hash(
        isAuthenticated,
        isSalonOwner,
        isSalonStaff,
        isLuxurySuperAdmin,
        planTier,
      );
}
