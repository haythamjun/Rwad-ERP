'use client';

import { useParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Header from '@/components/layout/Header';
import AssessmentBuilderForm from '@/components/assessments/AssessmentBuilderForm';
import { ShieldAlert } from 'lucide-react';

export default function EditAssessmentPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  if (!user?.is_admin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert size={48} className="text-red-400" />
        <p className="text-gray-500">غير مصرح لك بالوصول لهذه الصفحة</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="تعديل المقياس" subtitle="تعديل الأقسام والمهارات وخيارات التقدير" />
      <AssessmentBuilderForm assessmentId={Number(id)} />
    </div>
  );
}
