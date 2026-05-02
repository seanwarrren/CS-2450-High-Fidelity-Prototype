# TripPinner (Frontend Prototype)

A simple collaborative trip planning UI built with HTML, CSS, and JavaScript.

## Features
- Create trips
- View trips in card layout
- Friends list
- Interactive trip map
- Add pins to map
- Vote on locations

## Setup

1. Clone the repo
2. Create your Google Maps config file:
   ```
   cp js/config.example.js js/config.js
   ```
3. Open `js/config.js` and replace the placeholder with your Google Maps API key:
   ```javascript
   const GOOGLE_MAPS_API_KEY = 'YOUR_ACTUAL_API_KEY';
   ```
   You can get an API key from the [Google Cloud Console](https://console.cloud.google.com/google/maps-apis). Make sure the following APIs are enabled:
   - Maps JavaScript API
   - Geocoding API
   - Places API
4. Open `index.html` in your browser, or run a local server:
   ```
   python3 -m http.server
   ```
   Then open http://localhost:8000

> **Note:** `js/config.js` is gitignored to keep your API key out of version control.

## Notes
- This is a frontend-only prototype
