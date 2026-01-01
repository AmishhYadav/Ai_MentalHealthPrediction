# Mental Health AI Integration Setup Instructions

This document provides step-by-step instructions to set up and run the integrated mental health assessment system.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Python 3** (v3.8 or higher)
3. **MongoDB** (running locally on port 27017)
4. **Google Gemini API Key**

## Setup Steps

### 1. Backend Setup (Node.js)

1. Navigate to the `base` directory:
   ```bash
   cd /Users/amish/MetalHealth/base
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `base` directory with your environment variables:
   ```env
   PORT=3000
   JWT_SECRET=your_jwt_secret_here
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=mental_health
   GOOGLE_API_KEY_1=your_gemini_api_key_here
   ```

4. Start the backend server:
   ```bash
   npm start
   ```

### 2. AI Environment Setup (Python)

1. Navigate to the `AI_ENV` directory:
   ```bash
   cd /Users/amish/MetalHealth/AI_ENV
   ```

2. Create a virtual environment (if not already created):
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install required Python packages:
   ```bash
   pip install requests python-dotenv
   ```

4. Create a `.env` file in the `AI_ENV` directory:
   ```env
   GOOGLE_API_KEY_1=your_gemini_api_key_here
   ```

5. Test the AI integration:
   ```bash
   python test_integration.py
   ```

### 3. Frontend Setup (Angular)

1. Navigate to the `mental-health` directory:
   ```bash
   cd /Users/amish/MetalHealth/mental-health
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Angular development server:
   ```bash
   ng serve
   ```

4. Open your browser and navigate to `http://localhost:4200`

## API Endpoints

### Mental Health Assessment

- **POST** `/api/mentalhealth/assessment` - Submit assessment and get AI analysis
- **GET** `/api/mentalhealth/history` - Get user's assessment history
- **GET** `/api/mentalhealth/latest` - Get latest assessment

### Authentication Required

All mental health endpoints require authentication. Make sure to:
1. Register a user account
2. Login to get a JWT token
3. Include the token in the Authorization header: `Bearer <token>`

## Features

### Frontend Features

1. **Interactive Questionnaire**: Step-by-step mental health assessment with 6 questions
2. **Real-time Progress**: Visual progress bar showing completion status
3. **AI Analysis Display**: Comprehensive results including:
   - Summary of mental health state
   - Risk level assessment (Low/Medium/High)
   - Personalized recommendations
   - User's response summary

4. **Assessment History**: View previous assessments and results
5. **Responsive Design**: Works on desktop and mobile devices

### Backend Features

1. **MongoDB Integration**: Stores assessments and AI analysis results
2. **Python AI Integration**: Calls Gemini AI for mental health analysis
3. **Authentication**: JWT-based user authentication
4. **Data Validation**: Comprehensive input validation
5. **Error Handling**: Robust error handling and logging

## File Structure

```
MetalHealth/
├── AI_ENV/
│   ├── analyze_mental_health.py    # Main AI analysis script
│   ├── test_integration.py         # Test script
│   └── .env                        # Python environment variables
├── base/
│   ├── models/
│   │   └── MentalHealthAssessment.js # MongoDB schema
│   ├── routes/
│   │   └── mentalhealth.js         # API routes
│   ├── server.js                   # Main server file
│   └── .env                        # Node.js environment variables
└── mental-health/
    ├── src/app/
    │   ├── home/
    │   │   ├── home.ts             # Home component logic
    │   │   ├── home.html           # Home component template
    │   │   └── home.css            # Home component styles
    │   └── services/
    │       └── mental-health.service.ts # API service
    └── src/index.html              # Main HTML file
```

## Testing

1. **Test AI Integration**: Run `python test_integration.py` in the AI_ENV directory
2. **Test Backend**: Use Postman or curl to test API endpoints
3. **Test Frontend**: Navigate to the home page and complete an assessment

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**: Ensure MongoDB is running on port 27017
2. **Python Import Error**: Make sure you're in the virtual environment
3. **API Key Error**: Verify your Gemini API key is correctly set in both .env files
4. **CORS Error**: Ensure the backend server is running on port 3000

### Logs

- Backend logs: Check the console output from the Node.js server
- Python logs: Check the console output from the Python script
- Frontend logs: Check the browser console for any JavaScript errors

## Security Notes

1. Never commit API keys to version control
2. Use environment variables for sensitive data
3. Implement proper authentication for production use
4. Consider rate limiting for API endpoints

## Next Steps

1. Add more sophisticated AI prompts
2. Implement assessment scheduling/reminders
3. Add data visualization for assessment trends
4. Integrate with external mental health resources
5. Add doctor/patient communication features
