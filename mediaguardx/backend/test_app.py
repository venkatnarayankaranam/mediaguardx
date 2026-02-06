"""Minimal test to diagnose the issue."""
import sys
import traceback

print("Starting diagnostic...")

try:
    print("1. Testing imports...")
    from fastapi import FastAPI
    from fastapi.staticfiles import StaticFiles
    import os
    print("   ✓ Imports successful")

    print("\n2. Testing config...")
    from config import settings
    print(f"   ✓ Config loaded")
    print(f"   - heatmaps_dir: {settings.heatmaps_dir}")
    print(f"   - upload_dir: {settings.upload_dir}")
    print(f"   - reports_dir: {settings.reports_dir}")

    print("\n3. Testing directory creation...")
    os.makedirs(settings.heatmaps_dir, exist_ok=True)
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.reports_dir, exist_ok=True)
    print("   ✓ Directories created")

    print("\n4. Testing static files mount...")
    app = FastAPI()
    try:
        app.mount("/heatmaps", StaticFiles(directory=settings.heatmaps_dir), name="heatmaps")
        print("   ✓ Static files mount successful")
    except Exception as e:
        print(f"   ✗ Static files mount FAILED: {e}")
        raise

    print("\n5. Testing routes import...")
    from routes import auth, detection, history, reports, admin, live
    print("   ✓ Routes imported")

    print("\n6. Testing middleware...")
    from middleware.error_handler import setup_error_handlers
    from middleware.rate_limiter import setup_rate_limiting
    setup_error_handlers(app)
    setup_rate_limiting(app)
    print("   ✓ Middleware setup complete")

    print("\n7. Testing database connection...")
    from database import connect_db
    import asyncio
    asyncio.run(connect_db())
    print("   ✓ Database connected")

    print("\n✅ ALL TESTS PASSED - No obvious issues found")
    print("\nThe app should work. If you're still getting errors,")
    print("the issue might be in the request handling.")

except Exception as e:
    print(f"\n❌ ERROR FOUND: {type(e).__name__}: {e}")
    print("\nFull traceback:")
    traceback.print_exc()
    sys.exit(1)
