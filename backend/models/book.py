from django.db import models


class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    isbn = models.CharField(max_length=32, unique=True, db_index=True)
    cost_usd = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price_local = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    category = models.CharField(max_length=100)
    supplier_country = models.CharField(
        max_length=2, help_text="Código ISO de 2 letras (ej. ES, US)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "domain_models"
        db_table = "books"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.isbn})"