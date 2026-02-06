#!/bin/bash
# Quick Start Script - Development Mode

if [ -z "$DATABASE_URL" ]; then
    echo "Please set DATABASE_URL first:"
    echo "export DATABASE_URL='postgresql://user:password@host:port/database'"
    exit 1
fi

echo "Starting JuneERP development server..."
npm run dev
