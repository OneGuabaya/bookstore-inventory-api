from django.urls import path
from .views import (
    BookListCreateView,
    BookDetailView,
    BookCategorySearchView,
    BookLowStockView,
    BookCalculatePriceView,
)

urlpatterns = [
    path('', BookListCreateView.as_view(), name='book-list-create'),
    path('search/', BookCategorySearchView.as_view(), name='book-search'),
    path('search', BookCategorySearchView.as_view(), name='book-search-raw'),
    path('low-stock/', BookLowStockView.as_view(), name='book-low-stock'),
    path('low-stock', BookLowStockView.as_view(), name='book-low-stock-raw'),
    path('<int:pk>/calculate-price/', BookCalculatePriceView.as_view(), name='book-calculate-price'),
    path('<int:pk>/calculate-price', BookCalculatePriceView.as_view(), name='book-calculate-price-raw'),
    path('<int:pk>/', BookDetailView.as_view(), name='book-detail'),
    path('<int:pk>', BookDetailView.as_view(), name='book-detail-raw'),
]