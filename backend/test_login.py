"""Test login functionality directly."""
import asyncio
from pymongo import MongoClient
from utils.auth import verify_password
from models.user import User

async def test_login():
    try:
        # Connect to MongoDB
        client = MongoClient('mongodb://localhost:27017/')
        db = client['mediaguardx']

        # Find user
        user_dict = db.users.find_one({"email": "admin@mediaguardx.com"})
        if not user_dict:
            print("ERROR: User not found")
            return

        print(f"Found user: {user_dict['email']}")

        # Convert ObjectId to string
        if "_id" in user_dict:
            user_dict["_id"] = str(user_dict["_id"])

        print(f"Creating User model...")
        # Try to create User model
        user = User(**user_dict)
        print(f"User model created successfully")
        print(f"User ID: {user.id}")
        print(f"User email: {user.email}")
        print(f"User role: {user.role}")

        # Test password verification
        print(f"\nTesting password verification...")
        password = "Admin123!"
        is_valid = verify_password(password, user.password_hash)
        print(f"Password valid: {is_valid}")

    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_login())
