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
- [الإعدادات والنشر](#إعدادات-jwt)

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
│   │   └── core/                   ← الفروع، الباصات، الفصول، الإعدادات، التقارير، سجل العمليات
│   ├── manage.py
│   ├── railway.json                ← أمر التشغيل على Railway
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
| الجدول الدراسي | `/schedules` | جدول أسبوعي (الأحد–الخميس، 8 حصص من 7:30 إلى 11:30) + إنشاء جماعي |
| القسم الطبي | `/medical` | كشف التشيك إن الطبي اليومي |
| الخطط الشهرية | `/plans` | خطة لكل طالب بـ6 مجالات نمائية + مرفقات Word/Excel |
| الخطة الفردية | `/individual-plans` | أهداف متعددة لكل مجال بتاريخ وتقييم بعدي |
| تحليل الأهداف | `/students/{id}/individual-plans/{planId}/analysis` | متابعة يومية لأهداف الخطة الفردية لكل مجال لمدة شهر + طباعة بشكل النموذج الورقي |
| الخطط الفصلية | `/quarterly-plans` | نفس هيكل الفردية بفترة فصلية وأخصائي مسؤول |
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

> مدير النظام (`admin`) يتجاوز كل فحوصات الصلاحيات ويرى كل الطلاب.

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
5. غير ذلك ← كل الطلاب.

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
  ├── IndividualPlan (many) → IndividualPlanGoal, GoalAnalysisSheet
  ├── QuarterlyPlan (many) → QuarterlyPlanGoal
  ├── StudentAssessment (many) → StudentAssessmentAnswer
  ├── StudentMedicalProfile (1)
  ├── MedicalVisit (many)
  ├── Medication (many)
  └── DailyMedicalCheckIn (many) → MedicationAdministration

Branch (1) → Bus (many) → BusShift (صباحي/مسائي)
Branch (1) → Classroom (many)
User (1) → UserModulePermission (many), SpecialistCertificate (many)
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

حصة واحدة لكل (طالب، يوم، وقت). الأيام: الأحد–الخميس. الأوقات الثابتة: 7:30، 8:00، 8:30، 9:00، 9:30، 10:00، 10:30، 11:00. الحقول: `subject` المادة، `specialist` الأخصائي، `notes`.

### الخطط

| النموذج | الوصف |
|---------|-------|
| `Plan` | خطة شهرية: معلم/ة، تاريخ بداية ونهاية |
| `PlanGoal` | نص الأهداف لكل مجال من 6 ثابتة: الاجتماعي، الاستقلالي، المعرفي، التواصل، الإدراكي، الحركي |
| `PlanAttachment` | ملف Word/Excel جاهز للخطة |
| `IndividualPlan` | خطة فردية + ملاحظات |
| `IndividualPlanGoal` | `domain` (نص حر)، `goal_text`، `start_date`، `end_date`، `post_evaluation`، `order`، `achieved_date` |
| `GoalAnalysisSheet` | نموذج تحليل الأهداف: `domain`، `start_date`، `ratings`، `teaching_aids`، `teacher_note` |
| `QuarterlyPlan` | خطة فصلية: أخصائي مسؤول، تاريخ بداية ونهاية الفصل، ملاحظات |
| `QuarterlyPlanGoal` | نفس حقول هدف الخطة الفردية |

**المجالات الافتراضية** للخطة الفردية والفصلية (يمكن حذفها أو إضافة غيرها): الإدراكي، الحركي الدقيق، الحركي الكبير، الاجتماعي، الاستقلالي، الانتباه والتركيز، التخاطب.

**التقييم البعدي:** `achieved` تحقق · `partial` نوعًا ما · `not_achieved` لم يتحقق · `not_applicable` لم يطبق.

### تحليل الأهداف

نموذج متابعة يومية للخطة الفردية، بنفس تخطيط «نموذج جمع البيانات» الورقي:

- نموذج لكل مجال في الخطة، وصفوفه هي أهداف المجال (تنزل تلقائيًا من الخطة).
- كل نموذج = شهر متابعة: 20 يوم دراسي (الأحد–الخميس) تبدأ من `start_date`، والتواريخ تُحسب تلقائيًا. بعد الشهر يُفتح نموذج جديد ويبقى السابق محفوظًا.
- `ratings`: `{"<goal_id>": [20 قيمة]}`، كل قيمة: `0` لم يُقيَّم · `1` مستقل (أنجز) · `2` إيمائية · `3` مساعدة لفظية · `4` مساعدة جزئية.
- تاريخ إنجاز الهدف يُحفظ على الهدف نفسه (`IndividualPlanGoal.achieved_date`).
- اسم المعلمة في الرأس: معلم/ة فصل الطالب، وإلا من أنشأ الخطة.

> تعديل الخطة الفردية يُحدِّث الأهداف بمعرّفاتها (`id`) بدل حذفها وإعادة إنشائها، حتى تبقى تقييمات تحليل الأهداف مربوطة بأهدافها.

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
| `Bus` | الباص: رقم الهيكل واللوحة، الماركة، سنة الصنع، الفرع، انتهاء الاستمارة والفحص |
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
| `students/{id}/individual-plans/{pid}/analysis-sheets/` · `{sid}/` | GET, POST · GET, PATCH, DELETE | نماذج تحليل الأهداف (PATCH يقبل `achieved_dates: {goal_id: date}`) | `individual_plans` |
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
| `GET students/export/` | تصدير Excel | `students.can_export` |
| `GET students/export/csv/` | تصدير CSV | `students.can_export` |
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

رقم الجوال يُقبل بصيغة `05XXXXXXXX` أو `5XXXXXXXX`، ويُطابق مع `phone` أو `phone_alt` لأي ولي أمر مسجل للطالب.

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
