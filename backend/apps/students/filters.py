import django_filters
from django.db.models import Q
from .models import Student


class StudentFilter(django_filters.FilterSet):
    name              = django_filters.CharFilter(method='filter_name',            label='الاسم')
    national_id       = django_filters.CharFilter(lookup_expr='icontains',          label='رقم الهوية')
    disability_type   = django_filters.CharFilter(method='filter_disability_type',  label='نوع الإعاقة')

    def filter_name(self, queryset, name, value):
        return queryset.filter(
            Q(first_name__icontains=value) |
            Q(middle_name__icontains=value) |
            Q(grandfather_name__icontains=value) |
            Q(family_name__icontains=value)
        )

    def filter_disability_type(self, queryset, name, value):
        if value:
            return queryset.filter(disability_type__contains=[value])
        return queryset

    file_number       = django_filters.CharFilter(lookup_expr='icontains', label='رقم الملف')
    nationality       = django_filters.CharFilter(lookup_expr='icontains', label='الجنسية')
    registration_from = django_filters.DateFilter(field_name='registration_date', lookup_expr='gte', label='تسجيل من')
    registration_to   = django_filters.DateFilter(field_name='registration_date', lookup_expr='lte', label='تسجيل إلى')

    class Meta:
        model  = Student
        fields = ['status', 'gender', 'nationality', 'disability_degree', 'referral_source']
