'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  UserCog,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';

const navItems = [
  { href: '/dashboard',  label: 'الرئيسية',       icon: LayoutDashboard },
  { href: '/students',   label: 'ملفات الطلاب',   icon: Users },
  { href: '/attendance', label: 'الحضور والغياب',  icon: CalendarDays },
  { href: '/users',      label: 'المستخدمون',      icon: UserCog,       adminOnly: true },
  { href: '/reports',    label: 'التقارير',         icon: BarChart3,     disabled: true },
  { href: '/audit-logs', label: 'سجل العمليات',    icon: ClipboardList, managerOnly: true },
  { href: '/settings',   label: 'الإعدادات',        icon: Settings,      adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      const refresh = Cookies.get('refresh_token');
      if (refresh) await authApi.logout(refresh);
    } catch { /* ignore */ }
    clearAuth();
    toast.success('تم تسجيل الخروج');
    router.replace('/login');
  };

  const filtered = navItems.filter((item) => {
    if (item.adminOnly && !user?.is_admin) return false;
    if (item.managerOnly && !user?.is_admin && user?.role !== 'manager') return false;
    return true;
  });

  return (
    <aside className="w-64 min-h-screen bg-brand flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <span className="text-brand font-extrabold text-lg">ر</span>
          </div>
          <div>
            <p className="font-bold text-white text-base leading-none">Roya - رؤية</p>
            <p className="text-white/60 text-xs mt-0.5">مركز التأهيل</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filtered.map(({ href, label, icon: Icon, disabled }) => (
          disabled ? (
            <span
              key={href}
              className="sidebar-link opacity-40 cursor-not-allowed"
              title="قريباً"
            >
              <Icon size={18} />
              {label}
              <span className="mr-auto text-xs bg-white/20 px-1.5 py-0.5 rounded">قريباً</span>
            </span>
          ) : (
            <Link
              key={href}
              href={href}
              className={cn('sidebar-link', pathname.startsWith(href) && href !== '/' ? 'active' : '')}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
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
  );
}
