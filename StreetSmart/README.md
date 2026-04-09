# StreetSmart - Intelligent Safety Navigation

StreetSmart is a web application designed to help people find safer walking routes while walking at night, not just the shortest ones. Instead of optimizing for distance, StreetSmart prioritizes user safety by using data to decide route selection. This project was built with the idea of creating a community focused tool that could be used in real world scenarios.

It is a full-stack web application that helps users navigate safely by analyzing real-world safety data and providing optimized route recommendations based on crime hotspots, lighting conditions, and emergency escape routing.

## Features
- Real-time crime and lighting heatmap visualizations
- Multi-route comparison (fastest vs. safest)
- Nearby safe places discovery with real-time availability using Google Places API
- Community-driven safety reporting system

## Tech Stack
- Frontend: React, TypeScript, Tailwind CSS, Shadcn UI
- APIs: Google Maps (Maps, Places, Directions, Geolocation)
- Backend: Node.js, Express
- Data: Toronto Police Service crime data, Toronto Hydro streetlight data

## How It Works
1. Processes 365+ days of crime data and streetlight infrastructure into grid-based heatmaps
2. Calculates safety scores using weighted algorithm (70% crime, 30% lighting)
3. Compares multiple route alternatives using Google Directions API
4. Displays interactive visualizations with clickable statistics
