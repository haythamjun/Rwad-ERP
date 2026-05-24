# Rwad ERP — نظام إدارة ذوي الإعاقة

نظام ERP متكامل لإدارة طلاب ذوي الإعاقة، مبني بتقنيات حديثة ويدعم اللغة العربية بالكامل.

---

## هيكل المشروع

```
Rwad_ERP - LAST/
├── backend/                    ← Django REST API
│   ├── rwad_erp/              ← إعدادات المشروع
│   │   ├── settings/base.py   ← إعدادات Django
│   │   ├── urls.py            ← مسارات الـ API
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/
│   │   ├── accounts/          ← المستخدمون والصلاحيات
│   │   ├── students/          ← إدارة الطلاب
│   │   └── core/              ← مرافق عامة وـ Audit Logging
│   ├── manage.py
│   ├── requirements.txt
│   └── .env
│
└── frontend/                   ← Next.js Web App
    └── src/
        ├── app/               ← الصفحات (App Router)
        │   ├── login/
        │   ├── dashboard/
        │   ├── students/
        │   └── users/
        ├── components/        ← المكونات القابلة لإعادة الاستخدام
        ├── lib/               ← API client ومرافق
        ├── store/             ← Zustand state
        └── types/             ← TypeScript interfaces
```

---

## التقنيات المستخدمة

### Backend

| العنصر | التقنية |
|--------|---------|
| اللغة | Python 3.11+ |
| الإطار | Django 4.2.13 |
| REST API | Django REST Framework 3.15.2 |
| قاعدة البيانات | PostgreSQL 15+ |
| المصادقة | JWT — djangorestframework-simplejwt 5.3.1 |
| CORS | django-cors-headers 4.3.1 |
| تصدير Excel | openpyxl 3.1.5 |
| توليد PDF | reportlab 4.2.2 |
| معالجة الصور | Pillow 10.4.0 |
| إدارة الملفات | django-storages 1.14.3 |
| المنفذ | http://localhost:8000 |

### Frontend

| العنصر | التقنية |
|--------|---------|
| اللغة | TypeScript 5.5.3 |
| الإطار | Next.js 15.3.3 (App Router) |
| مكتبة الواجهة | React 18.3.1 |
| التصميم | Tailwind CSS 3.4.6 |
| State Management | Zustand 4.5.4 + TanStack Query 5.51.1 |
| النماذج | React Hook Form 7.52.1 + Zod 3.23.8 |
| HTTP Client | Axios 1.7.2 مع JWT interceptors |
| الأيقونات | Lucide React |
| الإشعارات | React Hot Toast |
| المنفذ | http://localhost:3000 |

---

## قاعدة البيانات

**الحالة: تم إنشاؤها وتطبيق جميع الـ Migrations**

```
Database:  rwad_erp_db
User:      postgres
Password:  postgres
Host:      localhost
Port:      5432
```

### الجداول الرئيسية

| التطبيق | الـ Migrations | الحالة |
|---------|---------------|--------|
| accounts | 0001_initial | مكتمل |
| students | 0001_initial, 0002_alter | مكتمل |
| core | 0001_initial | مكتمل |
| auth / admin / sessions | جداول Django الافتراضية | مكتمل |

### النماذج الرئيسية

#### العلاقة بين الجداول

```
Student (1)
  ├── Guardian (many)          ← أولياء أمور متعددين
  ├── FamilyInfo (1)           ← أسرة واحدة فقط
  └── StudentAttachment (many) ← مرفقات متعددة
```

---

#### Student — الطالب

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `file_number` | CharField (unique) | رقم الملف (يُولَّد تلقائياً: RW-YYYY-XXXX) |
| `registration_date` | DateField | تاريخ التسجيل |
| `full_name` | CharField | الاسم الكامل |
| `national_id` | CharField (unique) | رقم الهوية / الإقامة |
| `date_of_birth` | DateField | تاريخ الميلاد |
| `gender` | CharField | الجنس (ذكر / أنثى) |
| `nationality` | CharField | الجنسية |
| `photo` | ImageField | صورة المستفيد |
| `disability_type` | CharField | نوع الإعاقة (11 خيار) |
| `disability_degree` | CharField | درجة الإعاقة (بسيطة / متوسطة / شديدة / شديدة جداً) |
| `diagnosis` | TextField | التشخيص التفصيلي |
| `educational_level` | CharField | المستوى التعليمي |
| `school_name` | CharField | اسم المدرسة |
| `grade` | CharField | الصف / المرحلة |
| `referral_source` | CharField | جهة الإحالة |
| `status` | CharField | الحالة (معلّق / نشط / غير نشط / متخرج / موقوف / محوّل) |
| `notes` | TextField | ملاحظات |
| `created_by` | FK → User | أُضيف بواسطة |
| `created_at` | DateTimeField | تاريخ الإنشاء |

---

#### Guardian — ولي الأمر

مرتبط بالطالب بـ ForeignKey — طالب واحد يمكن أن يكون له أكثر من ولي أمر.

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `student` | FK → Student | الطالب المرتبط |
| `full_name` | CharField | اسم ولي الأمر |
| `relationship` | CharField | صلة القرابة (أب / أم / أخ / أخت / جد / جدة / عم / عمة / أخرى) |
| `national_id` | CharField | رقم الهوية |
| `phone` | CharField | رقم الجوال |
| `phone_alt` | CharField | رقم جوال إضافي |
| `email` | EmailField | البريد الإلكتروني |
| `address` | TextField | العنوان |
| `is_primary_contact` | BooleanField | جهة التواصل الرئيسية |
| `notes` | TextField | ملاحظات |

---

#### FamilyInfo — بيانات الأسرة

مرتبط بالطالب بـ OneToOneField — أسرة واحدة لكل طالب.

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `student` | OneToOne → Student | الطالب المرتبط |
| `family_size` | PositiveIntegerField | عدد أفراد الأسرة |
| `sibling_order` | PositiveIntegerField | ترتيب المستفيد بين إخوته |
| `parents_status` | CharField | حالة الوالدين (متزوجان / مطلقان / الأب متوفى / الأم متوفاة / كلاهما / منفصلان) |
| `income_range` | CharField | الدخل الشهري التقريبي (5 شرائح) |
| `monthly_income` | PositiveIntegerField | الدخل الشهري بالرقم |
| `housing_type` | CharField | نوع السكن (ملك / إيجار / أقارب / حكومي / أخرى) |
| `other_special_needs` | BooleanField | يوجد أفراد آخرون بحاجات خاصة في الأسرة |
| `social_notes` | TextField | ملاحظات اجتماعية |

---

#### StudentAttachment — المرفقات

مرتبط بالطالب بـ ForeignKey — طالب واحد يمكن أن يكون له مرفقات متعددة.

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `student` | FK → Student | الطالب المرتبط |
| `attachment_type` | CharField | نوع المرفق (هوية / شهادة ميلاد / تقرير طبي / تقرير نفسي / بطاقة إعاقة / خطاب إحالة / أخرى) |
| `file` | FileField | الملف المرفق |
| `name` | CharField | اسم المرفق |
| `uploaded_by` | FK → User | رُفع بواسطة |
| `created_at` | DateTimeField | تاريخ الرفع |

---

#### User — المستخدم

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `username` | CharField | اسم المستخدم |
| `role` | CharField | الدور (admin / manager / specialist / reception / viewer) |
| `avatar` | ImageField | الصورة الشخصية |
| `phone` | CharField | رقم الجوال |

---

## الأدوار والصلاحيات

| الدور | الوصف |
|-------|-------|
| admin | مدير النظام — صلاحيات كاملة |
| manager | مدير — إدارة الطلاب والتقارير |
| specialist | أخصائي — إدارة ملفات الطلاب |
| reception | استقبال — تسجيل الطلاب |
| viewer | مشاهد فقط |

---

## المتطلبات الأساسية للتشغيل

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

---

## إعداد وتشغيل المشروع

### 1. إعداد Backend

```bash
cd backend

# إنشاء البيئة الافتراضية
python -m venv venv

# تفعيل البيئة (Windows)
venv\Scripts\activate

# تفعيل البيئة (Linux/Mac)
source venv/bin/activate

# تثبيت المكتبات
pip install -r requirements.txt
```

### 2. إعداد قاعدة البيانات (PostgreSQL)

```sql
CREATE DATABASE rwad_erp_db;
CREATE USER rwad_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE rwad_erp_db TO rwad_user;
```

### 3. إعداد ملف البيئة

```bash
cp .env.example .env
```

ثم عدّل `.env` بالقيم الصحيحة:

```env
SECRET_KEY=django-insecure-rwad-erp-dev-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

DATABASE_NAME=rwad_erp_db
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

MEDIA_ROOT=media/
MEDIA_URL=/media/
```

### 4. تشغيل الـ Migrations

```bash
python manage.py makemigrations accounts
python manage.py makemigrations core
python manage.py makemigrations students
python manage.py migrate
```

### 5. إنشاء المستخدمين الافتراضيين

```bash
python manage.py create_default_users
```

### 6. تشغيل Backend

```bash
python manage.py runserver
```

API متاح على: http://localhost:8000/api/

---

### 7. إعداد وتشغيل Frontend

```bash
cd frontend
npm install
npm run dev
```

الواجهة متاحة على: http://localhost:3000

---

## بيانات الدخول الافتراضية

| المستخدم | كلمة المرور | الدور |
|----------|------------|-------|
| admin | Admin@1234 | مدير النظام |
| manager | Manager@1234 | مدير |
| specialist | Specialist@1234 | أخصائي |
| reception | Reception@1234 | استقبال |

---

## API Endpoints الرئيسية

### المصادقة

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| POST | `/api/auth/login/` | تسجيل الدخول |
| POST | `/api/auth/logout/` | تسجيل الخروج |
| POST | `/api/auth/token/refresh/` | تجديد التوكن |
| GET/PATCH | `/api/auth/profile/` | الملف الشخصي |

### الطلاب

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `/api/students/` | قائمة الطلاب (مع بحث وفلترة) |
| POST | `/api/students/` | إضافة طالب جديد |
| GET | `/api/students/{id}/` | تفاصيل طالب |
| PATCH | `/api/students/{id}/` | تعديل طالب |
| DELETE | `/api/students/{id}/` | حذف طالب |
| GET | `/api/students/export/` | تصدير Excel |

### أولياء الأمور

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `/api/students/{id}/guardians/` | قائمة أولياء الأمور |
| POST | `/api/students/{id}/guardians/` | إضافة ولي أمر |
| PATCH | `/api/students/{id}/guardians/{gid}/` | تعديل ولي أمر |
| DELETE | `/api/students/{id}/guardians/{gid}/` | حذف ولي أمر |

### بيانات الأسرة

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET/POST/PUT | `/api/students/{id}/family/` | بيانات الأسرة |

### المرفقات

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `/api/students/{id}/attachments/` | قائمة المرفقات |
| POST | `/api/students/{id}/attachments/` | رفع مرفق |
| DELETE | `/api/students/{id}/attachments/{aid}/` | حذف مرفق |

---

## إعدادات الـ JWT

| الإعداد | القيمة |
|---------|--------|
| Access Token | 8 ساعات |
| Refresh Token | 7 أيام |
| Algorithm | HS256 |

---

## مستقبل تطبيق الجوال

البنية الحالية **مهيأة لدعم الجوال** لأن:

- الـ Backend منفصل تماماً كـ REST API — أي تطبيق جوال يمكنه الاتصال به مباشرة
- يدعم CORS مما يسهّل الاتصال من تطبيقات خارجية
- JWT Authentication يعمل بسلاسة مع تطبيقات الجوال

| الخيار | الوصف | الجهد |
|--------|-------|-------|
| PWA | تحويل الموقع الحالي لتطبيق جوال | منخفض جداً |
| React Native | الأقرب للـ frontend الحالي (TypeScript/React) | متوسط |
| Flutter | أداء عالي، لغة Dart | متوسط-عالي |

---

## الإعدادات العامة

- اللغة: العربية (ar)
- المنطقة الزمنية: Asia/Riyadh
- الحد الأقصى لرفع الملفات: 10 MB
- الصفحات: 20 عنصر في الصفحة
