from django.db import models


class ApiLog(models.Model):
    method = models.CharField(
        max_length=10,
        help_text="Método HTTP: GET, POST, PUT, PATCH, DELETE"
    )
    path = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Endpoint solicitado (ej. /api/v1/books/)"
    )
    query_params = models.JSONField(
        default=dict,
        blank=True,
        help_text="Parámetros pasados en la URL (?param=val)"
    )
    request_headers = models.JSONField(
        default=dict,
        blank=True,
        help_text="Headers clave de la petición (User-Agent, Content-Type, etc.)"
    )
    request_body = models.JSONField(
        null=True,
        blank=True,
        help_text="Payload recibido en el request"
    )
    response_status = models.PositiveSmallIntegerField(
        db_index=True,
        help_text="Código de estado HTTP (200, 201, 400, 404, 500, etc.)"
    )
    response_body = models.JSONField(
        null=True,
        blank=True,
        help_text="Payload o mensaje devuelto en la respuesta"
    )
    is_success = models.BooleanField(
        db_index=True,
        help_text="True si status_code está entre 200 y 299, False si es >= 400"
    )
    execution_time_ms = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Tiempo de procesamiento en milisegundos"
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP del cliente que originó la petición"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp de cuando se registró la transacción"
    )

    class Meta:
        app_label = "domain_models"
        db_table = "api_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_success", "-created_at"]),
            models.Index(fields=["path", "-created_at"]),
        ]

    def __str__(self):
        status_label = "SUCCESS" if self.is_success else "FAILED"
        return f"[{self.method}] {self.path} - {self.response_status} ({status_label}) [{self.execution_time_ms}ms]"