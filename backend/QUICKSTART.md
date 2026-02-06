# Quick Start Guide

## Prerequisites
- Python 3.8+
- MongoDB (running locally or remotely)
- pip

## Setup Steps

1. **Install dependencies:**
```bash
pip install -r requirements.txt
```

2. **Create `.env` file:**
Copy the example and set your values:
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
MONGO_URL=mongodb://localhost:27017/mediaguardx
PORT=8000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

3. **Start MongoDB** (if not already running):
```bash
# Windows (if installed as service, it should auto-start)
# Or use: mongod

# Linux/Mac:
# sudo systemctl start mongod
# or: mongod
```

4. **Seed admin user:**
```bash
python seed.py
```
This creates an admin user:
- Email: `admin@mediaguardx.com`
- Password: `Admin123!`

5. **Start the server:**
```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --port 8000
```

6. **Access the API:**
- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing the API

### 1. Login
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@mediaguardx.com", "password": "Admin123!"}'
```

### 2. Use the token
Replace `YOUR_TOKEN` with the access_token from login response:
```bash
curl -X GET "http://localhost:8000/api/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Upload and analyze an image
```bash
curl -X POST "http://localhost:8000/api/detect/image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/your/image.jpg"
```

## Frontend Integration

The backend is ready to integrate with the frontend. Make sure:
1. Frontend is configured to use `http://localhost:8000/api` as the API base URL
2. CORS is configured (already set in backend for localhost:5173)
3. Frontend expects JWT tokens in `Authorization: Bearer <token>` header

## Troubleshooting

**MongoDB connection error:**
- Ensure MongoDB is running
- Check MONGO_URL in .env file
- Test connection: `mongosh mongodb://localhost:27017/mediaguardx`

**Import errors:**
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Check Python version: `python --version` (should be 3.8+)

**Port already in use:**
- Change PORT in .env file
- Or stop the process using port 8000

**Admin user already exists:**
- Delete the user from MongoDB or use a different email
- Or modify seed.py to update existing admin

