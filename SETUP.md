# Rwad ERP — دليل الإعداد والتشغيل

## المتطلبات الأساسية

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

---

## 1. إعداد Backend

### إنشاء قاعدة البيانات (PostgreSQL)
```sql
CREATE DATABASE rwad_erp_db;
CREATE USER rwad_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE rwad_erp_db TO rwad_user;
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

### إعداد المتغيرات البيئية
```bash
# انسخ ملف المثال
cp .env.example .env
# ثم عدّل .env بمعلومات قاعدة البيانات الصحيحة
```

### تشغيل Migrations
```bash
python manage.py makemigrations accounts
python manage.py makemigrations core
python manage.py makemigrations students
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

الـ API متاح على: http://localhost:8000/api/

---

## 2. إعداد Frontend

```bash
cd frontend
npm install
npm run dev
```

الواجهة متاحة على: http://localhost:3000

---

## بيانات الدخول الافتراضية

| المستخدم   | كلمة المرور   | الدور          |
|-----------|--------------|----------------|
| admin     | Admin@1234   | مدير النظام     |
| manager   | Manager@1234 | مدير            |
| specialist| Specialist@1234 | أخصائي       |
| reception | Reception@1234 | استقبال        |

---

## API Endpoints الرئيسية

### المصادقة
- `POST /api/auth/login/` — تسجيل الدخول
- `POST /api/auth/logout/` — تسجيل الخروج
- `POST /api/auth/token/refresh/` — تجديد التوكن
- `GET/PATCH /api/auth/profile/` — الملف الشخصي

### الطلاب
- `GET /api/students/` — قائمة الطلاب (مع بحث وفلترة)
- `POST /api/students/` — إضافة طالب
- `GET /api/students/{id}/` — تفاصيل طالب
- `PATCH /api/students/{id}/` — تعديل طالب
- `DELETE /api/students/{id}/` — حذف طالب
- `GET /api/students/export/` — تصدير Excel

### أولياء الأمور
- `GET /api/students/{id}/guardians/` — قائمة أولياء الأمور
- `POST /api/students/{id}/guardians/` — إضافة ولي أمر
- `PATCH /api/students/{id}/guardians/{gid}/` — تعديل
- `DELETE /api/students/{id}/guardians/{gid}/` — حذف

### الأسرة
- `GET/POST/PUT /api/students/{id}/family/` — بيانات الأسرة

### المرفقات
- `GET /api/students/{id}/attachments/` — قائمة المرفقات
- `POST /api/students/{id}/attachments/` — رفع مرفق
- `DELETE /api/students/{id}/attachments/{aid}/` — حذف مرفق
