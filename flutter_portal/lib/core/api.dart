import 'dart:convert';
import 'package:http/http.dart' as http;
import 'constants.dart';
import 'storage.dart';

class ApiException implements Exception {
  final String message;
  final int?   statusCode;
  ApiException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class ApiClient {
  static Future<Map<String, String>> _headers({bool auth = true}) async {
    final h = {'Content-Type': 'application/json; charset=utf-8'};
    if (auth) {
      final token = await AppStorage.getToken();
      if (token != null) h['Authorization'] = 'Bearer $token';
    }
    return h;
  }

  static Future<dynamic> get(
    String path, {
    Map<String, String>? params,
  }) async {
    var uri = Uri.parse('$kBaseUrl$path');
    if (params != null && params.isNotEmpty) {
      uri = uri.replace(queryParameters: params);
    }
    final res = await http.get(uri, headers: await _headers()).timeout(
      const Duration(seconds: 15),
    );
    return _handle(res);
  }

  static Future<dynamic> post(
    String path,
    Map<String, dynamic> body, {
    bool auth = true,
  }) async {
    final uri = Uri.parse('$kBaseUrl$path');
    final res = await http
        .post(
          uri,
          headers: await _headers(auth: auth),
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 15));
    return _handle(res);
  }

  static dynamic _handle(http.Response res) {
    final body = utf8.decode(res.bodyBytes);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (body.isEmpty) return null;
      return jsonDecode(body);
    }
    String msg = 'حدث خطأ، يرجى المحاولة لاحقاً';
    try {
      final err = jsonDecode(body) as Map<String, dynamic>;
      msg = (err['error'] ?? err['detail'] ?? msg).toString();
    } catch (_) {}
    throw ApiException(msg, statusCode: res.statusCode);
  }
}
