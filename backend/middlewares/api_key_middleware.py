from django.conf import settings
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin


class ApiKeyMiddleware(MiddlewareMixin):
    EXCLUDED_PATHS = (
        "/admin",
        "/static",
        "/media",
        "/favicon.ico",
    )

    def process_request(self, request):
        for prefix in self.EXCLUDED_PATHS:
            if request.path.startswith(prefix):
                return None

        client_api_key = request.META.get("HTTP_X_API_KEY")

        if not client_api_key:
            return JsonResponse(
                {
                    "success": False,
                    "status_code": 401,
                    "message": "Falta la cabecera de autenticación 'X-API-KEY'.",
                    "errors": ["El acceso a este recurso requiere un API Key válido."],
                    "error_code": "MISSING_API_KEY",
                },
                status=401,
            )

        expected_api_key = getattr(settings, "API_KEY", None)
        valid_api_keys = getattr(settings, "VALID_API_KEYS", [])

        is_valid = False
        if expected_api_key and client_api_key == expected_api_key:
            is_valid = True
        elif client_api_key in valid_api_keys:
            is_valid = True

        if not is_valid:
            return JsonResponse(
                {
                    "success": False,
                    "status_code": 403,
                    "message": "Acceso no autorizado.",
                    "errors": ["El API Key proporcionado no es válido o ha expirado."],
                    "error_code": "INVALID_API_KEY",
                },
                status=403,
            )

        return None