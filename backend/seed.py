"""Seed script to create admin user via Supabase."""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()


def seed_admin():
    """Create default admin user in Supabase."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        return

    supabase = create_client(url, key)

    email = "admin@mediaguardx.com"
    password = "Admin123!"
    name = "Admin"

    try:
        # Create auth user
        result = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"name": name},
        })

        user_id = result.user.id
        print(f"Created auth user: {email} (ID: {user_id})")

        # Update profile to admin role
        supabase.table("profiles").update({"role": "admin"}).eq("id", user_id).execute()
        print(f"Updated profile role to admin")

        print(f"\nAdmin credentials:")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
        print(f"\nPlease change the password after first login!")

    except Exception as e:
        if "already been registered" in str(e).lower() or "already exists" in str(e).lower():
            print(f"User {email} already exists. Updating role to admin...")
            # Find and update existing user
            profiles = supabase.table("profiles").select("id").eq("email", email).execute()
            if profiles.data:
                supabase.table("profiles").update({"role": "admin"}).eq("id", profiles.data[0]["id"]).execute()
                print("Role updated to admin.")
        else:
            print(f"Error: {e}")


if __name__ == "__main__":
    seed_admin()
