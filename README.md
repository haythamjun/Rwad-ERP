# Roya - رؤية | نظام إدارة مركز التأهيل

نظام ERP متكامل لإدارة مركز تأهيل ذوي الإعاقة: ملفات المستفيدين، الحضور، الجدول الدراسي، الملف الطبي، الخطط والمقاييس، الأقسام التخصصية، الباصات، والتقارير — مع تطبيق جوال لأولياء الأمور. يدعم العربية بالكامل (RTL).

---

## المحتويات

- [هيكل المشروع](#هيكل-المشروع)
- [التقنيات المستخدمة](#التقنيات-المستخدمة)
- [وحدات النظام](#وحدات-النظام)
- [الأدوار والصلاحيات](#الأدوار-والصلاحيات)
- [نموذج البيانات](#نموذج-البيانات)
- [قواعد التحقق](#قواعد-التحقق-validation)
- [API Endpoints](#api-endpoints)
- [فلاتر البحث](#فلاتر-البحث)
- [استيراد وتصدير البيانات](#استيراد-وتصدير-البيانات)
- [بوابة أولياء الأمور (Flutter)](#بوابة-أولياء-الأمور-flutter)
- [الفصول الافتراضية (Zoho Meeting)](#الفصول-الافتراضية-zoho-meeting)
- [الإعدادات والنشر](#إعدادات-jwt)
- [سجل التحديثات](#سجل-التحديثات)

---

## هيكل المشروع

```
Rwad_ERP/
├── backend/                        ← Django REST API
│   ├── rwad_erp/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   └── urls.py
│   ├── apps/
│   │   ├── accounts/               ← المستخدمون، صلاحيات الوحدات، الملف المهني
│   │   ├── students/               ← المستفيدون، الحضور، الجدول، الطبي، الخطط، بوابة أولياء الأمور
│   │   ├── assessments/            ← مكتبة المقاييس وتقييمات الطلاب
│   │   ├── core/                   ← الفروع، الباصات، الفصول، الإعدادات، التقارير، سجل العمليات
│   │   └── virtual_classes/        ← الحصص الأونلاين عبر Zoho Meeting + أرشفة التسجيلات
│   ├── manage.py
│   ├── railway.json                ← أمر التشغيل على Railway (Config-as-code — يتوقف 2026-12-01)
│   ├── railway.cron.json           ← خدمة جدولة أرشفة التسجيلات (مرجع؛ الإعداد الفعلي بلوحة Railway)
│   └── requirements.txt
│
├── frontend/                       ← Next.js Web App
│   └── src/
│       ├── app/                    ← الصفحات (App Router)
│       ├── components/             ← المكونات (نوافذ الإدخال، النماذج)
│       ├── lib/                    ← API client (axios)
│       ├── store/                  ← Zustand (المستخدم والصلاحيات)
│       └── types/                  ← TypeScript interfaces
│
└── flutter_portal/                 ← تطبيق جوال لأولياء الأمور
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
| المصادقة | JWT — simplejwt (موظفون) / Token خاص (أولياء الأمور) |
| الفلترة | django-filter |
| تصدير/استيراد Excel | openpyxl |
| توليد PDF | reportlab |
| معالجة الصور | Pillow |
| تخزين الملفات | django-storages + S3 / Cloudflare R2 (اختياري) |
| الملفات الثابتة | WhiteNoise |
| النشر | Gunicorn + Railway |

### Frontend

| العنصر | التقنية |
|--------|---------|
| اللغة | TypeScript 5.5 |
| الإطار | Next.js 15 (App Router) |
| مكتبة الواجهة | React 18 |
| التصميم | Tailwind CSS 3.4 |
| State Management | Zustand + TanStack Query 5 |
| النماذج | React Hook Form + Zod |
| HTTP Client | Axios مع JWT interceptors |
| الإشعارات | React Hot Toast |

### تطبيق الجوال

| العنصر | التقنية |
|--------|---------|
| الإطار | Flutter |
| المجلد | `flutter_portal/` (راجع `flutter_portal/SETUP.md`) |

---

## وحدات النظام

| الوحدة | الصفحة | الوصف |
|--------|--------|-------|
| لوحة التحكم | `/dashboard` | إحصاءات عامة |
| ملفات الطلاب | `/students` | قائمة المستفيدين، الإضافة، التعديل، القبول/الرفض |
| الطلبات المرفوضة | `/students/rejected` | المستفيدون المرفوضون مع إمكانية الاسترجاع |
| ملف المستفيد | `/students/{id}` | تبويبات: البيانات، أولياء الأمور، الدراسة الاجتماعية، المرفقات، الحضور، الجدول، الطبي، الخطط، المقاييس، الأخصائيون |
| الحضور والغياب | `/attendance` | كشف يومي لكل الطلاب حسب الفرع |
| الجدول الدراسي | `/schedules` | جدول أسبوعي (الأحد–الخميس) بفترتين: صباحي 6:30–11:30 ومسائي 12:30–5:30، كل فترة 8 حصص + بريك + أعمال مكتبية، مع إنشاء جماعي |
| القسم الطبي | `/medical` | كشف التشيك إن الطبي اليومي |
| الخطط الشهرية | `/plans` | خطة لكل طالب بـ6 مجالات نمائية + مرفقات Word/Excel |
| الخطة الفردية | `/individual-plans` | أهداف متعددة لكل مجال بتاريخ وتقييم بعدي، ولكل هدف أهداف فرعية (مستوى واحد) |
| تحليل الأهداف | `/students/{id}/individual-plans/{planId}/analysis` | نموذج متابعة لكل هدف (بنوده أهدافه الفرعية) لمدة شهر + طباعة بشكل النموذج الورقي |
| الخطط الفصلية | `/quarterly-plans` | نفس هيكل الفردية بفترة فصلية وأخصائي مسؤول، مع أهداف فرعية |
| الفصول الافتراضية | `/virtual-classes` | حصص أونلاين عبر Zoho Meeting بحساب معلم الفصل، مسجّلة ومؤرشفة تلقائيًا على R2 |
| باصي | `/my-bus` | للسائق/مشرف الباص فقط: أسماء طلاب فترته وعناوينهم |
| المقاييس | `/assessments` | بناء مقاييس (بورتيج، تيتش...) بأقسام وأسئلة وتقديرات قبلي/بعدي |
| الأقسام التخصصية | `/departments/{slug}` | بوابة الأقسام الخمسة وعهدة كل أخصائي |
| الباصات | `/buses` | الباصات وفترات التشغيل (سائق + مشرف/ة لكل فترة) |
| الفصول | `/classrooms` | الفصول ومعلم/ة كل فصل |
| التقارير | `/reports` | تقرير الحضور مع نسبة الحضور + تصدير |
| المستخدمون | `/users` | إدارة المستخدمين وصلاحيات الوحدات والملف المهني |
| سجل العمليات | `/audit-logs` | كل عمليات الإضافة/التعديل/الحذف/الدخول |
| الإعدادات | `/settings` | بيانات المركز، الشعار، الإجازات الأسبوعية، الفصول الدراسية، العطل |

**الأقسام التخصصية (`slug`):** `speech` النطق واللغة · `ot` العلاج الوظيفي · `pt` العلاج الطبيعي · `psych` النفسي وتعديل السلوك · `social` الخدمة الاجتماعية.

---

## الأدوار والصلاحيات

الصلاحيات في النظام على مستويين: **الدور** يعطي صلاحيات أساسية، و**صلاحيات الوحدات** يمنحها مدير النظام لكل مستخدم على حدة.

### 1. الدور الوظيفي

| الدور | القيمة | ملفات الطلاب (إضافة/تعديل) | حذف / قبول / رفض | إدارة المستخدمين | سجل العمليات |
|-------|--------|:---:|:---:|:---:|:---:|
| مدير النظام | `admin` | ✅ | ✅ | ✅ | ✅ |
| مدير | `manager` | ✅ | ✅ | ❌ | ✅ |
| أخصائي | `specialist` | ✅ | ❌ | ❌ | ❌ |
| استقبال | `reception` | ✅ | ❌ | ❌ | ❌ |
| مشاهد | `viewer` | ❌ | ❌ | ❌ | ❌ |
| سائق | `driver` | ❌ | ❌ | ❌ | ❌ |
| مشرف/ة الباص | `bus_supervisor` | ❌ | ❌ | ❌ | ❌ |
| مسؤول الحركة | `transport_officer` | ❌ | ❌ | ❌ | ❌ |

> مدير النظام (`admin`) يتجاوز كل فحوصات الصلاحيات ويرى كل الطلاب.
>
> **طاقم النقل** (`driver` / `bus_supervisor` / `transport_officer` — `User.is_transport_staff`) ممنوع من كل بيانات المستفيدين على مستوى الخادم، **حتى لو مُنح صلاحيات وحدات بالخطأ**:
> - السائق/المشرف يرى صفحة «باصي» فقط (`GET /api/buses/mine/`): الفترات اللي هو طاقمها، وأسماء طلابها وعناوين سكنهم — بلا ملفات ولا جوالات ولا هويات.
> - مسؤول الحركة يرى صفحة الباصات فقط (البيانات وتواريخ الاستمارة والفحص والتأمين) بدون قوائم الطلاب.
> - الطالب المسجّل على باص بلا فترة يظهر في الفترتين.

### 2. صلاحيات الوحدات (`UserModulePermission`)

لكل مستخدم ولكل وحدة أربعة خيارات: **عرض / تعديل / تصدير / استيراد**. تُضبط من شاشة المستخدمين، و**كلها مقفولة افتراضيًا** لأي مستخدم جديد.

| المفتاح | الوحدة | يتحكم في |
|---------|--------|----------|
| `students` | ملفات الطلاب | التصدير والاستيراد، والتعديل لمن دوره لا يسمح |
| `medical_file` | الملف الطبي | الملف الطبي، الزيارات، الأدوية، التشيك إن |
| `assessments` | المقاييس والخطط الدراسية | المقاييس + الخطط الشهرية |
| `individual_plans` | الخطة الفردية | الخطة الفردية وتحليل الأهداف |
| `quarterly_plans` | الخطط الفصلية | الخطط الفصلية فقط |
| `reports` | التقارير | تقارير الحضور |
| `attendance` | الحضور والغياب | التعديل لمن دوره لا يسمح |
| `schedule` | الجدول الدراسي | التعديل لمن دوره لا يسمح |
| `buses` | الباصات | تعديل الباصات (لا يوجد دور يمنحها افتراضيًا) |
| `classrooms` | الفصول | تعديل الفصول (لا يوجد دور يمنحها افتراضيًا) |
| `virtual_classes` | الفصول الافتراضية | عرض حصص فصول الفرع، الجدولة (`can_edit`)، استيراد تسجيلات Zoho القديمة (`can_import`) — معلم الفصل يدير فصله بدونها |
| `confidential` | البيانات السرية | الاطلاع على الهويات وبيانات تواصل أولياء الأمر ودراسة الحالة — انظر أدناه |

### 4. البيانات السرية

بنود تُخفى (ترجع `null` من الـ API) عمّن ليس له `User.can_view_confidential`:

- رقم هوية الطالب.
- بيانات ولي الأمر: الجوال، الجوال الإضافي، البريد، العنوان، رقم الهوية (يبقى الاسم وصلة القرابة).
- دراسة الحالة (`FamilyInfo`) كاملة.
- مرفقات صورة الهوية وكرت العائلة (باقي المرفقات تظهر).

**من يراها:** مدير النظام والمدير والاستقبال افتراضيًا، وغيرهم (المعلم، الأخصائي...) فقط بصلاحية وحدة `confidential` (`can_view`).

**ما يحتاج الصلاحية أيضًا:** إضافة/تعديل/حذف ولي أمر، دراسة الحالة (قراءة وكتابة)، البحث برقم الهوية، تصدير الطلاب (Excel/CSV)، وتسجيل طالب جديد. من لا يملكها يعدّل باقي بيانات الطالب، ورقم الهوية يُتجاهل من طلبه فلا يُمسح.

> **مهم:**
> - صلاحية الأخصائي لإدخال المقاييس والخطط **لا تأتي من الدور**؛ لازم يمنحها مدير النظام من وحدات `assessments` / `individual_plans` / `quarterly_plans`.
> - صلاحية «تعديل» على وحدة تمنح الحذف فيها أيضًا.
> - الصلاحيات تُحمَّل عند تسجيل الدخول، فبعد تعديلها يلزم المستخدم **تسجيل خروج ثم دخول**.
> - تبويبات ملف الطالب التي لا يملك المستخدم صلاحية عرضها تُخفى تلقائيًا.

### 3. نطاق رؤية الطلاب

كل مستخدم غير مدير النظام يرى جزءًا من الطلاب فقط، حسب أول شرط ينطبق عليه:

1. **معلم فصل** ← طلاب فصوله فقط.
2. **أخصائي له تكليفات** ← طلاب عهدته فقط (`StudentSpecialistAssignment`).
3. **مستخدم له فرع معيّن** ← طلاب الفرع.
4. **مستخدم له مدينة معيّنة** ← طلاب فروع المدينة.
5. **المدير (`manager`) بلا فرع/مدينة** ← كل الطلاب.
6. غير ذلك ← **لا شيء** (المستخدم بلا فرع لا يرى أي طالب حتى يُعيَّن له فرع أو مدينة).

طاقم النقل لا يرى أي طالب مهما كان فرعه (انظر أعلاه). المنطق في `apps/students/views.py`: `_apply_scope` / `_scope_branch_ids` / `_scope_by_student` / `_student_in_scope`.

**تكليف الأخصائي:** من ملف الطالب ← بطاقة الأخصائيين، أخصائي واحد لكل قسم، **ومدير النظام فقط** يقدر يكلّف. القائمة تعرض فقط الأخصائيين اللي حقل «القسم التخصصي» عندهم مطابق للقسم، فلازم يُحدَّد القسم في بيانات المستخدم أولًا.

---

## نموذج البيانات

### العلاقات

```
Student (1)
  ├── Guardian (many)                    ← أولياء الأمور
  │     └── GuardianAuthToken (many)     ← جلسات تطبيق الجوال
  ├── FamilyInfo (1)                     ← دراسة الحالة الاجتماعية
  ├── StudentAttachment (many)           ← مرفقات
  ├── StudentAttendance (many)           ← الحضور (سجل واحد لكل يوم)
  ├── StudentSchedule (many)             ← حصص الجدول الأسبوعي
  ├── StudentSpecialistAssignment (≤5)   ← أخصائي لكل قسم
  ├── Plan (many) → PlanGoal, PlanAttachment
  ├── IndividualPlan (many) → IndividualPlanGoal → IndividualPlanSubGoal
  │                         └── GoalAnalysisSheet (واحد لكل هدف لكل شهر)
  ├── QuarterlyPlan (many) → QuarterlyPlanGoal → QuarterlyPlanSubGoal
  ├── StudentAssessment (many) → StudentAssessmentAnswer
  ├── StudentMedicalProfile (1)
  ├── MedicalVisit (many)
  ├── Medication (many)
  └── DailyMedicalCheckIn (many) → MedicationAdministration

Branch (1) → Bus (many) → BusShift (صباحي/مسائي)
Branch (1) → Classroom (many) → VirtualSession (many) → SessionRecording, SessionAttendance
User (1) → UserModulePermission (many), SpecialistCertificate (many), ZohoAccount (0..1)
```

### Student — المستفيد

| الحقل | النوع | الوصف |
|-------|-------|-------|
| `file_number` | CharField unique | رقم الملف — يُولَّد تلقائياً: `RW-YYYY-XXXX` |
| `first_name` / `middle_name` / `grandfather_name` / `family_name` | CharField | الاسم الرباعي (`full_name` خاصية محسوبة) |
| `national_id` | CharField unique | رقم الهوية / الإقامة (10 أرقام) |
| `date_of_birth` | DateField | تاريخ الميلاد (`age` خاصية محسوبة) |
| `gender` | CharField | `male` ذكر / `female` أنثى |
| `nationality` | CharField | الجنسية |
| `photo` | ImageField | الصورة الشخصية |
| `branch` / `bus` / `classroom` | FK | الفرع، الباص، الفصل |
| `bus_shift` | CharField | فترة الباص: `morning` / `evening` |
| `study_shift` | CharField | الفترة الدراسية: `morning` (افتراضي) / `evening` — تحدد أوقات جدوله. مستقلة عن فترة الباص (عُبّئت مبدئيًا منها) |
| `residence_address` | TextField | عنوان سكن الطالب (مستقل عن ولي الأمر) |
| `disability_type` | JSONField | قائمة أنواع الإعاقة، كل نوع بدرجته: `[{"type": "autism", "degree": "moderate"}]` |
| `diagnosis` | TextField | التشخيص التفصيلي |
| `iq_score` | PositiveInteger | درجة الذكاء (اختياري) |
| `educational_level` | CharField | المستوى التعليمي (7 خيارات) |
| `school_name` / `grade` | CharField | المدرسة والصف |
| `referral_source` / `referral_source_detail` | CharField | جهة الإحالة (7 خيارات) وتفاصيلها |
| `status` | CharField | الحالة (7 حالات — انظر أدناه) |
| `rejection_reason` | TextField | سبب الرفض |
| `payment_type` | CharField | نوع التسجيل: `paid` مدفوع (افتراضي) / `free` مجاني |
| `registration_date` | DateField | تاريخ التسجيل |
| `notes` | TextField | ملاحظات |
| `created_by` | FK → User | أُضيف بواسطة |

**الحالات:** `pending` في انتظار القبول · `active` نشط · `inactive` غير نشط · `graduated` خرّيج · `suspended` موقوف · `transferred` محوّل · `rejected` مرفوض.

**دورة القبول:** كل مستفيد جديد يبدأ `pending` ← قبول (`accept`) يحوّله `active` ويتيح طباعة إشعار القبول، أو رفض (`reject`) مع سبب ← يظهر في صفحة المرفوضين ويمكن استرجاعه (`restore`).

**الطلاب المجانيون:** يظهر بجانبهم شارة «مجاني» في القائمة وفي رأس الملف، ويمكن فلترتهم بـ `payment_type=free`.

### Guardian — ولي الأمر

| الحقل | الوصف |
|-------|-------|
| `full_name` | الاسم |
| `relationship` | صلة القرابة (9 خيارات) |
| `national_id` | رقم الهوية |
| `phone` / `phone_alt` | رقم الجوال والإضافي (10 أرقام) — يُستخدم للدخول لتطبيق الجوال |
| `is_primary_contact` | جهة التواصل الرئيسية |

### FamilyInfo — دراسة الحالة الاجتماعية

| الحقل | الوصف |
|-------|-------|
| `family_size` | عدد أفراد الأسرة |
| `sibling_order` | ترتيب المستفيد (لا يتجاوز عدد الأفراد) |
| `parents_status` | حالة الوالدين (6 خيارات) |
| `income_range` / `monthly_income` | الدخل التقريبي (5 شرائح) وبالرقم |
| `housing_type` | نوع السكن (5 خيارات) |
| `other_special_needs` | وجود أفراد آخرين بحاجات خاصة |

### StudentAttachment — المرفقات

| الحقل | الوصف |
|-------|-------|
| `attachment_type` | هوية / شهادة ميلاد / تقرير طبي / تقرير نفسي / بطاقة إعاقة / خطاب إحالة / أخرى |
| `file` | PDF أو صورة — حد أقصى 10 MB |
| `name` | اسم المرفق |

### StudentAttendance — الحضور

سجل واحد لكل طالب في اليوم (`student` + `attendance_date` فريد).

| الحقل | الوصف |
|-------|-------|
| `status` | `present` حاضر · `absent` غائب · `late` متأخر · `excused_absence` غياب بعذر · `early_leave` انصراف مبكر |
| `check_in_time` / `check_out_time` | وقت الحضور والانصراف |
| `absence_reason` / `late_reason` / `early_leave_reason` | الأسباب |
| `guardian_notified` / `notification_notes` | إخطار ولي الأمر |
| `recorded_by` / `updated_by` | من سجّل ومن عدّل |

### StudentSchedule — الجدول الأسبوعي

حصة واحدة لكل (طالب، يوم، وقت). الأيام: الأحد–الخميس. الحقول: `subject` المادة، `specialist` الأخصائي، `notes`.

الأوقات ثابتة مثل النموذج الورقي — `SCHEDULE_SHIFTS` في `apps/students/models.py`، ونسختها `SCHEDULE_SHIFTS` في `frontend/src/types/index.ts` (لازم تتطابقان):

| الفترة | الحصص | بريك | أعمال مكتبية |
|--------|-------|------|--------------|
| صباحي | 6:30، 7:00، 7:30، 8:00، 9:00، 9:30، 10:00، 10:30 | 8:30 | 11:00 |
| مسائي | 12:30، 1:00، 1:30، 2:00، 3:00، 3:30، 4:00، 4:30 | 2:30 | 5:00 |

- الحجز يُقبل فقط في أوقات حصص **فترة الطالب الدراسية** — البريك والأعمال المكتبية والفترة الأخرى تُرفض (فردي وجماعي).
- جدول الطالب يعرض فترته، و«جدولي» للمختص يعرض الفترتين بزرّين.
- الحصص القديمة اللي وقتها صار خارج الأوقات المعتمدة لا تُحذف: تظهر تحت الجدول في «حصص خارج أوقات الحصص المعتمدة» لإعادة جدولتها، وتبقى قابلة للتعديل ما دام وقتها ما تغيّر.
- الأوقات واحدة لكل الفروع حاليًا (نسخة مبدئية) — أوقات مرنة لكل فرع/مختص مؤجلة.

### الخطط

| النموذج | الوصف |
|---------|-------|
| `Plan` | خطة شهرية: معلم/ة، تاريخ بداية ونهاية |
| `PlanGoal` | نص الأهداف لكل مجال من 6 ثابتة: الاجتماعي، الاستقلالي، المعرفي، التواصل، الإدراكي، الحركي |
| `PlanAttachment` | ملف Word/Excel جاهز للخطة |
| `IndividualPlan` | خطة فردية + ملاحظات |
| `IndividualPlanGoal` | `domain` (نص حر)، `goal_text`، `start_date`، `end_date`، `post_evaluation`، `post_evaluation_manual`، `order`، `achieved_date` |
| `IndividualPlanSubGoal` | هدف فرعي: `text`، `post_evaluation`، `order`، `achieved_date` (بند في نموذج التحليل) |
| `GoalAnalysisSheet` | نموذج تحليل لهدف واحد: `goal`، `start_date`، `ratings`، `teaching_aids`، `teacher_note` — فريد لكل (هدف، تاريخ بداية) |
| `QuarterlyPlan` | خطة فصلية: أخصائي مسؤول، تاريخ بداية ونهاية الفصل، ملاحظات |
| `QuarterlyPlanGoal` | نفس حقول هدف الخطة الفردية (بدون `achieved_date`) |
| `QuarterlyPlanSubGoal` | هدف فرعي: `text`، `post_evaluation`، `order` |

**الأهداف الفرعية** (مستوى واحد): تحت كل هدف زر «+ هدف فرعي». تقييم الهدف الرئيسي **يُحسب تلقائيًا** من تقييمات أهدافه الفرعية، والمختص يقدر يعدّله يدويًا (`post_evaluation_manual=true`، وزر ↺ يرجعه للحساب التلقائي). قاعدة الحساب (`IndividualPlanGoal.evaluation_from_sub_goals` في الخادم = `evaluationFromSubGoals` في الواجهة):

| تقييمات الأهداف الفرعية | تقييم الهدف |
|------------------------|------------|
| كلها «تحقق» (و«لم يطبق» لا يُحسب) | تحقق |
| بعضها تحقق أو نوعًا ما | نوعًا ما |
| ولا واحد تحقق | لم يتحقق |
| كلها «لم يطبق» | لم يطبق |
| ولا واحد مقيَّم | بدون تقييم |

الهدف الفرعي غير المقيَّم يمنع «تحقق» الكامل. الأهداف الفرعية تُحدَّث بمعرّفاتها مثل الأهداف حتى تبقى بنود التحليل مربوطة بها.

**المجالات الافتراضية** للخطة الفردية والفصلية (يمكن حذفها أو إضافة غيرها): الإدراكي، الحركي الدقيق، الحركي الكبير، الاجتماعي، الاستقلالي، الانتباه والتركيز، التخاطب.

**التقييم البعدي:** `achieved` تحقق · `partial` نوعًا ما · `not_achieved` لم يتحقق · `not_applicable` لم يطبق.

### تحليل الأهداف

نموذج متابعة يومية للخطة الفردية، بنفس تخطيط «نموذج جمع البيانات» الورقي:

- **نموذج لكل هدف** (مجال فيه 7 أهداف = 7 نماذج). الصفحة: اختيار المجال ← بطاقات أهدافه المرقّمة ← نموذج الهدف.
- **بنود النموذج = الأهداف الفرعية للهدف**، أو الهدف نفسه كبند وحيد لو ما له أهداف فرعية.
- كل نموذج = شهر متابعة: 20 يوم دراسي تبدأ من `start_date` (أي يوم — الهدف قد يبدأ وسط الأسبوع). الأيام تتخطى **أيام الإجازة الأسبوعية والعطل الرسمية من الإعدادات** (`SiteSettings.weekly_off_days` و`Holiday`)، وحرف كل عمود (ح ن ث ع خ) يُؤخذ من تاريخه الفعلي. التواريخ تُحسب عند العرض، فتعديل الإعدادات يغيّرها للأشهر القائمة.
- بعد الشهر يُفتح نموذج جديد (يبدأ من اليوم الدراسي التالي) ويبقى السابق محفوظًا. زر «حذف الشهر» يحذف شهرًا بتقييماته (لمن له تعديل الخطط الفردية) ويُسجَّل في سجل العمليات.
- `ratings`: `{"<sub_goal_id>" | "goal": [20 قيمة]}` — المفتاح `goal` لبند الهدف نفسه. كل قيمة: `0` لم يُقيَّم · `1` مستقل (أنجز) · `2` إيمائية · `3` مساعدة لفظية · `4` مساعدة جزئية.
- تاريخ الإنجاز لكل بند: على الهدف الفرعي (`IndividualPlanSubGoal.achieved_date`)، أو على الهدف لو كان بندًا وحيدًا.
- **أول هدف فرعي يُضاف لهدف كان يُقيَّم:** تنتقل تقييماته (`goal`) وتاريخ إنجازه للهدف الفرعي الأول.
- اسم المعلمة في الرأس: معلم/ة فصل الطالب، وإلا من أنشأ الخطة.

> تعديل الخطة الفردية يُحدِّث الأهداف والأهداف الفرعية بمعرّفاتها (`id`) بدل حذفها وإعادة إنشائها، حتى تبقى تقييمات تحليل الأهداف مربوطة بها.
>
> النماذج القديمة (نموذج لكل مجال) قُسّمت بالـ migration `students.0030` إلى نموذج لكل هدف بنفس التقييمات والوسائل والملاحظة والتواريخ.

### المقاييس (`apps.assessments`)

| النموذج | الوصف |
|---------|-------|
| `Assessment` | المقياس (اسم فريد، وصف، نشط) |
| `AssessmentSection` | قسم اختياري داخل المقياس (فئة عمرية مثلًا) |
| `AssessmentQuestion` | مهارة/سؤال، قد ينتمي لقسم |
| `AssessmentScaleOption` | خيارات التقدير، نوعها `pre` قبلي أو `post` بعدي |
| `StudentAssessment` | تطبيق مقياس على طالب بتاريخ بدء (يمكن تكراره لإعادة التقييم) |
| `StudentAssessmentAnswer` | لكل سؤال: تقدير قبلي + خطة تطبيق + تقدير بعدي |

### الملف الطبي

| النموذج | الوصف |
|---------|-------|
| `StudentMedicalProfile` | الطول، الوزن، الأمراض المزمنة، الحساسية الطبية والغذائية، التشنجات، جهاز الاستنشاق |
| `MedicalVisit` | زيارة تقييم دورية: `stable` مستقر / `unstable` غير مستقر + درجة الحرارة |
| `Medication` | الأدوية الثابتة: الاسم، الجرعة، عدد المرات، نشط |
| `DailyMedicalCheckIn` | تشيك إن يومي واحد لكل طالب: الضغط، السكر، الوزن، الحرارة، النبض |
| `MedicationAdministration` | هل أُعطي كل دواء في تشيك إن اليوم ووقته |

### المستخدمون (`apps.accounts`)

| النموذج | الوصف |
|---------|-------|
| `User` | `role`، `phone`، `avatar`، `assigned_branch`، `assigned_city`، `department` (القسم التخصصي) |
| `UserModulePermission` | صلاحيات الوحدات (`can_view`, `can_edit`, `can_export`, `can_import`) |
| `SpecialistCertificate` | الملف المهني: شهادة/دورة، الجهة المانحة، التاريخ، الملف |

### العام (`apps.core`)

| النموذج | الوصف |
|---------|-------|
| `Branch` | الفرع: الاسم، المدينة، الموقع، الهاتف |
| `Bus` | الباص: رقم الهيكل واللوحة، الماركة، سنة الصنع، الفرع، انتهاء الاستمارة والفحص، بداية وانتهاء التأمين (اختياري) — شارة «منتهي: ...» لأي تاريخ منتهٍ |
| `BusShift` | فترة تشغيل (صباحي/مسائي) بسائق ومشرف/ة |
| `Classroom` | الفصل: الاسم، الفرع، المعلم/ة |
| `SiteSettings` | صف واحد: اسم المركز، التواصل، الشعار، أيام الإجازة الأسبوعية |
| `AcademicTerm` / `Holiday` | الفصول الدراسية والعطل — لاحتساب أيام الدراسة المتوقعة في تقرير الحضور |
| `AuditLog` | سجل العمليات: المستخدم، العملية، العنصر، التغييرات، IP، الوقت |

---

## قواعد التحقق (Validation)

| الحقل | القاعدة |
|-------|---------|
| رقم الهوية | 10 أرقام بالضبط، وفريد |
| رقم الجوال | 10 أرقام بالضبط |
| تاريخ الميلاد | لا يكون في المستقبل، ولا أكثر من 100 سنة |
| ترتيب المستفيد | لا يتجاوز عدد أفراد الأسرة |
| الحقول الإلزامية للطالب | الاسم الأول، اسم الأب، اسم الجد، اسم العائلة، الهوية، الميلاد، الجنس، الجنسية |
| حجم الملفات المرفوعة | 10 MB |

---

## API Endpoints

كل المسارات تبدأ بـ `/api/`. المصادقة عبر الهيدر `Authorization: Bearer <access_token>`.

**الترقيم:** القوائم 20 بالصفحة افتراضيًا، ويمكن طلب أكثر بـ `?page_size=` (حد أقصى 1000) — `apps/core/pagination.py`.

### المصادقة والمستخدمون — `/api/auth/`

| الطريقة | المسار | الوصف | الصلاحية |
|---------|--------|-------|---------|
| POST | `login/` | تسجيل الدخول (يرجع التوكن والصلاحيات) | عام |
| POST | `logout/` | تسجيل الخروج | مسجّل |
| POST | `token/refresh/` | تجديد التوكن | عام |
| GET/PATCH | `profile/` | الملف الشخصي | مسجّل |
| POST | `change-password/` | تغيير كلمة المرور | مسجّل |
| GET | `users/` | قائمة المستخدمين | مسجّل |
| POST | `users/` | إضافة مستخدم | admin |
| GET/PATCH/DELETE | `users/{id}/` | تفاصيل مستخدم وصلاحياته | admin |
| GET/POST | `certificates/` | الملف المهني (شهادات ودورات) | مسجّل |
| GET/DELETE | `certificates/{id}/` | شهادة | مسجّل |

### المستفيدون

| الطريقة | المسار | الوصف | الصلاحية |
|---------|--------|-------|---------|
| GET | `students/` | قائمة مع بحث وفلترة | مسجّل (حسب النطاق) |
| POST | `students/` | إضافة مستفيد | CanWrite |
| GET | `students/{id}/` | تفاصيل مستفيد | مسجّل (حسب النطاق) |
| PATCH | `students/{id}/` | تعديل مستفيد | CanWrite |
| DELETE | `students/{id}/` | حذف مستفيد | CanDelete |
| POST | `students/{id}/accept/` | قبول | CanDelete |
| POST | `students/{id}/reject/` | رفض مع سبب | CanDelete |
| POST | `students/{id}/restore/` | استرجاع مرفوض | CanDelete |
| GET/PUT | `students/{id}/specialist-assignments/` | تكليفات الأخصائيين | عرض: مسجّل / تعديل: admin |

**جسم طلب التكليف:** `{"assignments": {"speech": 5, "ot": null, "pt": 7, "psych": null, "social": null}}` — القيمة `null` تلغي التكليف.

### بيانات ملف المستفيد

| المسار | الطرق | الوصف |
|--------|-------|-------|
| `students/{id}/guardians/` · `{gid}/` | GET, POST · PATCH, DELETE | أولياء الأمور |
| `students/{id}/family/` | GET, POST, PUT | دراسة الحالة الاجتماعية |
| `students/{id}/attachments/` · `{aid}/` | GET, POST · DELETE | المرفقات |

### الحضور والجدول

| المسار | الطرق | الوصف | الوحدة |
|--------|-------|-------|-------|
| `students/{id}/attendance/` · `{pk}/` | GET, POST · GET, PATCH, DELETE | حضور طالب | `attendance` |
| `attendance/` | GET, POST | كل سجلات الحضور | `attendance` |
| `attendance/sheet/` | GET | الكشف اليومي (الطلاب مدموجين مع حضورهم) | مسجّل |
| `students/{id}/schedule/` · `{pk}/` | GET, POST · GET, PATCH, DELETE | جدول طالب | `schedule` |
| `schedule/bulk/` | POST | إنشاء حصص لعدة طلاب دفعة واحدة | `schedule` |
| `schedule/classes/` | GET | الحصص مجمّعة كفصول | مسجّل |

### الملف الطبي

| المسار | الطرق | الوصف |
|--------|-------|-------|
| `students/{id}/medical-profile/` | GET, POST, PUT | الملف الطبي الثابت |
| `students/{id}/medical-visits/` · `{pk}/` | GET, POST · GET, PATCH, DELETE | زيارات التقييم |
| `students/{id}/medications/` · `{pk}/` | GET, POST · GET, PATCH, DELETE | الأدوية |
| `students/{id}/medical-checkins/` · `{pk}/` | GET, POST · GET, PATCH, DELETE | التشيك إن اليومي |
| `medical/sheet/` | GET | الكشف الطبي اليومي حسب الفرع |

العرض يتطلب `medical_file.can_view`، والتعديل `medical_file.can_edit`.

### الخطط

| المسار | الطرق | الوصف | الوحدة |
|--------|-------|-------|-------|
| `students/{id}/plans/` · `{pk}/` | GET, POST · GET, PATCH, DELETE | الخطط الشهرية | `assessments` |
| `students/{id}/plans/{pk}/attachments/` · `{aid}/` | GET, POST · DELETE | مرفقات الخطة | `assessments` |
| `plans/` | GET | كل الخطط الشهرية | `assessments` |
| `students/{id}/individual-plans/` · `{pk}/` | GET, POST · GET, PATCH, DELETE | الخطة الفردية | `individual_plans` |
| `individual-plans/` | GET | كل الخطط الفردية | `individual_plans` |
| `students/{id}/individual-plans/{pid}/analysis-sheets/` · `{sid}/` | GET, POST · GET, PATCH, DELETE | نماذج تحليل الأهداف — POST: `{goal, start_date}`، PATCH يقبل `achieved_dates: {"<sub_goal_id>"\|"goal": date}` | `individual_plans` |
| `students/{id}/quarterly-plans/` · `{pk}/` | GET, POST · GET, PATCH, DELETE | الخطط الفصلية | `quarterly_plans` |
| `quarterly-plans/` | GET | كل الخطط الفصلية | `quarterly_plans` |

### المقاييس

| المسار | الطرق | الوصف |
|--------|-------|-------|
| `assessments/` · `{pk}/` | GET, POST · GET, PATCH, DELETE | مكتبة المقاييس (بأقسامها وأسئلتها وتقديراتها) |
| `students/{id}/assessments/` · `{pk}/` | GET, POST · GET, PATCH, DELETE | تقييمات الطالب وإجاباتها |

العرض يتطلب `assessments.can_view`، والتعديل `assessments.can_edit`.

### الإعدادات والموارد العامة

| المسار | الطرق | الوصف | الصلاحية |
|--------|-------|-------|---------|
| `branches/` · `{pk}/` | GET, POST · PATCH, DELETE | الفروع | تعديل: admin |
| `buses/` · `{pk}/` | GET, POST · PATCH, DELETE | الباصات | تعديل: وحدة `buses` |
| `buses/mine/` | GET | «باصي» — فترات السائق/المشرف وطلابها (الاسم والعنوان فقط) | مسجّل |
| `buses/{id}/shifts/` · `{pk}/` | GET, POST · PATCH, DELETE | فترات التشغيل | تعديل: وحدة `buses` |
| `classrooms/` · `{pk}/` | GET, POST · PATCH, DELETE | الفصول | تعديل: وحدة `classrooms` |
| `settings/` | GET, PATCH | إعدادات المركز | تعديل: admin |
| `terms/` · `{pk}/` | GET, POST · PATCH, DELETE | الفصول الدراسية | تعديل: admin |
| `holidays/` · `{pk}/` | GET, POST · PATCH, DELETE | العطل الرسمية | تعديل: admin |
| `dashboard/stats/` | GET | إحصاءات لوحة التحكم | مسجّل |
| `reports/attendance/` | GET | تقرير الحضور | وحدة `reports` |
| `reports/attendance/export/` | GET | تصدير تقرير الحضور | وحدة `reports` |
| `audit-logs/` | GET | سجل العمليات | manager فأعلى |

---

## فلاتر البحث

`GET /api/students/?search=...&status=active&gender=male&payment_type=free`

| الفلتر | الوصف |
|--------|-------|
| `search` | بحث في أجزاء الاسم، رقم الهوية، رقم الملف |
| `name` | بحث في أجزاء الاسم فقط |
| `file_number` / `national_id` | بحث جزئي |
| `status` | pending / active / inactive / graduated / suspended / transferred / rejected |
| `gender` | male / female |
| `payment_type` | paid / free |
| `disability_type` | intellectual / autism / down / physical / hearing / visual / speech / learning / behavioral / multiple / other |
| `nationality` | نص (بحث جزئي) |
| `referral_source` | hospital / school / family / ngo / ministry / specialist / other |
| `branch` / `bus` / `classroom` | رقم المعرّف |
| `specialist` + `department` | عهدة أخصائي في قسم (admin أو الأخصائي نفسه فقط) |
| `registration_from` / `registration_to` | نطاق تاريخ التسجيل (YYYY-MM-DD) |
| `ordering` | first_name / family_name / registration_date / created_at / file_number (أضف `-` للتنازلي) |

---

## استيراد وتصدير البيانات

| المسار | الوصف | الصلاحية |
|--------|-------|---------|
| `GET students/export/` | تصدير Excel | `students.can_export` + البيانات السرية |
| `GET students/export/csv/` | تصدير CSV | `students.can_export` + البيانات السرية |
| `GET students/import/template/` | قالب Excel | مسجّل |
| `GET students/import/csv/template/` | قالب CSV | مسجّل |
| `POST students/import/` | استيراد Excel | `students.can_import` |
| `POST students/import/csv/` | استيراد CSV | `students.can_import` |

**خطوات الاستيراد:** حمّل القالب ← عبّئ البيانات ابتداءً من الصف الثاني ← ارفع الملف.

**أعمدة القالب:**

| العمود | الحقل | مثال |
|--------|-------|------|
| A | الاسم الأول * | محمد |
| B | اسم الأب * | أحمد |
| C | اسم الجد | سعد |
| D | اسم العائلة * | العتيبي |
| E | رقم الهوية * | 1234567890 |
| F | تاريخ الميلاد * | 2010-05-15 |
| G | الجنس * | ذكر |
| H | الجنسية * | سعودي |
| I | الحالة | نشط |
| J | تاريخ التسجيل | 2024-01-10 |
| K | نوع الإعاقة ودرجتها | طيف التوحد (متوسطة)، إعاقة حركية (شديدة) |
| L | التشخيص التفصيلي | — |
| M | درجة الذكاء | 85 |
| N | المستوى التعليمي | برنامج تربية خاصة |
| O | اسم المدرسة | — |
| P | الصف / المرحلة | — |
| Q | جهة الإحالة | مستشفى / عيادة |
| R | ملاحظات | — |

الاستجابة تُعيد: `{ created, skipped, errors: [{row, name, errors[]}] }`

> نوع التسجيل (مجاني/مدفوع) غير موجود في القالب، والطلاب المستوردون يُسجَّلون «مدفوع» افتراضيًا.

---

## بوابة أولياء الأمور (Flutter)

تطبيق جوال يعرض لولي الأمر بيانات ابنه وحضوره. المصادقة مستقلة عن JWT الموظفين: الدخول يرجع مفتاح جلسة (`GuardianAuthToken`) يُرسل في الهيدر `Authorization: Bearer <key>`.

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| POST | `portal/login/` | الدخول برقم الجوال + رقم الملف: `{"phone": "05XXXXXXXX", "file_number": "RW-2026-0001"}` |
| POST | `portal/logout/` | تسجيل الخروج |
| GET | `portal/dashboard/` | ملخص |
| GET | `portal/student/` | بيانات الطالب |
| GET | `portal/attendance/` | سجل الحضور |
| GET | `portal/virtual-sessions/` | الحصص الأونلاين الجارية والقادمة (14 يومًا) لفصل الطالب |
| POST | `portal/virtual-sessions/{id}/join/` | رابط الدخول وكلمة المرور واسم العرض — ويسجّل حضور الطالب |

رقم الجوال يُقبل بصيغة `05XXXXXXXX` أو `5XXXXXXXX`، ويُطابق مع `phone` أو `phone_alt` لأي ولي أمر مسجل للطالب.

> **مؤجل:** صفحة ويب مؤقتة لأولياء الأمور (`frontend/src/app/parent/` + `frontend/src/lib/portalApi.ts`) موجودة محليًا **ولم تُرفع**، بانتظار قرار طريقة الدخول (جوال + رقم ملف أحد الأبناء، أو جوال + OTP) وعرض كل أبناء ولي الأمر بدخول واحد.

---

## الفصول الافتراضية (Zoho Meeting)

حصص أونلاين لكل فصل، **مسجّلة إلزاميًا** (متطلب الوزارة)، والتسجيلات تُؤرشف خارج Zoho. الكود: `backend/apps/virtual_classes/`، الواجهة: `/virtual-classes`.

### كيف تعمل

1. **ربط حساب المعلم:** كل معلم فصل يضغط مرة «ربط حساب Zoho» بصفحة الفصول الافتراضية ← يسجّل دخول Zoho ويوافق ← يرجع للمنصة. يُرفض الربط لو إيميل حساب Zoho لا يطابق إيميله في المنصة، أو الحساب خارج منظمة المركز.
2. **الجدولة:** تُنشأ الحصة لفصل **معلمه رابط حساب Zoho** فقط (لا رجوع لحساب المركز) — الاجتماع يُنشأ بحساب المعلم ويصير هو المضيف، فيمكن تشغيل حصص متزامنة لمعلمين مختلفين. الحساب المضيف يُثبَّت على الحصة (`VirtualSession.zoho_account`) ويُستخدم للتعديل والإلغاء وجلب التسجيلات. الحصص القديمة على حساب المركز (`zoho_account=null`) تبقى تعمل.
3. **البدء:** «ابدأ الحصة» يفتح رابط المضيف — **المعلم يشغّل التسجيل بعد البدء**.
4. **دخول الطلاب:** من تطبيق أولياء الأمور (زر «الحصص»)، نافذة الدخول من 10 دقائق قبل البداية إلى 15 دقيقة بعد النهاية، ويُسجَّل الحضور تلقائيًا (`SessionAttendance`).
5. **الأرشفة:** خدمة الجدولة كل 15 دقيقة تكتشف التسجيلات (حالة `UPLOADED` في Zoho) وتحمّلها لتخزين التسجيلات، وزر «مزامنة» على الحصة يفعل نفس الشيء فورًا.
6. **المشاهدة:** من «السابقة والتسجيلات» داخل المنصة برابط مؤقت موقّع (3 ساعات)، مع التقديم والتأخير.

### النماذج

| النموذج | الوصف |
|---------|-------|
| `ZohoAccount` | حساب Zoho لمعلم: `user` (1:1)، `zuid`، `zsoid`، `email`، `refresh_token` (لا يُعرض بأي شاشة) |
| `VirtualSession` | الحصة: الفصل، العنوان، الموعد، المدة، الحالة (`scheduled`/`cancelled`)، بيانات اجتماع Zoho، `zoho_account` المضيف. `live_state` محسوب: upcoming / live / ended / cancelled |
| `SessionRecording` | تسجيل: `zoho_recording_id`، الملف، الحجم، الحالة (`pending`/`archived`/`failed` بعد 5 محاولات)، `storage_backend` (`remote`/`local`) |
| `SessionAttendance` | حضور الطالب للحصة: أول/آخر دخول، عدد مرات الدخول |

### API — `/api/virtual-classes/`

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| GET, POST | `sessions/?when=upcoming\|past&classroom=` | قائمة الحصص / الجدولة (ينشئ اجتماع Zoho) |
| GET, PATCH, DELETE | `sessions/{id}/` | تفاصيل / تعديل (يحدّث Zoho) / إلغاء (يحذف اجتماع Zoho لو لم يبدأ) |
| POST | `sessions/{id}/start/` | رابط بدء المضيف (معلم الفصل أو الإدارة) |
| POST | `sessions/{id}/sync/` | فحص التسجيلات فورًا وأرشفتها بالخلفية |
| GET | `sessions/{id}/attendance/` | حضور طلاب الفصل للحصة |
| GET | `recordings/{id}/play/` | رابط مشاهدة مؤقت |
| GET, POST | `zoho-recordings/` | استيراد تسجيلات قديمة من حساب المركز (`virtual_classes.can_import`) |
| GET, POST, DELETE | `zoho/connect/` | حالة ربط حساب المستخدم / رابط بدء الربط / إلغاء الربط |
| GET | `zoho/callback/` | يرجع له Zoho بعد الموافقة (بلا JWT — الهوية من `state` موقَّع، صالح 15 دقيقة) |

الصفوف المرئية: مدير النظام الكل، معلم الفصل فصوله، صاحب وحدة `virtual_classes` فصول فروعه. `GET /api/classrooms/` يرجع `teacher_zoho_linked` لتعطيل الفصول غير الجاهزة بنافذة الجدولة.

### Zoho — ملاحظات تقنية

- مركز البيانات **السعودي**: `accounts.zoho.sa` / `meeting.zoho.sa` / `files.zoho.sa`. المنظمة `zsoid=150000862044`، الخطة Workplace Standard (100 مشارك).
- **عميلان في api-console.zoho.sa:**
  - **Self Client** (`ZOHO_CLIENT_ID`/`ZOHO_CLIENT_SECRET`/`ZOHO_REFRESH_TOKEN`) — حساب المركز، للحصص القديمة واستيراد التسجيلات.
  - **Server-based «Roya ERP»** (`ZOHO_WEB_CLIENT_ID`/`ZOHO_WEB_CLIENT_SECRET`) — ربط حسابات المعلمين. Redirect URI المسجّل: `https://roya-backend-production.up.railway.app/api/virtual-classes/zoho/callback/` (لازم يطابق `ZOHO_WEB_REDIRECT_URI`).
- **الصلاحيات المطلوبة** (متحقَّق منها): `ZohoMeeting.meeting.ALL, ZohoMeeting.recording.ALL, ZohoMeeting.manageOrg.READ, ZohoMeeting.meetinguds.READ, ZohoFiles.files.READ, WorkDrive.files.READ` — بدون آخر ثلاث يفشل تحميل ملف التسجيل (401/403).
- خانة المقدّم (`presenter`) في Zoho تقبل `zuid` رقمي فقط (الإيميل يُرفض)، وواجهات قائمة مستخدمي المنظمة غير متاحة لحساب المركز — لهذا اعتُمد ربط كل معلم لحسابه.

### تخزين التسجيلات

- **Cloudflare R2**، مخزن خاص `rwad-recordings` (Public access مقفول) — منفصل عن مخزن الملفات العامة `rwad-altaheel` لأن روابطه عامة. `apps/virtual_classes/storage.py`: وجود `RECORDINGS_BUCKET_NAME` يفعّل R2/S3 بروابط موقّعة، وغيابه = قرص الخادم (يُمسح مع كل نشر على Railway).
- `python manage.py sync_zoho_recordings [--days 7] [--repair]` — `--repair` يعيد للأرشفة أي تسجيل «مؤرشف» ملفه مفقود من التخزين (يُحمَّل من Zoho من جديد)؛ مع R2 يفحص فقط ما حُفظ قبل تفعيله (`storage_backend != remote`).

---

## إعدادات JWT

| الإعداد | القيمة |
|---------|--------|
| Access Token | 8 ساعات |
| Refresh Token | 7 أيام (يتجدد مع كل استخدام، والقديم يُلغى) |
| Algorithm | HS256 |

---

## إعداد بيئة التطوير

راجع [SETUP.md](SETUP.md) للتعليمات التفصيلية.

بيئة التطوير تستخدم SQLite افتراضيًا. لاستخدام PostgreSQL محليًا اضبط `USE_POSTGRES=true`.

---

## النشر على Railway

النشر **تلقائي**: أي push على فرع `master` يجعل Railway يسحب التحديث وينشره.

**Backend** — الملف `backend/railway.json` يشغّل عند كل deploy:
1. `migrate` — تطبيق migrations جديدة (تحديث قاعدة البيانات تلقائي)
2. `collectstatic` — جمع الملفات الثابتة
3. `create_default_users` — إنشاء المستخدمين الافتراضيين إذا لم يكونوا موجودين
4. `gunicorn` — تشغيل الخادم

**Frontend** — `frontend/railway.json` يشغّل `npm run start` بعد البناء. أي خطأ TypeScript يُفشل البناء، فتأكد من `npx tsc --noEmit` قبل الرفع.

> قاعدة البيانات **لا تُحذف** عند التحديث — البيانات محفوظة.

**خدمات Railway:**

| الخدمة | الوصف |
|--------|-------|
| `ROYA-BACKEND` | الـ API — `roya-backend-production.up.railway.app` |
| `Rwad-ERP` | الواجهة — `rwad-erp-production.up.railway.app` / `www.royaerp.com` |
| `Postgres` | قاعدة البيانات |
| `recordings-cron` | **Cron كل 15 دقيقة** (`*/15 * * * *`) — Root Directory `/backend`، Custom Start Command: `DJANGO_SETTINGS_MODULE=rwad_erp.settings.production python manage.py sync_zoho_recordings --repair`. متغيراتها مربوطة بالـ backend: `${{ROYA-BACKEND.VAR}}` (الأحرف الكبيرة مهمة) و`DATABASE_URL=${{Postgres.DATABASE_URL}}`، وتحتاج `SECRET_KEY` و`ZOHO_*` و`ZOHO_WEB_*` و`RECORDINGS_*`. التحقق: Cron Runs ← View logs |

> **⚠️ Config-as-code (`railway.json`) يتوقف في Railway بتاريخ 2026-12-01.** قبلها انسخ أمر التشغيل أعلاه إلى **Settings ← Deploy ← Custom Start Command** لخدمة `ROYA-BACKEND` (وأمر الواجهة لخدمتها)، حتى لا يتعطل النشر.

### المتغيرات البيئية (Production)

| المتغير | الوصف |
|---------|-------|
| `SECRET_KEY` | مفتاح Django السري |
| `DATABASE_URL` | رابط PostgreSQL (Railway يوفره تلقائياً) |
| `DJANGO_SETTINGS_MODULE` | `rwad_erp.settings.production` |
| `ALLOWED_HOSTS` | النطاقات المسموح بها (مفصولة بفواصل) |
| `CORS_ALLOWED_ORIGINS` | عناوين Frontend المسموح بها |
| `DEFAULT_ADMIN_PASSWORD` / `DEFAULT_MANAGER_PASSWORD` / `DEFAULT_SPECIALIST_PASSWORD` / `DEFAULT_RECEPTION_PASSWORD` | كلمات مرور المستخدمين الافتراضيين عند أول إنشاء — إذا لم تُضبط تُولَّد عشوائيًا وتُطبع في سجل النشر |
| `AWS_STORAGE_BUCKET_NAME` | تفعيل تخزين الملفات على S3 / R2 — **بدونه تضيع الملفات المرفوعة عند كل deploy** |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | مفاتيح التخزين |
| `AWS_S3_ENDPOINT_URL` | رابط R2 (لـ Cloudflare R2 فقط) |
| `AWS_S3_REGION_NAME` / `AWS_S3_CUSTOM_DOMAIN` | اختياري |
| `ZOHO_CLIENT_ID` / `ZOHO_CLIENT_SECRET` / `ZOHO_REFRESH_TOKEN` | Self Client لحساب المركز |
| `ZOHO_ORG_ID` / `ZOHO_PRESENTER_ID` | `zsoid` المنظمة و`zuid` حساب المركز |
| `ZOHO_WEB_CLIENT_ID` / `ZOHO_WEB_CLIENT_SECRET` | عميل Server-based لربط حسابات المعلمين |
| `ZOHO_WEB_REDIRECT_URI` | اختياري — الافتراضي رابط الـ callback على `roya-backend-production` |
| `ZOHO_ACCOUNTS_URL` / `ZOHO_MEETING_URL` | اختياري — الافتراضي `zoho.sa` |
| `RECORDINGS_BUCKET_NAME` | مخزن التسجيلات الخاص (`rwad-recordings`) — بدونه تُحفظ على القرص وتُمسح مع النشر |
| `RECORDINGS_ENDPOINT_URL` | `https://<Account ID>.r2.cloudflarestorage.com` |
| `RECORDINGS_REGION_NAME` | `auto` لـ R2 |
| `RECORDINGS_ACCESS_KEY_ID` / `RECORDINGS_SECRET_ACCESS_KEY` | توكن R2 بصلاحية Object Read & Write على `rwad-recordings` فقط |
| `RECORDINGS_URL_EXPIRE_SECONDS` | اختياري — مدة رابط المشاهدة (الافتراضي 10800 = 3 ساعات) |

---

## سجل التحديثات

### 3–5 نوفمبر 2026

**الفصول الافتراضية**
- بناء وحدة الحصص الأونلاين عبر Zoho Meeting: الجدولة من المنصة، رابط بدء المضيف، دخول الطلاب من تطبيق أولياء الأمور مع تسجيل الحضور، أرشفة التسجيلات وتشغيلها داخل المنصة، واستيراد التسجيلات القديمة.
- نقل تخزين التسجيلات من قرص Railway (كان يُمسح مع كل نشر) إلى مخزن R2 خاص، مع استرجاع التسجيلات الممسوحة من Zoho (`--repair`) وخدمة Cron كل 15 دقيقة.
- ربط حساب Zoho لكل معلم (OAuth) بشرط تطابق الإيميل؛ الجدولة صارت مشروطة بربط معلم الفصل لحسابه.

**الخطط وتحليل الأهداف**
- أهداف فرعية للخطة الفصلية والخطة الفردية، بتقييم تلقائي للهدف الرئيسي قابل للتعديل اليدوي.
- تحليل الأهداف: نموذج لكل هدف بدل نموذج لكل مجال، بنوده الأهداف الفرعية، مع تقسيم النماذج القديمة تلقائيًا.
- أيام التحليل تتخطى الإجازة الأسبوعية والعطل الرسمية من الإعدادات، والبداية من أي يوم بحروف أيام صحيحة، وزر «حذف الشهر».

**الجدول الدراسي**
- فترتان صباحي (6:30–11:30) ومسائي (12:30–5:30) مثل النموذج الورقي، بريك وأعمال مكتبية، «الفترة الدراسية» للطالب، وزرّا صباحي/مسائي في «جدولي».

**الصلاحيات وحماية البيانات**
- إصلاح قطع القوائم عند 20 صفًا (مستفيدو المختص، طلاب الباص والفصل، اختيار طلاب الحصة الجماعية).
- طاقم النقل: دور «مسؤول الحركة» جديد، وصفحة «باصي» للسائق/المشرف، ومنع كامل لبيانات المستفيدين.
- إغلاق ثغرة: المستخدم بلا فرع كان يرى كل الطلاب — صار لا يرى شيئًا (إلا المدير).
- البيانات السرية: إخفاء الهويات وتواصل أولياء الأمر ودراسة الحالة وصور الهوية وكرت العائلة عمّن ليس له صلاحية «البيانات السرية».

**الباصات**
- تاريخ بداية وانتهاء التأمين مع تنبيه الانتهاء.

**معلّق / للمتابعة**
- إعادة توليد Client Secret لعميلي Zoho (ظهرا أثناء الإعداد).
- نسخ أوامر التشغيل لإعدادات خدمات Railway قبل توقف Config-as-code (2026-12-01).
- صفحة ولي الأمر المؤقتة وطريقة الدخول (غير مرفوعة).
- من «متطلبات المنصة حاليًا» (الإدارة): تسمية «تكرار» و«التقرير الشهري الخاص بالمعلم»، دور المشرف التربوي، صلاحية مديرة فرع الزلفي إناث للإسناد، تكملة تحليل الأهداف (تاريخ انتهاء يدوي، تعديل يوم بعينه، مرفقات)، خطط وتقارير الأقسام مع PDF، جدول الجلسات، تصنيف الحالات (وزاري/مجاني/مدفوع)، نماذج الاجتماعي والطبي، بنك الأهداف، الأرشيف، التواصل مع الأهل والمكتبة، قسم التأهيل المهني، الشكاوى، وأوقات جدول مرنة لكل فرع/مختص.
