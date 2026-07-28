import 'package:flutter_test/flutter_test.dart';
import 'package:luxury_app/config/luxury_app_config.dart';

void main() {
  test('homeUrl combina base e path', () {
    expect(LuxuryAppConfig.webBaseUrl, isNotEmpty);
    expect(LuxuryAppConfig.homeUrl, contains(LuxuryAppConfig.webBaseUrl.replaceAll(RegExp(r'/+$'), '')));
  });
}
