import 'package:flutter_test/flutter_test.dart';
import 'package:velvet_app/config/velvet_app_config.dart';

void main() {
  test('homeUrl combina base e path', () {
    expect(VelvetAppConfig.webBaseUrl, isNotEmpty);
    expect(VelvetAppConfig.homeUrl, contains(VelvetAppConfig.webBaseUrl.replaceAll(RegExp(r'/+$'), '')));
  });
}
