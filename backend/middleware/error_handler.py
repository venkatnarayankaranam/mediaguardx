"""Error handling middleware."""
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pymongo.errors import DuplicateKeyError
import logging

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
    errors = exc.errors()
    logger.warning(f"Validation error: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation error",
            "details": errors
        }
    )


async def duplicate_key_exception_handler(request: Request, exc: DuplicateKeyError):
    """Handle MongoDB duplicate key errors."""
    logger.warning(f"Duplicate key error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "error": "Resource already exists",
            "detail": "A record with this information already exists"
        }
    )


async def generic_exception_handler(request: Request, exc: Exception):
    """Handle generic exceptions."""
    import traceback
    error_msg = str(exc)
    error_trace = traceback.format_exc()
    print(f"ERROR: {error_msg}")
    print(f"TRACEBACK: {error_trace}")
    logger.error(f"Unhandled exception: {error_msg}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "detail": error_msg
        }
    )


def setup_error_handlers(app: FastAPI):
    """Setup error handlers for the application."""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(DuplicateKeyError, duplicate_key_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

