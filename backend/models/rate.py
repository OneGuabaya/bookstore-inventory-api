from django.db import models


class RateLog(models.Model):
    provider = models.URLField(
        default="https://www.exchangerate-api.com",
        help_text="URL o identificador del proveedor"
    )
    base_currency = models.CharField(
        max_length=3,
        default="USD",
        help_text="Moneda base de la consulta (ej. USD)"
    )
    api_date = models.DateField(
        help_text="Fecha reportada por la API (campo 'date', ej. 2026-11-10)"
    )
    time_last_updated = models.BigIntegerField(
        help_text="Timestamp Unix reportado por la API ('time_last_updated')"
    )
    rates = models.JSONField(
        help_text="Diccionario completo con todas las monedas y sus valores ('rates')"
    )
    fetched_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Momento exacto en que nuestro backend ejecutó la petición"
    )

    class Meta:
        app_label = "domain_models"
        db_table = "rate_logs"
        ordering = ["-fetched_at"]

    def __str__(self):
        return f"Rates [{self.base_currency}] - {self.api_date} ({self.fetched_at:%Y-%m-%d %H:%M:%S})"

    def get_rate_for(self, currency_code: str) -> float | None:
        """Helper para extraer rápidamente una tasa específica del JSON."""
        return self.rates.get(currency_code.upper())