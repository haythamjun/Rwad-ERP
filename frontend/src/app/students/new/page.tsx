'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { studentsApi } from '@/lib/api';
import StudentForm from '@/components/students/StudentForm';
import type { StudentFormData } from '@/types';
import Header from '@/components/layout/Header';

export default function NewStudentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: (formData: FormData) => studentsApi.create(formData),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('تم إضافة الطالب بنجاح');
      router.push(`/students/${res.data.id}`);
    },
    onError: (err: unknown) => {
      const errors = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      if (errors) {
        const msg = Object.entries(errors)
          .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
          .join(' | ');
        toast.error(msg);
      } else {
        toast.error('حدث خطأ، يرجى المحاولة مجدداً');
      }
    },
  });

  const handleSubmit = (data: StudentFormData) => {
    const fd = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        fd.append(key, value instanceof File ? value : String(value));
      }
    });
    mutate(fd);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <Header
        title="إضافة طالب جديد"
        subtitle="أدخل بيانات الطالب الأساسية"
        actions={
          <Link href="/students" className="btn-secondary">
            <ArrowRight size={16} />
            العودة للقائمة
          </Link>
        }
      />
      <StudentForm onSubmit={handleSubmit} loading={isPending} />
    </div>
  );
}
