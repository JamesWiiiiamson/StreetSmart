# SafeRoute - Intelligent Safety Routing App

SafeRoute is a modern web application that helps users choose the safest walking route using Google Maps and contextual safety data. The app analyzes crime hotspots, lighting conditions, business activity, and provides emergency escape routing.

## Features

- **Interactive Google Maps Integration**: Real-time navigation with Places, Directions, and Geolocation APIs
- **Safety Heatmap Layers**: Toggleable layers for crime data, street lighting, and commercial activity
- **Safety-Optimized Routing**: Compare fastest vs safest routes based on multiple safety factors
- **Emergency Escape Button**: Quickly find the nearest 24/7 safe location (pharmacy, gas station, etc.)
- **Nearby Safe Places Panel**: View open businesses, transit stations, and well-lit areas
- **Time-of-Day Safety**: Adaptive safety scoring based on current time
- **Mobile-Responsive Design**: Optimized for both desktop and mobile devices

## Safety Scoring Algorithm

The app uses a composite safety scoring model that evaluates:

1. **Crime Density** (High penalty)
   - Recent assaults, thefts, and vandalism in the past week
   - Higher severity crimes receive larger penalties

2. **Lighting Levels** (Medium penalty for low-light areas)
   - Street lighting data
   - Alley and residential area lighting
   - Commercial district lighting (well-lit areas)

3. **Commercial Activity** (Positive score)
   - Open businesses along the route
   - 24/7 establishments (pharmacies, gas stations, restaurants)
   - Higher foot traffic areas

4. **Human Presence Indicators** (Positive score)
   - Transit stops (subway, bus stations)
   - Residential density
   - Bike-share stations
   - ATMs and banks (well-lit)

5. **Time-of-Day Effects**
   - Nighttime reduces overall safety scores
   - Lighting and commercial activity become more important after sunset

Each segment of a route receives a composite score, and the safest route is calculated by minimizing risk while maintaining reasonable travel time.

## Setup Instructions

### 1. Get a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geolocation API
4. Create credentials (API Key)
5. Restrict the API key to your domain (optional but recommended for production)

### 2. Configure the API Key

Create a `.env` file in the root directory:

```env
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

**Important**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Locally

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## Project Structure

```
src/
├── components/
│   ├── Map.tsx                 # Google Maps integration
│   ├── SafetyLayers.tsx       # Layer toggle controls
│   ├── RouteOptions.tsx       # Route comparison UI
│   ├── EmergencyButton.tsx    # Emergency escape button
│   └── NearbySafePlaces.tsx   # Safe locations panel
├── pages/
│   └── Index.tsx              # Main application page
└── data/
    ├── crime-data.json        # Mock crime incident data
    ├── lighting-data.json     # Mock street lighting data
    └── safe-places.json       # Mock safe location data
```

## Customizing Risk Weights

To modify how the safety algorithm weighs different factors, edit the scoring logic in `src/components/Map.tsx`:

```typescript
// Example: Adjust crime severity weights
const crimeWeight = {
  high: -50,    // Adjust this value
  medium: -30,  // Adjust this value
  low: -10      // Adjust this value
};

// Example: Adjust lighting importance
const lightingWeight = {
  low: -20,     // Adjust this value
  medium: 0,
  high: +15     // Adjust this value
};
```

## Mock Data

The app currently uses mock data for demonstration purposes. The data files are located in `public/data/`:

- `crime-data.json`: Sample crime incidents with severity levels
- `lighting-data.json`: Sample street lighting conditions
- `safe-places.json`: Sample 24/7 businesses and safe locations

To use real data, you can:
1. Integrate with open crime data APIs (e.g., city government APIs)
2. Use OpenStreetMap for lighting data
3. Use Google Places API for business activity

## Technologies Used

- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Google Maps APIs** - Mapping and geolocation
- **Vite** - Build tool
- **Shadcn UI** - Component library
- **Sonner** - Toast notifications

## Deployment

This app can be deployed to any static hosting service:

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

Make sure to add your `VITE_GOOGLE_MAPS_API_KEY` as an environment variable in your deployment settings.

## Future Enhancements

- Real-time crime data integration
- User-reported incidents
- Route sharing with friends/family
- Live tracking for emergency contacts
- Integration with local police APIs
- Historical safety data analytics
- Community safety ratings

## License

MIT License - Feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please open an issue on the GitHub repository.
