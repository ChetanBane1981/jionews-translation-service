# JioNews Translation Service - Setup Guide

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Claude API key from Anthropic

## Quick Start

### 1. Get Your Claude API Key

1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it starts with `sk-ant-...`)

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env and add your Claude API key
# ANTHROPIC_API_KEY=sk-ant-your-key-here
# PORT=3001

# Start the backend server
npm run dev
```

The backend will start on `http://localhost:3001`

### 3. Frontend Setup

Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the React development server
npm start
```

The frontend will automatically open at `http://localhost:3000`

## Usage

1. **Select Headlines**: Choose one or more news headlines from the list
2. **Choose Language**: Select your target language (Hindi, Tamil, Telugu, etc.)
3. **Process**: Click "Process Headlines" button
4. **View Results**: See the 60-word English summary and translation

## API Endpoints

### GET `/api/headlines`
Returns all available sample headlines

### POST `/api/process-headline`
Process a single headline
```json
{
  "headline": "Your headline text",
  "targetLanguage": "Hindi"
}
```

### POST `/api/process-batch`
Process multiple headlines at once
```json
{
  "headlineIds": [1, 2, 3],
  "targetLanguage": "Hindi"
}
```

### GET `/health`
Health check endpoint

## Features

- **AI-Powered Summarization**: Uses Claude 4.5 to create concise 60-word summaries
- **Multi-Language Translation**: Supports 8 Indian languages
- **Batch Processing**: Process multiple headlines simultaneously
- **Real-time Updates**: See results as they're processed
- **Responsive Design**: Works on desktop and mobile devices

## Supported Languages

- Hindi
- Tamil
- Telugu
- Marathi
- Bengali
- Gujarati
- Kannada
- Malayalam

## Architecture

### Backend (Node.js + Express)
- RESTful API server
- Claude API integration using @anthropic-ai/sdk
- CORS enabled for frontend communication
- Error handling and validation

### Frontend (React)
- Modern, responsive UI
- Real-time processing feedback
- Batch selection and processing
- Clean, professional design

## Troubleshooting

### Backend won't start
- Ensure you've added your Claude API key to `.env`
- Check if port 3001 is already in use
- Verify Node.js version with `node --version`

### Frontend can't connect to backend
- Make sure backend is running on port 3001
- Check the proxy setting in `frontend/package.json`
- Clear browser cache and reload

### API errors
- Verify your Claude API key is valid
- Check your API usage limits
- Review backend logs for detailed error messages

## Development

### Backend Development
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm start  # Hot reload enabled
```

## Production Deployment

### Build Frontend
```bash
cd frontend
npm run build
```

### Start Backend
```bash
cd backend
npm start
```

## Cost Considerations

- Each headline processing makes 2 API calls to Claude
- Batch processing is more efficient than individual requests
- Monitor your API usage at https://console.anthropic.com/

## Team

Built by the JioNews Engineering Team (~10 engineers) for the 2026 Hackathon

## Support

For issues or questions:
- Check the API logs in the backend terminal
- Review the browser console for frontend errors
- Ensure all dependencies are properly installed
