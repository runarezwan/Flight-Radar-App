# SkyTrack Pro ✈️

A premium, high-performance real-time flight tracking dashboard. Built with **Vite**, **Leaflet.js**, and the **OpenSky Network API**.

## ✨ Features
- **Real-time Tracking**: Live updates from the OpenSky Network API.
- **Premium Dark Aesthetic**: Sleek glassmorphism UI with a custom dark-mode map (CartoDB Dark Matter).
- **Interactive Dashboard**:
  - Live flight list with search/filter capabilities.
  - Detailed flight information panel (ICAO, Altitude, Speed, Heading, etc.).
  - Custom SVG flight markers that rotate based on real-time heading.
- **Auto-Update**: Automatically refreshes data every 15 seconds.

## 🚀 Tech Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Map Engine**: Leaflet.js.
- **API**: OpenSky Network REST API.
- **Build Tool**: Vite.
- **Typography**: Outfit (Google Fonts).

## 🛠️ Installation & Setup
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## 🗺️ Viewport
The application is currently configured to track flights over northern Europe (Finland/Baltics) by default for optimal performance and relevance.

---
*Created with ❤️ for Aviation Enthusiasts.*
