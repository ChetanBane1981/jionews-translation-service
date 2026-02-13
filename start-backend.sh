#!/bin/bash

echo "🚀 Starting JioNews Translation Service Backend..."
echo ""

# Check if .env exists
if [ ! -f backend/.env ]; then
    echo "⚠️  Warning: backend/.env file not found"
    echo "Creating .env from .env.example..."
    cp backend/.env.example backend/.env
    echo "✅ .env file created"
    echo ""
fi

# Check if node_modules exists
if [ ! -d backend/node_modules ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install --cache /tmp/npm-cache-temp
    cd ..
fi

echo "Starting backend on port 3001..."
echo "Backend will be available at http://localhost:3001"
echo ""
cd backend && npm run dev
