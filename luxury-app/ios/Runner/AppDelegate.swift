import Flutter
import UIKit
import WebKit

private func luxuryKeepWebViewKeyboardVisible(in view: UIView) {
  if let webView = view as? WKWebView {
    webView.scrollView.keyboardDismissMode = .none
  }
  for subview in view.subviews {
    luxuryKeepWebViewKeyboardVisible(in: subview)
  }
}

private func luxuryApplyKeepWebViewKeyboardVisible() {
  for scene in UIApplication.shared.connectedScenes {
    guard let windowScene = scene as? UIWindowScene else { continue }
    for window in windowScene.windows {
      luxuryKeepWebViewKeyboardVisible(in: window)
    }
  }
}

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    // Richiesto da firebase_messaging: senza registrazione APNs getToken() fallisce su iOS.
    application.registerForRemoteNotifications()
    return result
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)

    let keyboardChannel = FlutterMethodChannel(
      name: "it.saloniluxury.luxury_app/webview_keyboard",
      binaryMessenger: engineBridge.applicationRegistrar.messenger()
    )
    keyboardChannel.setMethodCallHandler { call, result in
      switch call.method {
      case "keepVisibleOnScroll":
        DispatchQueue.main.async {
          luxuryApplyKeepWebViewKeyboardVisible()
          result(nil)
        }
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }
}
