# JioNews Translation Service

> AI-powered news headline summarization and translation service using Claude 4.5

## Overview

The JioNews Translation Service is a full-stack application that uses Claude AI to automatically summarize news headlines into 60-word summaries and translate them into multiple Indian languages. Built for the JioNews platform hackathon initiative.

## Features

- **Live RSS Feed Integration**: Fetches real headlines from Asianet Newsable RSS feed
- **MongoDB Storage**: Persistent storage of headlines in MongoDB database
- **AI-Powered Summarization**: Converts lengthy headlines into precise 60-word summaries using Claude 4.5
- **Multi-Language Translation**: Supports 8 Indian languages (Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam)
- **Batch Processing**: Process multiple headlines simultaneously for efficiency
- **Real-time Processing**: Live feedback and results display
- **Professional UI**: Clean, responsive React interface with modern design
- **Image Support**: Displays article images from RSS feed

## Tech Stack

### Backend
- **Node.js** with Express
- **MongoDB** with Mongoose ODM for data persistence
- **RSS Parser** for fetching and parsing XML feeds
- **Claude API** (@anthropic-ai/sdk) - Sonnet 4.5 model
- **CORS** enabled for frontend communication
- RESTful API architecture

### Frontend
- **React** 18
- Modern, responsive UI
- Real-time updates
- Gradient design with smooth animations

## Quick Start

### Prerequisites
- Node.js v16+
- MongoDB (local or Atlas)
- Claude API key ([Get one here](https://console.anthropic.com/))

### Installation

1. **Clone and navigate to the project**
```bash
cd jionews-translation-service
```

2. **Install & Start MongoDB**
```bash
# Mac with Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# OR use MongoDB Atlas (cloud)
# See MONGODB_SETUP.md for details
```

3. **Setup Backend**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add:
# - ANTHROPIC_API_KEY
# - MONGODB_URI
npm run dev
```

4. **Setup Frontend** (in a new terminal)
```bash
cd frontend
npm install
npm start
```

5. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

See [SETUP.md](SETUP.md) for detailed setup instructions and [MONGODB_SETUP.md](MONGODB_SETUP.md) for MongoDB configuration.

## How It Works

1. **Fetch RSS Feed**: Click "Fetch Latest Headlines" to pull live news from Asianet Newsable
2. **Store in MongoDB**: Headlines are parsed and saved to MongoDB database
3. **Select Headlines**: Choose one or more headlines from the list
4. **Choose Target Language**: Select from 8 Indian languages
5. **Process**: Click to send headlines to Claude AI
6. **Get Results**: Receive:
   - 60-word English summary
   - Translated summary in target language

## Live RSS Feed

Headlines are fetched from:
- **Source**: Asianet Newsable Special Feed
- **URL**: https://newsable.asianetnews.com/rss/special
- **Coverage**: Technology, Health, Finance, Culture, Lifestyle, and more
- **Updates**: Fetch latest headlines anytime with one click
- **Images**: Includes article images when available

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fetch-rss` | Fetch and store headlines from RSS feed |
| GET | `/api/headlines` | Get all headlines from MongoDB |
| GET | `/api/headlines/:id` | Get single headline by ID |
| POST | `/api/process-headline` | Process single headline with Claude AI |
| POST | `/api/process-batch` | Process multiple headlines in batch |
| GET | `/api/stats` | Get database statistics |
| GET | `/health` | Health check (includes DB status) |

## Architecture

```
jionews-translation-service/
├── backend/
│   ├── server.js              # Express server & API routes
│   ├── config/
│   │   └── database.js        # MongoDB connection
│   ├── models/
│   │   └── Headline.js        # Mongoose schema
│   ├── services/
│   │   └── rssFetcher.js      # RSS feed parser & storage
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React component
│   │   ├── App.css           # Styles
│   │   ├── index.js
│   │   └── index.css
│   ├── public/
│   │   └── index.html
│   └── package.json
├── README.md
└── SETUP.md
```

## Configuration

### Environment Variables (Backend)
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3001
MONGODB_URI=mongodb://localhost:27017/jionews
```

### Supported Languages
- Hindi (हिन्दी)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Marathi (मराठी)
- Bengali (বাংলা)
- Gujarati (ગુજરાતી)
- Kannada (ಕನ್ನಡ)
- Malayalam (മലയാളം)

## Development

Built by a team of ~10 engineers with extensive LLM API experience as part of the JioNews hackathon initiative.

### Key Technologies
- **Claude Sonnet 4.5**: Latest Claude model for high-quality summarization and translation
- **MongoDB**: NoSQL database for headline storage
- **Mongoose**: Elegant MongoDB object modeling
- **RSS Parser**: Parse and extract data from XML feeds
- **Express.js**: Fast, minimal backend framework
- **React**: Component-based UI library
- **Anthropic SDK**: Official JavaScript SDK for Claude API

## Performance

- **Persistent Storage**: Headlines stored in MongoDB for fast retrieval
- **Duplicate Prevention**: Unique constraint on RSS feed GUIDs
- **Batch Processing**: Multiple headlines processed in parallel
- **Optimized Prompts**: Clear, specific prompts for consistent results
- **Indexed Queries**: MongoDB indexes for faster searches
- **Error Handling**: Comprehensive error management and user feedback

## Future Enhancements

- [ ] More language support
- [ ] User authentication
- [ ] Save/export results
- [ ] Custom headline input
- [ ] Translation quality metrics
- [ ] Voice output for translations

## Contributing

This is a hackathon project for JioNews. For issues or suggestions, please contact the development team.

## License

Proprietary - JioNews Platform

## Acknowledgments

- Powered by Claude AI (Anthropic)
- Built for JioNews Hackathon 2026
- Team: ~10 engineers across functions

---

**Need Help?**
- [SETUP.md](SETUP.md) - Detailed setup instructions
- [MONGODB_SETUP.md](MONGODB_SETUP.md) - MongoDB configuration and troubleshooting
- [NPM_CACHE_FIX.md](NPM_CACHE_FIX.md) - Fix npm cache issues
