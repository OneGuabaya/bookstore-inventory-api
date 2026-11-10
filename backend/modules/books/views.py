from rest_framework.views import APIView
from rest_framework import status
from repositories.book_repository import BookRepository
from modules.books.serializers import BookSerializer
from utils.responses import success_response, error_response
from services.currency_service import CurrencyService
from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone

class BookListCreateView(APIView):
    def get(self, request):
        try:
            raw_limit = request.query_params.get("limit")
            raw_offset = request.query_params.get("offset", 0)

            limit = int(raw_limit) if raw_limit is not None else None
            offset = int(raw_offset) if raw_offset is not None else 0

            if limit is not None and limit <= 0:
                return error_response(
                    message="El parámetro 'limit' debe ser un número entero positivo mayor a cero.",
                    status_code=status.HTTP_400_BAD_REQUEST,
                    error_code="INVALID_PAGINATION_LIMIT"
                )

            if offset < 0:
                return error_response(
                    message="El parámetro 'offset' no puede ser negativo.",
                    status_code=status.HTTP_400_BAD_REQUEST,
                    error_code="INVALID_PAGINATION_OFFSET"
                )

        except ValueError:
            return error_response(
                message="Los parámetros 'limit' y 'offset' deben ser números enteros válidos.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_QUERY_PARAMS"
            )

        books_qs, total_records = BookRepository.list_all(limit=limit, offset=offset)
        serializer = BookSerializer(books_qs, many=True)

        metadata = {
            "total_records": total_records,
            "count": len(serializer.data),
            "limit": limit,
            "offset": offset,
        }

        return success_response(
            data=serializer.data,
            message="Listado de libros obtenido correctamente",
            status_code=status.HTTP_200_OK,
            metadata=metadata
        )

    def post(self, request):
        serializer = BookSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Error de validación al crear el libro",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="VALIDATION_ERROR"
            )

        isbn = serializer.validated_data.get('isbn')
        if BookRepository.exists_by_isbn(isbn):
            return error_response(
                message=f"El libro con ISBN '{isbn}' ya se encuentra registrado",
                errors={"isbn": ["Ya existe un registro con este código ISBN."]},
                status_code=status.HTTP_409_CONFLICT,
                error_code="BOOK_ALREADY_EXISTS"
            )

        try:
            book = BookRepository.create(serializer.validated_data)
            output_serializer = BookSerializer(book)
            return success_response(
                data=output_serializer.data,
                message="Libro registrado exitosamente en el inventario",
                status_code=status.HTTP_201_CREATED
            )
        except Exception as e:
            return error_response(
                message="Ocurrió un error inesperado al registrar el libro",
                errors=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="INTERNAL_SERVER_ERROR"
            )

class BookDetailView(APIView):
    def get(self, request, pk: int):
        book = BookRepository.get_by_id(pk)
        if not book:
            return error_response(
                message=f"No se encontró el libro con identificador {pk}",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="BOOK_NOT_FOUND"
            )

        serializer = BookSerializer(book)
        return success_response(
            data=serializer.data,
            message="Detalle del libro obtenido con éxito",
            status_code=status.HTTP_200_OK
        )

    def put(self, request, pk: int):
        book = BookRepository.get_by_id(pk)
        if not book:
            return error_response(
                message=f"No se encontró el libro con identificador {pk}",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="BOOK_NOT_FOUND"
            )

        serializer = BookSerializer(book, data=request.data, partial=True)
        if not serializer.is_valid():
            return error_response(
                message="Error de validación al actualizar el libro",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="VALIDATION_ERROR"
            )

        new_isbn = serializer.validated_data.get('isbn')
        if new_isbn and BookRepository.exists_by_isbn(new_isbn, exclude_id=book.id):
            return error_response(
                message=f"El ISBN '{new_isbn}' ya está en uso por otro libro",
                errors={"isbn": ["El ISBN ya pertenece a otro registro."]},
                status_code=status.HTTP_409_CONFLICT,
                error_code="ISBN_ALREADY_EXISTS"
            )

        try:
            updated_book = BookRepository.update(book, serializer.validated_data)
            output_serializer = BookSerializer(updated_book)
            return success_response(
                data=output_serializer.data,
                message="Libro actualizado exitosamente",
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return error_response(
                message="Ocurrió un error inesperado al actualizar el libro",
                errors=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="INTERNAL_SERVER_ERROR"
            )

    def delete(self, request, pk: int):
        book = BookRepository.get_by_id(pk)
        if not book:
            return error_response(
                message=f"No se encontró el libro con identificador {pk}",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="BOOK_NOT_FOUND"
            )

        try:
            BookRepository.delete(book)
            return success_response(
                data={"deleted_id": pk},
                message=f"El libro con ID {pk} ha sido eliminado exitosamente",
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return error_response(
                message="Ocurrió un error inesperado al eliminar el libro",
                errors=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="INTERNAL_SERVER_ERROR"
            )

class BookCategorySearchView(APIView):
            def get(self, request):
                category = request.query_params.get("category", "").strip()
                if not category:
                    return error_response(
                        message="El parámetro de búsqueda 'category' es obligatorio.",
                        status_code=status.HTTP_400_BAD_REQUEST,
                        error_code="MISSING_CATEGORY_PARAM"
                    )

                books_qs = BookRepository.filter_by_category(category)
                serializer = BookSerializer(books_qs, many=True)

                return success_response(
                    data=serializer.data,
                    message=f"Búsqueda por categoría '{category}' completada exitosamente",
                    status_code=status.HTTP_200_OK,
                    metadata={
                        "category_searched": category,
                        "total_found": len(serializer.data)
                    }
                )

class BookLowStockView(APIView):
            def get(self, request):
                raw_threshold = request.query_params.get("threshold", "10")

                try:
                    threshold = int(raw_threshold)
                    if threshold < 0:
                        return error_response(
                            message="El parámetro 'threshold' no puede ser negativo.",
                            status_code=status.HTTP_400_BAD_REQUEST,
                            error_code="INVALID_THRESHOLD"
                        )
                except ValueError:
                    return error_response(
                        message="El parámetro 'threshold' debe ser un número entero válido.",
                        status_code=status.HTTP_400_BAD_REQUEST,
                        error_code="INVALID_THRESHOLD"
                    )

                books_qs = BookRepository.list_low_stock(threshold=threshold)
                serializer = BookSerializer(books_qs, many=True)

                return success_response(
                    data=serializer.data,
                    message="Listado de libros con bajo stock obtenido exitosamente",
                    status_code=status.HTTP_200_OK,
                    metadata={
                        "threshold_applied": threshold,
                        "total_items": len(serializer.data)
                    }
                )

class BookCalculatePriceView(APIView):
    MARGIN_PERCENTAGE = 40
    LOCAL_CURRENCY = "VES"

    def post(self, request, pk: int):
        book = BookRepository.get_by_id(pk)
        if not book:
            return error_response(
                message=f"No se encontró el libro con identificador {pk}",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="BOOK_NOT_FOUND",
            )

        if book.cost_usd <= 0:
            return error_response(
                message="El costo en USD del libro debe ser mayor a 0 para calcular el precio de venta.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_COST_USD",
            )

        target_currency = (
                request.data.get("currency")
                or request.query_params.get("currency")
                or self.LOCAL_CURRENCY
        ).upper()

        try:
            exchange_rate, is_fallback = CurrencyService.get_rate(target_currency)
        except Exception as e:
            return error_response(
                message="Error al procesar la tasa de cambio con el servicio externo.",
                errors=str(e),
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                error_code="EXCHANGE_SERVICE_UNAVAILABLE",
            )

        cost_usd = Decimal(str(book.cost_usd))

        margin_multiplier = Decimal("1") + (Decimal(str(self.MARGIN_PERCENTAGE)) / Decimal("100"))
        cost_with_margin_usd = (cost_usd * margin_multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        selling_price_local = (cost_with_margin_usd * exchange_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        try:
            BookRepository.update(book, {"selling_price_local": selling_price_local})
        except Exception as e:
            return error_response(
                message="Error al actualizar el precio local en la base de datos.",
                errors=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="DATABASE_UPDATE_ERROR",
            )

        response_payload = {
            "book_id": book.id,
            "cost_usd": float(cost_usd),
            "margin_percentage": f"{self.MARGIN_PERCENTAGE}%",
            "cost_with_margin_usd": float(cost_with_margin_usd),
            "exchange_rate": float(exchange_rate),
            "selling_price_local": float(selling_price_local),
            "currency": target_currency,
            "calculation_timestamp": timezone.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

        metadata = {
            "fallback_used": is_fallback,
            "supplier_country": book.supplier_country,
        }

        return success_response(
            data=response_payload,
            message="Precio de venta sugerido en moneda local calculado y actualizado exitosamente",
            status_code=status.HTTP_200_OK,
            metadata=metadata,
        )