export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('966')) {
    // Handle 9660XXXXXXXXX → 966XXXXXXXXX
    if (digits.length === 13 && digits[3] === '0') return '966' + digits.slice(4);
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 10) return '966' + digits.slice(1);
  if (digits.length === 9 && digits.startsWith('5')) return '966' + digits;
  return digits;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const STATUS_COLORS: Record<string, string> = {
  active:      'bg-green-100 text-green-800',
  inactive:    'bg-gray-100 text-gray-700',
  pending:     'bg-yellow-100 text-yellow-800',
  graduated:   'bg-blue-100 text-blue-800',
  suspended:   'bg-red-100 text-red-800',
  transferred: 'bg-purple-100 text-purple-800',
  rejected:    'bg-rose-100 text-rose-800',
};

export const GENDER_LABEL: Record<string, string> = {
  male:   'ذكر',
  female: 'أنثى',
};
