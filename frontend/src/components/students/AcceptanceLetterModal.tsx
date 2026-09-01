'use client';

import { useQuery } from '@tanstack/react-query';
import { X, Printer, MessageSquare, CheckCircle, FileText, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatWhatsAppPhone } from '@/lib/utils';
import { siteSettingsApi } from '@/lib/api';
import type { Student, SiteSettings } from '@/types';

interface Props {
  student: Student;
  onClose: () => void;
}

const DEFAULT_NAME_AR = 'مركز رؤية للتأهيل';
const DEFAULT_NAME_EN = 'Roya Rehabilitation Center';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayArabic(): string {
  return new Date().toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Letter HTML (full printable document) ─────────────────────────────────────

interface CenterInfo {
  nameAr: string;
  nameEn: string;
  phone: string;
  website: string;
  logoUrl: string | null;
  initial: string;
}

function buildLetterHTML(student: Student, guardianName: string, today: string, center: CenterInfo): string {
  const branchRow = student.branch_name
    ? `<tr><td>الفرع:</td><td>${student.branch_name}</td></tr>`
    : '';
  const logoHTML = center.logoUrl
    ? `<img src="${center.logoUrl}" alt="الشعار" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : center.initial;
  const contactLine = [center.phone, center.website].filter(Boolean).join('&nbsp;&nbsp;|&nbsp;&nbsp;');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>إشعار قبول — ${student.full_name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{
  font-family:'Cairo','Segoe UI',Tahoma,Arial,sans-serif;
  background:#eef2f7;color:#1a202c;
  direction:rtl;padding:40px 20px;
}
.page{
  background:#fff;max-width:740px;margin:0 auto;
  padding:52px 60px;
  box-shadow:0 8px 30px rgba(0,0,0,.14);
  border-radius:6px;position:relative;
  border-top:7px solid #0F2A47;
}
/* watermark */
.page::after{
  content:'${center.nameAr}';
  position:absolute;top:50%;left:50%;
  transform:translate(-50%,-50%) rotate(-30deg);
  font-size:90px;font-weight:800;
  color:rgba(15,42,71,.04);
  pointer-events:none;white-space:nowrap;
}
/* ─ header ─ */
.hdr{display:flex;align-items:center;gap:16px;
  padding-bottom:22px;border-bottom:2px solid #e2e8f0;margin-bottom:24px}
.logo{
  width:68px;height:68px;border-radius:50%;
  background:#0F2A47;display:flex;align-items:center;
  justify-content:center;color:#fff;font-size:30px;font-weight:800;
  flex-shrink:0;
}
.org{flex:1;text-align:center}
.org h1{font-size:22px;font-weight:800;color:#0F2A47}
.org p{font-size:12px;color:#718096;margin-top:3px}
/* ─ badge ─ */
.badge{
  background:#0F2A47;color:#fff;text-align:center;
  padding:13px 0;border-radius:8px;margin-bottom:24px;
  font-size:17px;font-weight:700;letter-spacing:.4px;
}
/* ─ meta ─ */
.meta{display:flex;justify-content:space-between;
  font-size:12px;color:#718096;margin-bottom:22px}
/* ─ body ─ */
.salutation{font-size:14px;font-weight:700;margin-bottom:16px}
.para{font-size:13.5px;line-height:2.1;color:#374151;
  margin-bottom:16px;text-align:justify}
/* ─ info card ─ */
.card{
  background:#f7faff;border:1px solid #dde8f5;
  border-right:5px solid #0F2A47;
  border-radius:6px;padding:20px 24px;margin:22px 0;
}
.card h3{font-size:12px;font-weight:800;color:#0F2A47;
  text-transform:uppercase;letter-spacing:.6px;margin-bottom:14px}
.card table{width:100%;border-collapse:collapse}
.card td{padding:7px 0;font-size:13px;vertical-align:top}
.card td:first-child{color:#6b7280;width:40%;padding-left:12px}
.card td:last-child{font-weight:700;color:#111827}
/* ─ signature ─ */
.sig-row{
  margin-top:38px;display:flex;
  justify-content:space-between;align-items:flex-end;
}
.sig-block{font-size:13px;line-height:1.9}
.sig-block strong{display:block;color:#0F2A47;margin-top:6px}
.stamp{
  width:88px;height:88px;border-radius:50%;
  border:2.5px dashed #cbd5e0;
  display:flex;align-items:center;justify-content:center;
  color:#cbd5e0;font-size:11px;text-align:center;
}
/* ─ footer ─ */
.footer{
  margin-top:26px;padding-top:14px;
  border-top:1px solid #e2e8f0;
  text-align:center;color:#9ca3af;font-size:11px;
}
@media print{
  body{background:#fff;padding:0}
  .page{box-shadow:none;border-radius:0;padding:30px 44px}
  @page{margin:1.5cm}
}
</style>
</head>
<body>
<div class="page">
  <div class="hdr">
    <div class="logo">${logoHTML}</div>
    <div class="org">
      <h1>${center.nameAr}</h1>
      ${center.nameEn ? `<p>${center.nameEn}</p>` : ''}
    </div>
    <div style="width:68px"></div>
  </div>

  <div class="badge">✓&ensp;إشعار قبول وتسجيل</div>

  <div class="meta">
    <span>التاريخ: ${today}</span>
    <span>رقم الإشعار: ${student.file_number}</span>
  </div>

  <p class="salutation">
    السيد / السيدة&ensp;${guardianName}&ensp;&mdash;&ensp;ولي أمر المستفيد&ensp;&nbsp; حفظه الله
  </p>

  <p class="para">السلام عليكم ورحمة الله وبركاته،</p>

  <p class="para">
    يسعد إدارة ${center.nameAr} أن تُبشّركم بقبول وتسجيل ابنكم / كريمتكم في المركز،
    وذلك بعد استيفاء جميع الشروط والمتطلبات المطلوبة. ونسأل الله تعالى أن يُوفّق
    الجميع لما فيه خير المستفيد وأسرته الكريمة.
  </p>

  <div class="card">
    <h3>بيانات المستفيد</h3>
    <table>
      <tr><td>الاسم الكامل:</td><td>${student.full_name}</td></tr>
      <tr><td>رقم الملف:</td><td>${student.file_number}</td></tr>
      <tr><td>رقم الهوية / الإقامة:</td><td>${student.national_id}</td></tr>
      <tr><td>تاريخ القبول:</td><td>${today}</td></tr>
      ${branchRow}
    </table>
  </div>

  <p class="para">
    نأمل منكم مراجعة المركز للاطلاع على البرنامج التفصيلي، والمواعيد، والأنظمة الداخلية.
    وللاستفسار يرجى التواصل مع إدارة المركز في أوقات الدوام الرسمي.
  </p>

  <div class="sig-row">
    <div class="sig-block">
      <span>مع خالص التحيات،</span>
      <strong>إدارة ${center.nameAr}</strong>
      <span style="color:#9ca3af;font-size:12px">${today}</span>
    </div>
    <div class="stamp">الخاتم<br>الرسمي</div>
  </div>

  ${contactLine ? `<div class="footer" style="border-top:0;padding-top:0;margin-top:14px;color:#6b7280;font-size:12px" dir="ltr">${contactLine}</div>` : ''}

  <div class="footer">
    صدر هذا الإشعار إلكترونياً &nbsp;|&nbsp; جميع الحقوق محفوظة © ${center.nameAr}
  </div>
</div>
</body>
</html>`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AcceptanceLetterModal({ student, onClose }: Props) {
  const primaryGuardian =
    student.guardians?.find((g) => g.is_primary_contact) ||
    student.guardians?.[0];

  const today = todayArabic();
  const guardianName = primaryGuardian?.full_name || '...............';

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn:  () => siteSettingsApi.get().then(r => r.data),
  });

  const nameAr = settings?.center_name_ar || DEFAULT_NAME_AR;
  const center = {
    nameAr,
    nameEn:  settings?.center_name_en || DEFAULT_NAME_EN,
    phone:   settings?.phone || '',
    website: settings?.website || '',
    logoUrl: settings?.logo ? `${process.env.NEXT_PUBLIC_MEDIA_URL}${settings.logo}` : null,
    initial: nameAr.trim().charAt(0) || 'ر',
  };

  // ── Print / Save PDF ──────────────────────────────────────────────────────
  const handlePrint = () => {
    const html = buildLetterHTML(student, guardianName, today, center);
    const win = window.open('', '_blank', 'width=820,height=960');
    if (!win) {
      toast.error('يرجى السماح بفتح النوافذ المنبثقة في المتصفح');
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 700);
  };

  // ── WhatsApp ──────────────────────────────────────────────────────────────
  const handleWhatsApp = () => {
    if (!primaryGuardian?.phone) {
      toast.error('لا يوجد رقم جوال لولي الأمر');
      return;
    }
    const phone = formatWhatsAppPhone(primaryGuardian.phone);
    const msg = [
      'بسم الله الرحمن الرحيم',
      '',
      `🌟 *${center.nameAr}*`,
      '*إشعار قبول وتسجيل* ✅',
      '──────────────────',
      `ولي أمر المستفيد / *${primaryGuardian.full_name}*`,
      '',
      'يسعدنا إعلامكم بقبول وتسجيل المستفيد:',
      `👤 *الاسم:* ${student.full_name}`,
      `📁 *رقم الملف:* ${student.file_number}`,
      `📅 *تاريخ القبول:* ${today}`,
      student.branch_name ? `🏢 *الفرع:* ${student.branch_name}` : '',
      '',
      'نرجو التواصل مع إدارة المركز للاطلاع على البرنامج والمواعيد.',
      center.phone ? `📞 ${center.phone}` : '',
      center.website ? `🌐 ${center.website}` : '',
      '',
      `💙 *مع تحيات إدارة ${center.nameAr}*`,
    ].filter(Boolean).join('\n');

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-auto" dir="rtl">

        {/* ── Modal header ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 bg-green-50 border-b border-green-100 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-green-600" />
            <div>
              <h2 className="font-bold text-gray-800">إشعار القبول</h2>
              <p className="text-xs text-gray-500">{student.full_name} — {student.file_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* ── Letter preview ───────────────────────────────── */}
        <div className="p-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-inner overflow-hidden">

            {/* Top bar */}
            <div className="h-1.5 bg-gradient-to-l from-[#0F2A47] via-[#1E3A5F] to-[#0F2A47]" />

            <div className="p-5 text-sm" dir="rtl">
              {/* Center header */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-4">
                <div className="w-11 h-11 rounded-full bg-[#0F2A47] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 overflow-hidden">
                  {center.logoUrl
                    ? <img src={center.logoUrl} alt="الشعار" className="w-full h-full object-cover" />
                    : center.initial}
                </div>
                <div className="flex-1 text-center">
                  <p className="font-bold text-gray-800">{center.nameAr}</p>
                  {center.nameEn && <p className="text-[11px] text-gray-400">{center.nameEn}</p>}
                </div>
                <div className="w-11" />
              </div>

              {/* Badge */}
              <div className="bg-[#0F2A47] text-white text-center py-2.5 rounded-lg mb-4 font-semibold text-[13px]">
                ✓ إشعار قبول وتسجيل
              </div>

              {/* Meta */}
              <div className="flex justify-between text-[11px] text-gray-400 mb-3">
                <span>التاريخ: {today}</span>
                <span>رقم الملف: {student.file_number}</span>
              </div>

              {/* Salutation */}
              <p className="font-semibold mb-2 text-[13px]">
                السيد / السيدة {guardianName} — ولي أمر المستفيد
              </p>
              <p className="text-[12px] text-gray-500 mb-3">السلام عليكم ورحمة الله وبركاته،</p>
              <p className="text-[12px] text-gray-600 mb-4 leading-relaxed">
                يسعد إدارة {center.nameAr} أن تُبشّركم بقبول وتسجيل ابنكم / كريمتكم في المركز...
              </p>

              {/* Student card */}
              <div className="bg-blue-50 border border-blue-100 border-r-4 border-r-[#0F2A47] rounded-lg p-3 mb-4">
                <p className="text-[11px] font-bold text-[#0F2A47] uppercase tracking-wide mb-2">بيانات المستفيد</p>
                <table className="w-full text-[12px]">
                  <tbody>
                    <tr>
                      <td className="text-gray-400 pb-1.5 w-[42%]">الاسم الكامل:</td>
                      <td className="font-bold text-gray-800 pb-1.5">{student.full_name}</td>
                    </tr>
                    <tr>
                      <td className="text-gray-400 pb-1.5">رقم الملف:</td>
                      <td className="font-bold text-gray-800 pb-1.5">{student.file_number}</td>
                    </tr>
                    <tr>
                      <td className="text-gray-400 pb-1.5">رقم الهوية:</td>
                      <td className="font-bold text-gray-800 pb-1.5">{student.national_id}</td>
                    </tr>
                    <tr>
                      <td className="text-gray-400">تاريخ القبول:</td>
                      <td className="font-bold text-gray-800">{today}</td>
                    </tr>
                    {student.branch_name && (
                      <tr>
                        <td className="text-gray-400 pt-1.5">الفرع:</td>
                        <td className="font-bold text-gray-800 pt-1.5">{student.branch_name}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signature row */}
              <div className="flex justify-between items-end pt-2">
                <div className="text-[12px] text-gray-600">
                  <p>مع خالص التحيات،</p>
                  <p className="font-bold text-[#0F2A47] mt-1">إدارة {center.nameAr}</p>
                </div>
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-300 text-center leading-tight">
                  الخاتم
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Guardian info / warning ──────────────────────── */}
        <div className="px-5 pb-1">
          {primaryGuardian ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <FileText size={15} className="text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800 text-sm truncate">{primaryGuardian.full_name}</p>
                <p className="text-xs text-gray-500" dir="ltr">{primaryGuardian.phone}</p>
              </div>
              <span className="text-xs text-green-600 font-medium shrink-0">جاهز للإرسال</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700">لا يوجد ولي أمر — أضف ولي أمر لتفعيل إرسال واتساب</p>
            </div>
          )}
        </div>

        {/* ── Action buttons ───────────────────────────────── */}
        <div className="flex flex-wrap gap-3 justify-end px-5 py-4 mt-2 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary">إغلاق</button>

          <button
            onClick={handleWhatsApp}
            disabled={!primaryGuardian?.phone}
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm"
          >
            <MessageSquare size={15} />
            إرسال واتساب
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#0F2A47] hover:bg-[#1a3d66] text-white font-medium py-2 px-4 rounded-xl transition-colors text-sm"
          >
            <Printer size={15} />
            طباعة / حفظ PDF
          </button>
        </div>
      </div>
    </div>
  );
}
