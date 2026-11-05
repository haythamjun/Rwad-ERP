from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """الترقيم الافتراضي (20 بالصفحة) مع السماح للواجهة تطلب عددًا أكبر عبر
    ?page_size= — بدونه كانت قوائم مثل مستفيدي المختص تُقطع عند 20 بصمت."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 1000
