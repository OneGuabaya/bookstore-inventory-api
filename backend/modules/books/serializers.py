import re
from rest_framework import serializers
from models.book import Book


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = [
            'id',
            'title',
            'author',
            'isbn',
            'cost_usd',
            'selling_price_local',
            'stock_quantity',
            'category',
            'supplier_country',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_isbn(self, value: str) -> str:
        cleaned_isbn = re.sub(r'[-\s]', '', value.strip())

        if not (len(cleaned_isbn) in (10, 13) and (cleaned_isbn.isdigit() or (
                len(cleaned_isbn) == 10 and cleaned_isbn[:-1].isdigit() and cleaned_isbn[-1].upper() == 'X'))):
            raise serializers.ValidationError(
                "El ISBN debe tener un formato válido de 10 o 13 dígitos numéricos."
            )
        return value.strip()

    def validate_supplier_country(self, value: str) -> str:
        val = value.strip().upper()
        if len(val) != 2:
            raise serializers.ValidationError("El código de país proveedor debe tener exactamente 2 letras (ISO-3166).")
        return val

    def validate_cost_usd(self, value):
        if value <= 0:
            raise serializers.ValidationError("El costo en USD debe ser estrictamente mayor a 0.")
        return value

    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("La cantidad en stock no puede ser negativa.")
        return value


BookCreateSerializer = BookSerializer