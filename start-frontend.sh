#!/bin/bash

echo "🎨 Starting JioNews Translation Service Frontend..."
echo ""

# Check if node_modules exists
if [ ! -d frontend/node_modules ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install --cache /tmp/npm-cache-temp
    cd ..
fi

echo "Starting React development server..."
echo "Frontend will be available at http://localhost:3000"
echo ""
cd frontend && npm start
