import '../auth/salon_plan_tier.dart';

/// Stato sessione salone rilevato dalla WebView (JWT + API `/me/salon`).
class VelvetSalonSession {
  const VelvetSalonSession({
    this.isAuthenticated = false,
    this.isSalonOwner = false,
    this.isSalonStaff = false,
    this.isVelvetSuperAdmin = false,
    this.planTier,
  });

  final bool isAuthenticated;
  final bool isSalonOwner;
  final bool isSalonStaff;
  final bool isVelvetSuperAdmin;
  final SalonPlanTier? planTier;

  /// Titolare salone con piano Free (`BASE`) — vincoli UI solo in app mobile.
  bool get isFreeSalonOwner =>
      isAuthenticated &&
      isSalonOwner &&
      !isVelvetSuperAdmin &&
      planTier == SalonPlanTier.base;

  static const VelvetSalonSession guest = VelvetSalonSession();

  VelvetSalonSession copyWith({
    bool? isAuthenticated,
    bool? isSalonOwner,
    bool? isSalonStaff,
    bool? isVelvetSuperAdmin,
    SalonPlanTier? planTier,
    bool clearPlanTier = false,
  }) {
    return VelvetSalonSession(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isSalonOwner: isSalonOwner ?? this.isSalonOwner,
      isSalonStaff: isSalonStaff ?? this.isSalonStaff,
      isVelvetSuperAdmin: isVelvetSuperAdmin ?? this.isVelvetSuperAdmin,
      planTier: clearPlanTier ? null : (planTier ?? this.planTier),
    );
  }

  @override
  bool operator ==(Object other) {
    return other is VelvetSalonSession &&
        other.isAuthenticated == isAuthenticated &&
        other.isSalonOwner == isSalonOwner &&
        other.isSalonStaff == isSalonStaff &&
        other.isVelvetSuperAdmin == isVelvetSuperAdmin &&
        other.planTier == planTier;
  }

  @override
  int get hashCode => Object.hash(
        isAuthenticated,
        isSalonOwner,
        isSalonStaff,
        isVelvetSuperAdmin,
        planTier,
      );
}
