'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';
import { studentsApi } from '@/lib/api';
import StudentForm from '@/components/students/StudentForm';
import type { Student, StudentFormData } from '@/types';
import Header from '@/components/layout/Header';

export default function EditStudentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: student, isLoading } = useQuery<Student>({
    queryKey: ['student', id],
    queryFn: () => studentsApi.detail(Number(id)).then((r) => r.data),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (fd: FormData) => studentsApi.update(Number(id), fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('تم تحديث بيانات الطالب');
      router.push(`/students/${id}`);
    },
    onError: () => toast.error('حدث خطأ في التحديث'),
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <Header
        title={`تعديل: ${student?.full_name}`}
        subtitle={`رقم الملف: ${student?.file_number}`}
        actions={
          <Link href={`/students/${id}`} className="btn-secondary">
            <ArrowRight size={16} /> العودة
          </Link>
        }
      />
      {student && (
        <StudentForm
          onSubmit={handleSubmit}
          loading={isPending}
          defaultValues={{
            first_name:       student.first_name,
            middle_name:      student.middle_name,
            grandfather_name: student.grandfather_name,
            family_name:      student.family_name,
            national_id:      student.national_id,
            date_of_birth:    student.date_of_birth,
            gender:           student.gender,
            nationality:      student.nationality,
            status:           student.status,
            registration_date: student.registration_date,
            notes:            student.notes || '',
            branch:           student.branch ? String(student.branch) : '',
          }}
        />
      )}
    </div>
  );
}
