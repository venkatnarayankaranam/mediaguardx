# MediaGuardX Backend API

Production-ready backend for MediaGuardX - A Scalable and Autonomous Framework for Deepfake Defense.

## Features

- 🔐 **JWT Authentication** with role-based access control (user, investigator, admin)
- 📤 **Media Upload & Analysis** for images, videos, and audio files
- 🎯 **Deepfake Detection** with deterministic trust scoring (placeholder model engine)
- 📊 **Detection History** with user and admin views
- 📄 **PDF Report Generation** with tamper-proof hashing and QR codes
- 🎥 **Live Monitoring** placeholder endpoint
- 🔒 **Account Security** with lockout after failed login attempts
- ⚡ **Rate Limiting** and CORS protection
- 📝 **Activity Logging** for audit trails
- 🛠️ **Admin Dashboard** with system statistics

## Tech Stack

- **FastAPI** - Modern, fast web framework
- **MongoDB** (Motor) - Async MongoDB driver
- **JWT** - JSON Web Tokens for authentication
- **Pydantic** - Data validation
- **ReportLab** - PDF generation
- **QRCode** - QR code generation for reports
- **SlowAPI** - Rate limiting

## Installation

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Set up environment variables:**
Create a `.env` file in the backend directory:
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
MONGO_URL=mongodb://localhost:27017/mediaguardx
PORT=8000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

3. **Start MongoDB:**
Make sure MongoDB is running on your system.

4. **Seed admin user:**
```bash
python seed.py
```
Default admin credentials:
- Email: `admin@mediaguardx.com`
- Password: `Admin123!`

⚠️ **Important:** Change the default password after first login!

5. **Run the server:**
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, access the interactive API documentation:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/forgot-password` - Request password reset (placeholder)

### Detection
- `POST /api/detect/image` - Upload and analyze image
- `POST /api/detect/video` - Upload and analyze video
- `POST /api/detect/audio` - Upload and analyze audio
- `GET /api/detect/{detection_id}` - Get detection result

### History
- `GET /api/history/user` - Get user's detection history
- `GET /api/history/admin` - Get all detections (investigator/admin only)

### Reports
- `POST /api/report/{detection_id}` - Generate PDF report
- `GET /api/report/{report_id}` - Get report metadata
- `GET /api/report/{report_id}/download` - Download PDF report

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `GET /api/admin/stats` - Get system statistics (admin only)

### Live Monitoring
- `GET /api/live/monitor` - Live camera monitoring (placeholder)

## Project Structure

```
backend/
├── config.py              # Configuration settings
├── database.py            # Database connection
├── main.py                # FastAPI application entry point
├── seed.py                # Admin user seed script
├── requirements.txt       # Python dependencies
├── models/                # Pydantic models/schemas
│   ├── user.py
│   ├── detection.py
│   ├── report.py
│   └── activity_log.py
├── routes/                # API route handlers
│   ├── auth.py
│   ├── detection.py
│   ├── history.py
│   ├── reports.py
│   ├── admin.py
│   └── live.py
├── services/              # Business logic services
│   ├── model_engine.py    # Deepfake detection engine (placeholder)
│   └── pdf_generator.py   # PDF report generation
├── middleware/            # Custom middleware
│   ├── auth.py            # Authentication middleware
│   ├── error_handler.py   # Error handling
│   └── rate_limiter.py    # Rate limiting
├── utils/                 # Utility functions
│   ├── auth.py            # Auth utilities (JWT, password hashing)
│   └── file_handler.py    # File upload handling
├── uploads/               # Uploaded media files
├── reports/               # Generated PDF reports
└── heatmaps/              # Generated heatmap images
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## User Roles

- **user**: Can upload media, view own detections, generate reports
- **investigator**: All user permissions + view all detections
- **admin**: All permissions + user management, system statistics

## Model Engine (Placeholder)

The current implementation uses a deterministic scoring algorithm based on file properties. In production, this should be replaced with an actual deepfake detection ML model.

The placeholder generates:
- Trust scores (0-100)
- Labels (Authentic/Suspicious/Deepfake)
- Anomaly lists
- Heatmap placeholders

## PDF Reports

Generated reports include:
- Case ID and Report ID
- User information
- Media metadata
- Trust score assessment
- Detected anomalies
- QR code for verification
- Tamper-proof hash

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Account lockout after 5 failed login attempts
- Rate limiting
- CORS protection
- Input validation with Pydantic
- Activity logging for audit trails

## Development

To run in development mode with auto-reload:
```bash
uvicorn main:app --reload
```

## Testing

The API can be tested using:
- Swagger UI (http://localhost:8000/docs)
- Postman
- curl commands
- The frontend application

## Notes

- The model engine is a placeholder - replace with actual ML model in production
- Email functionality for password reset is placeholder
- Live monitoring endpoint is a placeholder
- File uploads are stored locally - consider cloud storage for production
- Adjust rate limiting and security settings for production use

## License

Proprietary - MediaGuardX

