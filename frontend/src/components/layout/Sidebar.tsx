'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  UserCog,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  CalendarDays,
  CalendarClock,
  Bus,
  GraduationCap,
  Stethoscope,
  ClipboardCheck,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { authApi, siteSettingsApi } from '@/lib/api';
import type { SiteSettings } from '@/types';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const navItems = [
  { href: '/dashboard',  label: 'الرئيسية',       icon: LayoutDashboard },
  { href: '/students',   label: 'ملفات الطلاب',   icon: Users },
  { href: '/attendance', label: 'الحضور والغياب',  icon: CalendarDays },
  { href: '/schedules',  label: 'الجداول الدراسية', icon: CalendarClock },
  { href: '/classrooms', label: 'الفصول',          icon: GraduationCap },
  { href: '/medical',    label: 'القسم الطبي',      icon: Stethoscope,   medicalOnly: true },
  { href: '/assessments', label: 'المقاييس والخطط الدراسية', icon: ClipboardCheck, assessmentsOnly: true },
  { href: '/users',      label: 'المستخدمون',      icon: UserCog,       adminOnly: true },
  { href: '/reports',    label: 'التقارير',         icon: BarChart3,     reportsOnly: true },
  { href: '/audit-logs', label: 'سجل العمليات',    icon: ClipboardList, managerOnly: true },
  { href: '/buses',      label: 'الباصات',          icon: Bus,           adminOnly: true },
  { href: '/settings',   label: 'الإعدادات',        icon: Settings,      adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  // إغلاق القائمة تلقائيًا بالجوال بعد الانتقال لصفحة جديدة
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ['site-settings'],
    queryFn:  () => siteSettingsApi.get().then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const centerName   = settings?.center_name_ar || 'Roya - رؤية';
  const logoUrl      = settings?.logo ? `${process.env.NEXT_PUBLIC_MEDIA_URL}${settings.logo}` : null;
  const logoInitial  = centerName.trim().charAt(0) || 'ر';

  const handleLogout = async () => {
    try {
      const refresh = Cookies.get('refresh_token');
      if (refresh) await authApi.logout(refresh);
    } catch { /* ignore */ }
    clearAuth();
    toast.success('تم تسجيل الخروج');
    router.replace('/login');
  };

  const canViewMedical = user?.is_admin || user?.permissions?.some((p) => p.module === 'medical_file' && p.can_view);
  const canViewAssessments = user?.is_admin || user?.permissions?.some((p) => p.module === 'assessments' && p.can_view);
  const canViewReports = user?.is_admin || user?.permissions?.some((p) => p.module === 'reports' && p.can_view);

  const filtered = navItems.filter((item) => {
    if (item.adminOnly && !user?.is_admin) return false;
    if (item.managerOnly && !user?.is_admin && user?.role !== 'manager') return false;
    if (item.medicalOnly && !canViewMedical) return false;
    if (item.assessmentsOnly && !canViewAssessments) return false;
    if (item.reportsOnly && !canViewReports) return false;
    return true;
  });

  return (
    <>
      {/* زر فتح القائمة — بالجوال/الشاشات الصغيرة فقط */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 right-4 z-50 bg-brand text-white rounded-xl p-2.5 shadow-lg"
        aria-label="فتح القائمة"
      >
        <Menu size={20} />
      </button>

      {/* الخلفية المعتمة — تظهر خلف القائمة المفتوحة بالجوال، تُغلقها عند الضغط عليها */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'w-64 min-h-screen bg-brand flex flex-col',
          'fixed inset-y-0 right-0 z-50 transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : 'translate-x-full',
          'lg:static lg:translate-x-0 lg:flex-shrink-0',
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoUrl
                  ? <img src={logoUrl} alt={centerName} className="w-full h-full object-cover" />
                  : <span className="text-brand font-extrabold text-lg">{logoInitial}</span>}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white text-base leading-none truncate">{centerName}</p>
                <p className="text-white/60 text-xs mt-0.5">مركز التأهيل</p>
              </div>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-white/60 hover:text-white flex-shrink-0"
              aria-label="إغلاق القائمة"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filtered.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn('sidebar-link', pathname.startsWith(href) && href !== '/' ? 'active' : '')}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user?.full_name?.[0] || '؟'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-white/60 text-xs">{user?.role_display}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-300 hover:text-red-200 hover:bg-red-500/20"
          >
            <LogOut size={16} />
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
