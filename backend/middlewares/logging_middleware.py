import time
import json
from django.utils.deprecation import MiddlewareMixin


class RequestResponseLoggingMiddleware(MiddlewareMixin):
    EXCLUDED_PREFIXES = ("/static/", "/media/", "/favicon.ico")

    def process_request(self, request):
        request.start_time = time.time()
        request._cached_body = None
        if request.body:
            try:
                request._cached_body = json.loads(request.body.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                request._cached_body = {"raw": request.body.decode("utf-8", errors="replace")}

    def process_response(self, request, response):
        if request.path.startswith(self.EXCLUDED_PREFIXES):
            return response

        execution_time = 0.0
        if hasattr(request, "start_time"):
            execution_time = round((time.time() - request.start_time) * 1000, 2)

        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(",")[0].strip()
        else:
            ip_address = request.META.get("REMOTE_ADDR")

        response_data = None
        if hasattr(response, "data"):
            response_data = response.data
        elif response.get("Content-Type", "").startswith("application/json"):
            try:
                response_data = json.loads(response.content.decode("utf-8"))
            except Exception:
                response_data = {"raw": response.content.decode("utf-8", errors="replace")}

        is_success = 200 <= response.status_code < 300

        headers_to_log = {
            "user-agent": request.META.get("HTTP_USER_AGENT", ""),
            "content-type": request.META.get("CONTENT_TYPE", ""),
            "accept": request.META.get("HTTP_ACCEPT", ""),
        }

        try:
            from models.api_log import ApiLog
            ApiLog.objects.create(
                method=request.method,
                path=request.path,
                query_params=dict(request.GET),
                request_headers=headers_to_log,
                request_body=getattr(request, "_cached_body", None),
                response_status=response.status_code,
                response_body=response_data,
                is_success=is_success,
                execution_time_ms=execution_time,
                ip_address=ip_address,
            )
        except Exception:
            pass

        return response