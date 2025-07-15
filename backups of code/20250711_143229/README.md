# Weather Alert Monitor

A modern web-based weather alert monitoring system for tracking weather conditions across multiple business locations using real National Weather Service (NWS) data.

## Features

- **Multi-Country Weather Monitoring**: Track weather alerts for locations in the United States, Canada, and Mexico
- **Real-time Weather Monitoring**: Track weather alerts for multiple locations using live weather API data
- **Address Geocoding**: Automatic conversion of addresses to coordinates using OpenStreetMap
- **Interactive Map**: Visualize locations with weather alert status
- **Location Management**: Add, edit, and delete monitored locations
- **Site Type Filtering**: Filter locations by site type (office, warehouse, retail, etc.)
- **Alert Severity Levels**: Color-coded alerts (severe, moderate, minor, none)
- **Future Weather Events**: Schedule and monitor future weather events
- **API Status Monitoring**: Real-time connection status to weather services
- **Responsive Design**: Works on desktop and mobile devices
- **Resizable Interface**: Adjustable left panel for location list
- **Shared Database**: All users see the same saved locations (when using Flask server)

## APIs Used

- **National Weather Service (NWS)**: Real weather alerts and forecast data for United States
- **Environment Canada**: Weather alerts for Canadian locations (planned)
- **CONAGUA**: Weather alerts for Mexican locations (planned)
- **Google Maps Geocoding API**: Address geocoding service (requires API key)
- **Leaflet.js**: Interactive mapping

## Getting Started

### Option 1: Simple HTTP Server (Local Storage)
1. Clone or download this repository
2. **Set up Google Maps API Key** (required for geocoding):
   - Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Geocoding API
   - Open `script.js` and add your API key to the `GOOGLE_API_KEY` variable
3. Start the Flask backend server:
   ```bash
   python3 server.py
   ```
   This will start the backend API server on port 8202.

4. Start the frontend HTTP server:
   ```bash
   python3 -m http.server 8201
   ```
   This will start the frontend server on port 8201.

5. Open your browser and navigate to `http://localhost:8201`
6. Add your first location using the "Add Location" button

### Option 2: Flask Server (Shared Database) - Recommended
1. **Set up Google Maps API Key** (required for geocoding):
   - Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Geocoding API
   - Open `script.js` and add your API key to the `GOOGLE_API_KEY` variable
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the Flask server:
   ```bash
   python3 server.py
   ```
4. Open your browser and navigate to `http://localhost:8001`
5. All users will see the same locations and data

## Database

The app can operate in two modes:

- **Local Storage**: Uses browser localStorage (each user has their own data)
- **Shared Database**: Uses JSON file database (`database.json`) with Flask server (all users share data)

When using the Flask server, all locations are stored in `database.json` and shared across all users.

## Usage

### Adding Locations
1. Click "Add Location" in the header
2. Fill in the location details:
   - **Nickname**: A friendly name for the location
   - **Address**: Full street address (will be automatically geocoded)
   - **Site Type**: Choose from office, warehouse, retail, manufacturing, data center, or other
   - **Contact Info**: Optional site manager details
3. Click "Save Location" - the address will be geocoded and weather data fetched

### Monitoring Alerts
- **Red Markers**: Severe weather warnings (pulsing animation)
- **Orange Markers**: Weather watches
- **Yellow Markers**: Weather advisories
- **Green Markers**: No active alerts
- **API Status**: Shows connection status to weather services

#### Alert Styling
- **NWS Warnings**: Genuine National Weather Service warnings appear in very dark red
- **Manual Warnings**: Manually advanced alerts use standard red styling
- **Visual Distinction**: Helps users quickly identify real vs. scheduled weather alerts

### Real-time Updates
- Weather data automatically refreshes every 2 minutes
- Manual refresh available via the sync button
- API status indicator shows connection health

### Filtering Locations
Use the site type filters in the left panel to show/hide specific types of locations.

### Future Weather Events
- Schedule future weather events for testing
- Events automatically activate at scheduled times
- Visual indicators show future events with clock icons

## Technical Details

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Python Flask server (optional)
- **APIs**: 
  - National Weather Service (weather.gov) for real weather data
  - OpenStreetMap Nominatim for address geocoding
- **Map**: Leaflet.js for interactive mapping
- **Icons**: Font Awesome for UI icons
- **Storage**: JSON file database (shared) or localStorage (local)
- **Responsive**: Mobile-first design with CSS Grid and Flexbox

## Server API Endpoints

When using the Flask server:
- `GET /api/locations` - Get all locations
- `POST /api/locations` - Add new location
- `PUT /api/locations/<id>` - Update location
- `DELETE /api/locations/<id>` - Delete location
- `PUT /api/locations/bulk` - Update multiple locations
- `GET /api/database` - Get database info

## API Integration

The app integrates with multiple weather APIs:

1. **Geocoding**: Addresses are converted to coordinates using Google Maps Geocoding API
2. **Weather Data**: Real-time alerts are fetched from the National Weather Service API
3. **Error Handling**: Graceful fallbacks when APIs are unavailable
4. **Status Monitoring**: Visual indicators show API connection status

## Google Maps API Setup

To use the geocoding functionality, you need a Google Maps API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Geocoding API**
4. Create credentials (API key)
5. Copy the API key and add it to the `GOOGLE_API_KEY` variable in `script.js`

**Note**: Google Maps API has usage limits and may incur charges for high-volume usage.

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

This project is open source and available under the MIT License. 