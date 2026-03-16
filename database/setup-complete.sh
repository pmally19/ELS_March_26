#!/bin/bash
# JuneERP Complete Setup Script
# Sets up database and application

set -e

echo "=============================================="
echo "JUNEERP COMPLETE SETUP"
echo "=============================================="

# Setup database
echo "Setting up database..."
cd database
./restore.sh "$DATABASE_URL"
cd ..

# Setup application
echo "Setting up application..."
cd complete-project
npm install

echo "Configuring environment..."
cp .env.example .env
echo "Please edit .env with your database credentials"

echo "=============================================="
echo "SETUP COMPLETED!"
echo "=============================================="
echo "Next steps:"
echo "1. Edit complete-project/.env with your settings"
echo "2. cd complete-project && npm run dev"
echo "3. Access http://localhost:5173"
echo "=============================================="
