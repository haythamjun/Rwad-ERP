import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class AppStorage {
  static const _kToken        = 'guardian_token';
  static const _kGuardianJson = 'guardian_json';
  static const _kStudentJson  = 'student_json';

  static Future<void> saveAuth({
    required String token,
    required Map<String, dynamic> guardian,
    required Map<String, dynamic> student,
  }) async {
    final p = await SharedPreferences.getInstance();
    await p.setString(_kToken, token);
    await p.setString(_kGuardianJson, jsonEncode(guardian));
    await p.setString(_kStudentJson, jsonEncode(student));
  }

  static Future<String?> getToken() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_kToken);
  }

  static Future<Map<String, dynamic>?> getGuardian() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_kGuardianJson);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>?> getStudent() async {
    final p = await SharedPreferences.getInstance();
    final raw = p.getString(_kStudentJson);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  static Future<void> clear() async {
    final p = await SharedPreferences.getInstance();
    await p.clear();
  }
}
