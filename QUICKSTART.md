# JioNews Translation Service - Quick Start Guide

## What Changed?

Your application now fetches **real headlines from a live RSS feed** instead of using dummy data!

### New Features
- 📡 **Live RSS Feed**: Fetches from Asianet Newsable (newsable.asianetnews.com/rss/special)
- 💾 **MongoDB Storage**: Headlines are stored in a database
- 🖼️ **Images**: Shows article images from the feed
- 📊 **Stats**: View total headlines and categories
- 🔄 **Duplicate Prevention**: Won't store the same headline twice

## Prerequisites

1. **MongoDB** must be installed and running
2. **Claude API key** (already in your .env)
3. **Node.js** dependencies installed

## Step-by-Step Setup

### 1. Install MongoDB (If not already installed)

**Mac (using Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Verify MongoDB is running:**
```bash
mongosh --eval "db.version()"
```

### 2. Install New Dependencies

```bash
cd backend
npm install --cache /tmp/npm-cache-temp
```

This installs:
- `mongoose` - MongoDB ODM
- `rss-parser` - RSS feed parser

### 3. Update Environment Variables

The `.env` file already has your Claude API key. Just verify it includes:
```bash
cd backend
cat .env
```

Should show:
```
ANTHROPIC_API_KEY=sk-ant-api03-...
PORT=3001
MONGODB_URI=mongodb://localhost:27017/jionews
```

### 4. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB Connected: localhost
📊 Database: jionews
🚀 JioNews Translation Service running on port 3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Browser opens at http://localhost:3000

## Using the Application

### First Time Use:

1. **Fetch RSS Headlines**
   - Click the "Fetch Latest Headlines" button
   - Wait a few seconds
   - You'll see a popup: "RSS Feed fetched successfully! New: 24, Existing: 0"

2. **View Headlines**
   - Headlines appear in the list
   - Shows images, category, author, and date
   - Stats bar shows total headlines

3. **Process Headlines**
   - Select one or more headlines (checkbox)
   - Choose target language (Hindi, Tamil, etc.)
   - Click "Process X Headlines"
   - Claude AI generates:
     - 60-word English summary
     - Translation in your chosen language

### Subsequent Uses:

- Click "Fetch Latest Headlines" anytime to get new articles
- Already-stored headlines won't be duplicated
- All headlines persist in MongoDB between restarts

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/fetch-rss` | POST | Fetch fresh headlines from RSS feed |
| `/api/headlines` | GET | Get all stored headlines |
| `/api/stats` | GET | Database statistics |
| `/api/process-batch` | POST | Translate selected headlines |
| `/health` | GET | Check server & DB status |

## Troubleshooting

### MongoDB Connection Error

**Error:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Fix:**
```bash
# Check if MongoDB is running
brew services list

# Start it if stopped
brew services start mongodb-community
```

### No Headlines Showing

1. Click "Fetch Latest Headlines" button first
2. Check backend terminal for errors
3. Verify MongoDB is running: `mongosh`

### RSS Fetch Fails

- Check your internet connection
- RSS feed URL might be temporarily unavailable
- Check backend logs for specific error

### Frontend Can't Connect

- Make sure backend is running on port 3001
- Check backend terminal for startup messages
- Try http://localhost:3001/health in browser

## Database Commands

**View your data:**
```bash
mongosh
use jionews
db.headlines.find().pretty()
db.headlines.countDocuments()
```

**Clear all headlines (start fresh):**
```bash
mongosh
use jionews
db.headlines.deleteMany({})
```

## What's Stored in MongoDB?

Each headline includes:
- **title**: Headline text
- **link**: Article URL
- **description**: Brief summary
- **content**: Full article text
- **category**: Topic (Technology, Health, etc.)
- **creator**: Author name
- **pubDate**: Publication date
- **imageUrl**: Article image
- **guid**: Unique identifier (prevents duplicates)

## Architecture Flow

```
RSS Feed (newsable.asianetnews.com)
          ↓
    [Fetch Button]
          ↓
    Backend API (/api/fetch-rss)
          ↓
    RSS Parser (xml → json)
          ↓
    MongoDB (headlines collection)
          ↓
    Frontend (display headlines)
          ↓
    [Select & Process]
          ↓
    Claude AI (summarize + translate)
          ↓
    Display Results
```

## Key Files Changed

- `backend/server.js` - Added MongoDB integration
- `backend/models/Headline.js` - MongoDB schema
- `backend/services/rssFetcher.js` - RSS parsing logic
- `backend/config/database.js` - DB connection
- `frontend/src/App.js` - Added fetch button, stats display
- `frontend/src/App.css` - New styling for RSS panel, images

## Performance Notes

- **First fetch**: Takes ~5-10 seconds (fetches ~24 articles)
- **Subsequent fetches**: Only stores new articles (faster)
- **Processing**: Same as before (Claude API calls)
- **Database queries**: Very fast (<100ms)

## Cost Considerations

- **MongoDB**: Free (local) or Free Tier (Atlas)
- **RSS Fetching**: Free (no API key needed)
- **Claude API**: Same as before (per API call)

## Next Steps

1. Start MongoDB
2. Install dependencies
3. Start backend + frontend
4. Click "Fetch Latest Headlines"
5. Select and process!

## Help & Documentation

- **Full Setup**: See [SETUP.md](SETUP.md)
- **MongoDB Details**: See [MONGODB_SETUP.md](MONGODB_SETUP.md)
- **NPM Issues**: See [NPM_CACHE_FIX.md](NPM_CACHE_FIX.md)

---

**Ready?** Start MongoDB, then run `./start-backend.sh` and `./start-frontend.sh`!
