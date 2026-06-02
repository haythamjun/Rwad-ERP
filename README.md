# Roya - رؤية | نظام إدارة مركز التأهيل

نظام ERP متكامل لإدارة ملفات ذوي الإعاقة، مبني بتقنيات حديثة ويدعم اللغة العربية بالكامل.

---

## هيكل المشروع

```
Roya ERP/
├── backend/                    ← Django REST API
│   ├── rwad_erp/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   └── urls.py
│   ├── apps/
│   │   ├── accounts/           ← المستخدمون والصلاحيات
│   │   ├── students/           ← إدارة المستفيدين
│   │   └── core/               ← سجلات المراجعة والمرافق
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/                   ← Next.js Web App
    └── src/
        ├── app/                ← الصفحات (App Router)
        ├── components/         ← المكونات
        ├── lib/                ← API client
        ├── store/              ← Zustand state
        └── types/              ← TypeScript interfaces
```

---

## التقنيات المستخدمة

### Backend

| العنصر | التقنية |
|--------|---------|
| اللغة | Python 3.11+ |
| الإطار | Django 4.2 |
| REST API | Django REST Framework 3.15 |
| قاعدة البيانات | PostgreSQL 15+ |
| المصادقة | JWT — simplejwt |
| تصدير/استيراد Excel | openpyxl |
| توليد PDF | reportlab |
| معالجة الصور | Pillow |
| الملفات الثابتة | WhiteNoise |
| النشر | Gunicorn + Railway |

### Frontend

| العنصر | التقنية |
|--------|---------|
| اللغة | TypeScript 5.5 |
| الإطار | Next.js 15 (App Router) |
| مكتبة الواجهة | React 18 |
| التصميم | Tailwind CSS 3.4 |
| State Management | Zustand + TanStack Query |
| النماذج | React Hook Form + Zod |
| HTTP Client | Axios مع JWT interceptors |
| الإشعارات | React Hot Toast |

---

## نموذج البيانات

### العلاقات

```
Student (1)
  ├── Guardian (many)           ← أولياء أمور
  ├── FamilyInfo (1)            ← دراسة الحالة الاجتماعية
  └── StudentAttachment (many)  ← مرفقات
```

### Student — المستفيد

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `file_number` | CharField unique | رقم الملف — يُولَّد تلقائياً: RY-YYYY-XXXX |
| `full_name` | CharField | الاسم الكامل |
| `national_id` | CharField unique | رقم الهوية (10 أرقام) |
| `date_of_birth` | DateField | تاريخ الميلاد |
| `gender` | CharField | ذكر / أنثى |
| `nationality` | CharField | الجنسية |
| `photo` | ImageField | الصورة الشخصية |
| `disability_type` | CharField | نوع الإعاقة (11 خيار) |
| `disability_degree` | CharField | درجة الإعاقة (4 درجات) |
| `diagnosis` | TextField | التشخيص التفصيلي |
| `educational_level` | CharField | المستوى التعليمي |
| `school_name` | CharField | اسم المدرسة |
| `grade` | CharField | الصف / المرحلة |
| `referral_source` | CharField | جهة الإحالة |
| `status` | CharField | الحالة (6 حالات) |
| `notes` | TextField | ملاحظات |
| `created_by` | FK → User | أُضيف بواسطة |

### Guardian — ولي الأمر

| الحقل | الوصف |
|-------|-------|
| `full_name` | الاسم |
| `relationship` | صلة القرابة (9 خيارات) |
| `national_id` | رقم الهوية |
| `phone` | رقم الجوال (10 أرقام) |
| `phone_alt` | رقم جوال إضافي (10 أرقام) |
| `is_primary_contact` | جهة التواصل الرئيسية |

### FamilyInfo — دراسة الحالة الاجتماعية

| الحقل | الوصف |
|-------|-------|
| `family_size` | عدد أفراد الأسرة |
| `sibling_order` | ترتيب المستفيد (لا يتجاوز عدد الأفراد) |
| `parents_status` | حالة الوالدين (6 خيارات) |
| `income_range` | الدخل التقريبي (5 شرائح) |
| `monthly_income` | الدخل بالرقم |
| `housing_type` | نوع السكن (5 خيارات) |
| `other_special_needs` | وجود أفراد آخرين بحاجات خاصة |

### StudentAttachment — المرفقات

| الحقل | الوصف |
|-------|-------|
| `attachment_type` | النوع (هوية / شهادة ميلاد / تقرير طبي / تقرير نفسي / بطاقة إعاقة / خطاب إحالة / أخرى) |
| `file` | الملف (PDF أو صورة — حد أقصى 10 MB) |
| `name` | اسم المرفق |

---

## الأدوار والصلاحيات

| الدور | القراءة | الإضافة والتعديل | الحذف | إدارة المستخدمين |
|-------|---------|-----------------|-------|-----------------|
| admin | ✅ | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ | ❌ |
| specialist | ✅ | ✅ | ❌ | ❌ |
| reception | ✅ | ✅ | ❌ | ❌ |
| viewer | ✅ | ❌ | ❌ | ❌ |

---

## قواعد التحقق (Validation)

| الحقل | القاعدة |
|-------|---------|
| رقم الهوية | 10 أرقام بالضبط |
| رقم الجوال | 10 أرقام بالضبط |
| تاريخ الميلاد | لا يكون في المستقبل، ولا أكثر من 100 سنة |
| ترتيب المستفيد | لا يتجاوز عدد أفراد الأسرة |

---

## API Endpoints

### المصادقة — `/api/auth/`

| الطريقة | المسار | الوصف | الصلاحية |
|---------|--------|-------|---------|
| POST | `login/` | تسجيل الدخول | عام |
| POST | `logout/` | تسجيل الخروج | مسجّل |
| POST | `token/refresh/` | تجديد التوكن | عام |
| GET/PATCH | `profile/` | الملف الشخصي | مسجّل |
| POST | `change-password/` | تغيير كلمة المرور | مسجّل |
| GET | `users/` | قائمة المستخدمين | مسجّل |
| POST | `users/` | إضافة مستخدم | admin |
| GET/PATCH/DELETE | `users/{id}/` | تفاصيل مستخدم | admin |

### المستفيدون — `/api/students/`

| الطريقة | المسار | الوصف | الصلاحية |
|---------|--------|-------|---------|
| GET | `students/` | قائمة مع بحث وفلترة | مسجّل |
| POST | `students/` | إضافة مستفيد | can_write |
| GET | `students/{id}/` | تفاصيل مستفيد | مسجّل |
| PATCH | `students/{id}/` | تعديل مستفيد | can_write |
| DELETE | `students/{id}/` | حذف مستفيد | can_delete |
| GET | `students/export/` | تصدير Excel | مسجّل |
| POST | `students/import/` | استيراد من Excel | can_write |
| GET | `students/import/template/` | تحميل قالب الاستيراد | مسجّل |

### أولياء الأمور

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `students/{id}/guardians/` | قائمة |
| POST | `students/{id}/guardians/` | إضافة |
| PATCH | `students/{id}/guardians/{gid}/` | تعديل |
| DELETE | `students/{id}/guardians/{gid}/` | حذف |

### دراسة الحالة الاجتماعية

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `students/{id}/family/` | عرض |
| POST | `students/{id}/family/` | إنشاء |
| PUT | `students/{id}/family/` | تعديل |

### المرفقات

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET | `students/{id}/attachments/` | قائمة |
| POST | `students/{id}/attachments/` | رفع ملف |
| DELETE | `students/{id}/attachments/{aid}/` | حذف |

### سجل العمليات

| الطريقة | المسار | الوصف | الصلاحية |
|---------|--------|-------|---------|
| GET | `core/audit-logs/` | قائمة السجلات | manager فأعلى |

---

## فلاتر البحث

`GET /api/students/?search=...&status=active&gender=male&disability_type=autism`

| الفلتر | الوصف |
|--------|-------|
| `search` | بحث في الاسم، رقم الهوية، رقم الملف |
| `status` | pending / active / inactive / graduated / suspended / transferred |
| `gender` | male / female |
| `disability_type` | intellectual / autism / down / physical / hearing / visual / speech / learning / behavioral / multiple / other |
| `disability_degree` | mild / moderate / severe / profound |
| `nationality` | نص حر |
| `registration_from` | تاريخ البداية (YYYY-MM-DD) |
| `registration_to` | تاريخ النهاية (YYYY-MM-DD) |
| `ordering` | full_name / registration_date / created_at / file_number |

---

## استيراد البيانات من Excel

١. تحميل القالب: `GET /api/students/import/template/`
٢. تعبئة البيانات ابتداءً من الصف الثاني
٣. رفع الملف: `POST /api/students/import/`

**الحقول المطلوبة في القالب:**

| العمود | الحقل | مثال |
|--------|-------|------|
| A | الاسم الكامل * | محمد أحمد العتيبي |
| B | رقم الهوية * | 1234567890 |
| C | تاريخ الميلاد * | 2010-05-15 |
| D | الجنس * | ذكر |
| E | الجنسية * | سعودي |
| F | الحالة | نشط |
| G | تاريخ التسجيل | 2024-01-10 |
| H | نوع الإعاقة | طيف التوحد |
| I | درجة الإعاقة | متوسطة |
| J | التشخيص | — |
| K | المستوى التعليمي | برنامج تربية خاصة |
| L | اسم المدرسة | — |
| M | الصف | — |
| N | جهة الإحالة | مستشفى / عيادة |
| O | ملاحظات | — |

الاستجابة تُعيد: `{ created, skipped, errors: [{row, name, errors[]}] }`

---

## إعدادات JWT

| الإعداد | القيمة |
|---------|--------|
| Access Token | 8 ساعات |
| Refresh Token | 7 أيام |
| Algorithm | HS256 |

---

## إعداد بيئة التطوير

راجع [SETUP.md](SETUP.md) للتعليمات التفصيلية.

---

## النشر على Railway

الملف `backend/railway.json` يشغّل تلقائياً عند كل deploy:
1. `migrate` — تطبيق migrations جديدة
2. `collectstatic` — جمع الملفات الثابتة
3. `create_default_users` — إنشاء المستخدمين الافتراضيين (إذا لم يكونوا موجودين)
4. `gunicorn` — تشغيل الخادم

> قاعدة البيانات **لا تُحذف** عند التحديث — البيانات محفوظة.
