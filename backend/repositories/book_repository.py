from typing import Optional, Dict, Any, Tuple
from django.db.models import QuerySet
from models.book import Book


class BookRepository:
    @staticmethod
    def create(data: Dict[str, Any]) -> Book:
        return Book.objects.create(**data)

    @staticmethod
    def exists_by_isbn(isbn: str, exclude_id: Optional[int] = None) -> bool:
        qs = Book.objects.filter(isbn=isbn)
        if exclude_id is not None:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    @staticmethod
    def get_by_isbn(isbn: str) -> Optional[Book]:
        return Book.objects.filter(isbn=isbn).first()

    @staticmethod
    def get_by_id(book_id: int) -> Optional[Book]:
        return Book.objects.filter(id=book_id).first()

    @staticmethod
    def list_all(limit: Optional[int] = None, offset: int = 0) -> Tuple[QuerySet[Book], int]:
        queryset = Book.objects.all()
        total_records = queryset.count()

        if limit is not None:
            queryset = queryset[offset : offset + limit]

        return queryset, total_records

    @staticmethod
    def update(book: Book, data: Dict[str, Any]) -> Book:
        for field, value in data.items():
            setattr(book, field, value)
        book.save()
        return book

    @staticmethod
    def delete(book: Book) -> None:
        book.delete()

    @staticmethod
    def filter_by_category(category: str) -> QuerySet[Book]:
        return Book.objects.filter(category__icontains=category)

    @staticmethod
    def list_low_stock(threshold: int = 10) -> QuerySet[Book]:
        return Book.objects.filter(stock_quantity__lte=threshold).order_by("stock_quantity")