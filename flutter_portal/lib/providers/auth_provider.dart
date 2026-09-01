import 'package:flutter/foundation.dart';
import '../core/api.dart';
import '../core/storage.dart';
import '../models/models.dart';

class AuthProvider extends ChangeNotifier {
  GuardianModel? _guardian;
  StudentModel?  _student;
  bool           _loggedIn  = false;
  bool           _loading   = false;
  String?        _error;

  bool           get isLoggedIn => _loggedIn;
  bool           get isLoading  => _loading;
  String?        get error      => _error;
  GuardianModel? get guardian   => _guardian;
  StudentModel?  get student    => _student;

  Future<void> loadFromStorage() async {
    final token        = await AppStorage.getToken();
    if (token == null) return;
    final guardianJson = await AppStorage.getGuardian();
    final studentJson  = await AppStorage.getStudent();
    if (guardianJson != null && studentJson != null) {
      _guardian = GuardianModel.fromJson(guardianJson);
      _student  = StudentModel.fromJson(studentJson);
      _loggedIn = true;
      notifyListeners();
    }
  }

  Future<void> login(String phone, String fileNumber) async {
    _loading = true;
    _error   = null;
    notifyListeners();

    try {
      final data = await ApiClient.post(
        '/portal/login/',
        {'phone': phone, 'file_number': fileNumber},
        auth: false,
      );

      await AppStorage.saveAuth(
        token:    data['token'] as String,
        guardian: data['guardian'] as Map<String, dynamic>,
        student:  data['student']  as Map<String, dynamic>,
      );

      _guardian = GuardianModel.fromJson(data['guardian'] as Map<String, dynamic>);
      _student  = StudentModel.fromJson(data['student']  as Map<String, dynamic>);
      _loggedIn = true;
    } on ApiException catch (e) {
      _error = e.message;
    } catch (_) {
      _error = 'تعذّر الاتصال بالخادم، تحقق من الإنترنت';
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    try {
      await ApiClient.post('/portal/logout/', {});
    } catch (_) {}
    await AppStorage.clear();
    _loggedIn = false;
    _guardian = null;
    _student  = null;
    notifyListeners();
  }
}
