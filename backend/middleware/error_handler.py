"""Error handling middleware."""
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging

from config import settings

logger = logging.getLogger(__name__)


class AppException(Exception):
    """Base application exception."""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


async def app_exception_handler(request: Request, exc: AppException):
    """Handle application exceptions."""
    logger.error(f"Application error: {exc.message}", exc_info=True)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "status_code": exc.status_code
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation exceptions."""
    logger.warning(f"Validation error: {exc.errors()}")
    content = {"error": "Validation error"}
    if settings.node_env == "development":
        content["errors"] = exc.errors()
    else:
        content["errors"] = [{"msg": "Invalid input"}]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=content,
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """Handle generic exceptions."""
    error_msg = str(exc)
    logger.error(f"Unhandled exception: {error_msg}", exc_info=True)

    # Only expose error details in development mode
    content = {"error": "Internal server error"}
    if settings.node_env == "development":
        content["detail"] = error_msg

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content,
    )


def setup_error_handlers(app: FastAPI):
    """Setup error handlers for the application."""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
