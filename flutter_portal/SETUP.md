# رؤية — Guardian Portal (Flutter)

## Quick Start

```bash
# 1. Create the Flutter project shell
flutter create . --org com.roya --project-name roya_guardian_portal

# 2. Install dependencies
flutter pub get

# 3. Run on device / emulator
flutter run
```

> The `lib/` directory and `pubspec.yaml` are already written — `flutter create .`
> only generates the platform folders (android/, ios/, etc.) without overwriting them.

## Android — internet permission

In `android/app/src/main/AndroidManifest.xml`, add inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
```

(Flutter projects created with `flutter create` include this by default in recent SDK versions.)

## Screens

| Screen | Route |
|--------|-------|
| Login | phone + file number → `POST /api/portal/login/` |
| Dashboard | greeting + student card + attendance stats + recent 10 records |
| Attendance | month picker + summary bar + full record list |
| Profile | student info + guardian info + logout |

## Backend endpoints used

```
POST /api/portal/login/
GET  /api/portal/dashboard/
GET  /api/portal/attendance/?month=YYYY-MM
POST /api/portal/logout/
```

All authenticated endpoints require: `Authorization: Bearer <token>`
