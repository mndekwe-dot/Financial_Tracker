#!/usr/bin/env bash
# Render build script: builds the React frontend, then prepares the Django backend.
set -o errexit

cd frontend
npm ci
npm run build
cd ..

cd backend
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
