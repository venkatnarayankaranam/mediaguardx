"""Seed script to create admin user."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from utils.auth import get_password_hash
from datetime import datetime
import sys


async def seed_admin():
    """Create default admin user."""
    try:
        # Connect to database
        client = AsyncIOMotorClient(settings.mongo_url)
        db = client.get_database()
        
        # Check if admin already exists
        existing_admin = await db.users.find_one({"email": "admin@mediaguardx.com"})
        if existing_admin:
            print("Admin user already exists!")
            print(f"Email: admin@mediaguardx.com")
            print("Please use a different email or delete the existing admin user.")
            client.close()
            return
        
        # Create admin user
        admin_password = "Admin123!"  # Default password - CHANGE IN PRODUCTION
        password_hash = get_password_hash(admin_password)
        
        admin_user = {
            "email": "admin@mediaguardx.com",
            "name": "System Administrator",
            "password_hash": password_hash,
            "role": "admin",
            "is_active": True,
            "is_locked": False,
            "failed_login_attempts": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.users.insert_one(admin_user)
        
        print("=" * 50)
        print("Admin user created successfully!")
        print("=" * 50)
        print(f"Email: admin@mediaguardx.com")
        print(f"Password: {admin_password}")
        print(f"Role: admin")
        print("=" * 50)
        print("IMPORTANT: Change the default password after first login!")
        print("=" * 50)
        
        client.close()
        
    except Exception as e:
        print(f"Error creating admin user: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(seed_admin())

