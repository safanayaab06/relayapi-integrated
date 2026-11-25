@echo off
 echo RelayAPI requires Docker Desktop and Node.js 20+.
 echo 1. Start PostgreSQL with: docker compose up -d db
 echo 2. In a second terminal: cd backend ^&^& copy .env.example .env ^&^& npm install ^&^& npm run db:init ^&^& npm run dev
 echo 3. In a third terminal at this folder: npm install ^&^& npm run dev
 pause
