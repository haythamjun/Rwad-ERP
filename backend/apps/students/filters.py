import django_filters
from .models import Student


class StudentFilter(django_filters.FilterSet):
    name              = django_filters.CharFilter(field_name='full_name',  lookup_expr='icontains', label='الاسم')
    national_id       = django_filters.CharFilter(lookup_expr='icontains', label='رقم الهوية')
    file_number       = django_filters.CharFilter(lookup_expr='icontains', label='رقم الملف')
    nationality       = django_filters.CharFilter(lookup_expr='icontains', label='الجنسية')
    registration_from = django_filters.DateFilter(field_name='registration_date', lookup_expr='gte', label='تسجيل من')
    registration_to   = django_filters.DateFilter(field_name='registration_date', lookup_expr='lte', label='تسجيل إلى')

    class Meta:
        model  = Student
        fields = ['status', 'gender', 'nationality', 'disability_type', 'disability_degree', 'referral_source']
