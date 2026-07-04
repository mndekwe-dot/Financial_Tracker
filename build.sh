#!/usr/bin/env bash
# Render build script: builds the React frontend, then prepares the Django backend.
set -o errexit

cd frontend
npm install --no-audit --no-fund
npm run build
cd ..

cd backend
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
