from typing import Any, Optional
from rest_framework import status
from rest_framework.response import Response

def success_response(
    data: Any = None,
    message: str = "Operación realizada con éxito",
    status_code: int = status.HTTP_200_OK,
    metadata: Optional[dict] = None,
) -> Response:
    payload = {
        "success": True,
        "status_code": status_code,
        "message": message,
        "data": data if data is not None else {},
    }

    if metadata is not None:
        payload["metadata"] = metadata

    return Response(payload, status=status_code)


def error_response(
    message: str = "Ocurrió un error al procesar la solicitud",
    errors: Any = None,
    status_code: int = status.HTTP_400_BAD_REQUEST,
    error_code: Optional[str] = None,
) -> Response:
    payload = {
        "success": False,
        "status_code": status_code,
        "message": message,
        "errors": errors if errors is not None else [],
    }

    if error_code:
        payload["error_code"] = error_code

    return Response(payload, status=status_code)