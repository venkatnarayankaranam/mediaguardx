"""Test script to verify the detection API with real image uploads."""
import requests
import os
import sys
from pathlib import Path
from PIL import Image
import tempfile

API_BASE_URL = "http://localhost:8000/api"

def create_test_image(file_path: str, size: tuple = (640, 480)):
    """Create a test image file."""
    img = Image.new('RGB', size, color='red')
    img.save(file_path, 'JPEG')
    print(f"Created test image: {file_path} ({os.path.getsize(file_path)} bytes)")

def test_detection_api():
    """Test the detection API with image uploads."""
    print("=" * 60)
    print("Testing Deepfake Detection API")
    print("=" * 60)
    
    # Step 1: Login
    print("\n1. Logging in...")
    login_data = {
        "email": "admin@mediaguardx.com",
        "password": "Admin123!"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/login", json=login_data)
        response.raise_for_status()
        token = response.json()["access_token"]
        print(f"✓ Login successful")
    except requests.exceptions.RequestException as e:
        print(f"✗ Login failed: {e}")
        print("\nMake sure:")
        print("  1. Backend server is running (python main.py)")
        print("  2. MongoDB is running")
        print("  3. Admin user is seeded (python seed.py)")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: Test multiple image uploads
    print("\n2. Testing image uploads...")
    results = {
        "Authentic": 0,
        "Suspicious": 0,
        "Deepfake": 0
    }
    
    with tempfile.TemporaryDirectory() as tmpdir:
        for i in range(5):
            # Create test image
            test_image_path = os.path.join(tmpdir, f"test_image_{i}.jpg")
            create_test_image(test_image_path, size=(640 + i*10, 480 + i*10))
            
            # Upload image
            try:
                with open(test_image_path, 'rb') as f:
                    files = {'file': (f'test_{i}.jpg', f, 'image/jpeg')}
                    response = requests.post(
                        f"{API_BASE_URL}/detect/image",
                        headers=headers,
                        files=files
                    )
                    response.raise_for_status()
                    result = response.json()
                    
                    trust_score = result.get("trustScore", 0)
                    label = result.get("label", "Unknown")
                    
                    # Map label to status
                    status_map = {
                        "Authentic": "authentic",
                        "Suspicious": "suspected", 
                        "Deepfake": "deepfake"
                    }
                    status = status_map.get(label, "unknown")
                    
                    results[label] = results.get(label, 0) + 1
                    
                    print(f"  Image {i+1}: Score={trust_score:6.2f}, Label={label:12s}, Status={status}")
                    
            except requests.exceptions.RequestException as e:
                print(f"  Image {i+1}: Upload failed - {e}")
    
    # Step 3: Summary
    print("\n" + "=" * 60)
    print("Test Results Summary:")
    print("=" * 60)
    total = sum(results.values())
    if total > 0:
        for label, count in results.items():
            percentage = (count / total) * 100
            print(f"  {label:12s}: {count:2d} ({percentage:5.1f}%)")
        
        print("\n" + "=" * 60)
        if results.get("Deepfake", 0) == total:
            print("WARNING: All images classified as Deepfake!")
            print("The scoring algorithm may still have issues.")
        elif results.get("Authentic", 0) == 0:
            print("WARNING: No images classified as Authentic!")
            print("The scoring algorithm may be biased.")
        else:
            print("SUCCESS: Images are being classified across different categories!")
            print("The detection system is working correctly.")
    else:
        print("No successful uploads to analyze.")

if __name__ == "__main__":
    print("\nMake sure the backend server is running:")
    print("  python main.py")
    print("\nPress Enter to continue with the test...")
    input()
    
    test_detection_api()

