import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

/// Android WebView non apre galleria o file senza questo callback.
/// iOS usa il selettore nativo di WKWebView su `input type="file"`.
Future<List<String>> luxuryAndroidWebViewFileSelector(FileSelectorParams params) async {
  try {
    final multiple = params.mode == FileSelectorMode.openMultiple;
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: multiple,
      type: _prefersImages(params.acceptTypes) ? FileType.image : FileType.any,
    );
    if (result == null) {
      return const [];
    }
    final uris = <String>[];
    for (final file in result.files) {
      final path = file.path;
      if (path == null || path.isEmpty) {
        continue;
      }
      uris.add(_uriForWebView(path));
    }
    return uris;
  } catch (e, st) {
    debugPrint('LuxuryWebView file selector: $e\n$st');
    return const [];
  }
}

bool _prefersImages(List<String> acceptTypes) {
  final normalized = acceptTypes.map((type) => type.trim().toLowerCase()).where((type) => type.isNotEmpty);
  final types = normalized.toList();
  if (types.isEmpty) {
    return false;
  }
  return types.every((type) => type == 'image/*' || type.startsWith('image/'));
}

String _uriForWebView(String path) {
  if (path.startsWith('content://') || path.startsWith('file://')) {
    return path;
  }
  return Uri.file(path).toString();
}
