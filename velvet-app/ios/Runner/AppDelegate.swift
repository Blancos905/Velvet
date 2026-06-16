import Flutter
import UIKit
import WebKit

private func velvetKeepWebViewKeyboardVisible(in view: UIView) {
  if let webView = view as? WKWebView {
    webView.scrollView.keyboardDismissMode = .none
  }
  for subview in view.subviews {
    velvetKeepWebViewKeyboardVisible(in: subview)
  }
}

private func velvetApplyKeepWebViewKeyboardVisible() {
  for scene in UIApplication.shared.connectedScenes {
    guard let windowScene = scene as? UIWindowScene else { continue }
    for window in windowScene.windows {
      velvetKeepWebViewKeyboardVisible(in: window)
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
      name: "it.saloniluxury.velvet_app/webview_keyboard",
      binaryMessenger: engineBridge.applicationRegistrar.messenger()
    )
    keyboardChannel.setMethodCallHandler { call, result in
      switch call.method {
      case "keepVisibleOnScroll":
        DispatchQueue.main.async {
          velvetApplyKeepWebViewKeyboardVisible()
          result(nil)
        }
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }
}
