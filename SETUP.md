# Roya - رؤية | دليل الإعداد والتشغيل

## المتطلبات

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

---

## 1. إعداد Backend

### إنشاء قاعدة البيانات

```sql
CREATE DATABASE roya_erp_db;
CREATE USER roya_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE roya_erp_db TO roya_user;
```

### تثبيت المكتبات

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### إعداد ملف البيئة

```bash
cp .env.example .env
```

عدّل `.env`:

```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DATABASE_NAME=roya_erp_db
DATABASE_USER=roya_user
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### تشغيل Migrations

```bash
python manage.py migrate
```

### إنشاء المستخدمين الافتراضيين

```bash
python manage.py create_default_users
```

### تشغيل الخادم

```bash
python manage.py runserver
```

API متاح على: `http://localhost:8000/api/`

---

## 2. إعداد Frontend

```bash
cd frontend
npm install
npm run dev
```

الواجهة متاحة على: `http://localhost:3000`

---

## بيانات الدخول الافتراضية

| المستخدم | كلمة المرور | الدور |
|----------|------------|-------|
| admin | Admin@1234 | مدير النظام |
| manager | Manager@1234 | مدير |
| specialist | Specialist@1234 | أخصائي |
| reception | Reception@1234 | استقبال |

---

## المتغيرات البيئية (Production)

| المتغير | الوصف |
|---------|-------|
| `SECRET_KEY` | مفتاح Django السري |
| `DATABASE_URL` | رابط PostgreSQL (Railway يوفره تلقائياً) |
| `ALLOWED_HOSTS` | النطاقات المسموح بها |
| `CORS_ALLOWED_ORIGINS` | عناوين Frontend المسموح بها |
| `DJANGO_SETTINGS_MODULE` | `rwad_erp.settings.production` |

---

## الصفحات الرئيسية

| المسار | الوصف | الصلاحية |
|--------|-------|---------|
| `/login` | تسجيل الدخول | عام |
| `/dashboard` | لوحة التحكم والإحصاءات | مسجّل |
| `/students` | قائمة المستفيدين | مسجّل |
| `/students/new` | إضافة مستفيد | can_write |
| `/students/{id}` | ملف المستفيد | مسجّل |
| `/students/{id}/edit` | تعديل المستفيد | can_write |
| `/users` | إدارة المستخدمين | admin |
| `/audit-logs` | سجل العمليات | manager+ |

---

## API Endpoints السريع

```
POST   /api/auth/login/
POST   /api/auth/logout/
GET    /api/students/
POST   /api/students/
GET    /api/students/{id}/
PATCH  /api/students/{id}/
DELETE /api/students/{id}/
GET    /api/students/export/
POST   /api/students/import/
GET    /api/students/import/template/
GET    /api/core/audit-logs/
```

للتوثيق الكامل راجع [README.md](README.md).
