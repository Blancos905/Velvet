/// CSS funzionale piano Free titolare in app — stesso look Premium (arancio), solo vincoli UI.
const String luxuryAppFreeOwnerFunctionalCss =
    '''
html.luxury-native-app-free a.luxury-app-free-nav-dupe-hidden,
html.luxury-native-app-free .luxury-app-free-nav-source-hidden {
  display: none !important;
}

html.luxury-native-app-free #luxury-app-free-owner-nav-scroll {
  display: grid !important;
  visibility: visible !important;
}

html.luxury-native-app-free.luxury-native-app-free-servizi .luxury-salon-services-photo-panel,
html.luxury-native-app-free.luxury-native-app-free-servizi .luxury-brand-service-photo-row,
html.luxury-native-app-free.luxury-native-app-free-servizi .luxury-salon-services-list__crop-controls,
html.luxury-native-app-free.luxury-native-app-free-servizi input.luxury-salon-services-hidden-file {
  display: none !important;
  pointer-events: none !important;
}
''';
