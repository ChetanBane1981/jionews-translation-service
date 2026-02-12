# MongoDB Setup Guide

## Prerequisites

You need MongoDB installed and running on your system.

## Installation Options

### Option 1: Install MongoDB Community Edition (Recommended for Mac)

```bash
# Install using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify it's running
mongosh --eval "db.version()"
```

### Option 2: Use MongoDB Atlas (Cloud - Free Tier)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for a free account
3. Create a new cluster (Free tier available)
4. Get your connection string
5. Update `.env` with:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jionews
   ```

### Option 3: Using Docker

```bash
# Run MongoDB in Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Check if it's running
docker ps
```

## Configuration

1. **Copy environment file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `.env` file:**
   ```
   ANTHROPIC_API_KEY=your_claude_api_key
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/jionews
   ```

   For MongoDB Atlas, use your connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jionews
   ```

## Starting the Application

### Terminal 1 - Start Backend
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

### Terminal 2 - Start Frontend
```bash
cd frontend
npm start
```

## Fetching RSS Headlines

Once both servers are running:

1. Open http://localhost:3000
2. Click "Fetch Latest Headlines" button
3. Headlines from the RSS feed will be stored in MongoDB
4. Select headlines and process them

## API Workflow

```
POST /api/fetch-rss
    ↓
Fetches RSS from newsable.asianetnews.com
    ↓
Parses XML feed
    ↓
Stores in MongoDB (headlines collection)
    ↓
GET /api/headlines
    ↓
Returns headlines from database
```

## MongoDB Collections

### headlines Collection Schema:
```javascript
{
  title: String,
  link: String,
  description: String,
  content: String,
  category: String,
  creator: String,
  pubDate: Date,
  guid: String (unique),
  imageUrl: String,
  isoDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Useful MongoDB Commands

### Access MongoDB Shell
```bash
mongosh
```

### View Database and Collections
```javascript
use jionews
show collections
db.headlines.countDocuments()
```

### View Headlines
```javascript
// Get latest 5 headlines
db.headlines.find().sort({pubDate: -1}).limit(5).pretty()

// Get headlines by category
db.headlines.find({category: "Technology"}).pretty()

// Count by category
db.headlines.aggregate([
  { $group: { _id: "$category", count: { $sum: 1 } } }
])
```

### Clear All Headlines (if needed)
```javascript
db.headlines.deleteMany({})
```

## Troubleshooting

### MongoDB Connection Failed

**Error:** `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution:**
```bash
# Check if MongoDB is running
brew services list

# Start MongoDB if stopped
brew services start mongodb-community

# Or using Docker
docker start mongodb
```

### Duplicate Key Error

If you get duplicate key errors when fetching RSS:
```javascript
// In mongosh
use jionews
db.headlines.drop()
```
Then fetch RSS again.

### Port Already in Use

If port 27017 is already in use:
```bash
# Find process using port
lsof -ti:27017

# Kill the process
kill -9 <PID>

# Or change MongoDB port in .env
MONGODB_URI=mongodb://localhost:27018/jionews
```

## Checking Database Stats

Use the API endpoint:
```bash
curl http://localhost:3001/api/stats
```

Response:
```json
{
  "totalHeadlines": 24,
  "categories": [
    { "_id": "Technology", "count": 5 },
    { "_id": "Health", "count": 4 }
  ],
  "latestHeadline": {
    "title": "...",
    "pubDate": "2025-08-30T..."
  }
}
```

## Production Considerations

For production deployment:

1. **Use MongoDB Atlas** for managed hosting
2. **Enable authentication:**
   ```
   MONGODB_URI=mongodb://username:password@host:port/jionews?authSource=admin
   ```
3. **Set up indexes** for better performance
4. **Enable backups** on MongoDB Atlas
5. **Monitor database** size and performance

## Data Flow

1. **Initial Setup:** MongoDB is empty
2. **Fetch RSS:** Click button → Fetches 20+ headlines from RSS feed
3. **Store:** Headlines saved to MongoDB (duplicates skipped by guid)
4. **Display:** Frontend shows headlines from database
5. **Process:** Select & translate using Claude AI
6. **Repeat:** Can fetch RSS again to get latest headlines

## Notes

- RSS feed is fetched on-demand (not automatically)
- Duplicate headlines are prevented using the `guid` field
- Images are stored as URLs (not downloaded)
- MongoDB connection is established on server start
- Database persists data between restarts
