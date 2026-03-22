import L from 'leaflet';
import './style.css';

// --- Configuration ---
const OPENSKY_URL = 'https://opensky-network.org/api/states/all';
const REFRESH_INTERVAL = 15000; // 15 seconds (OpenSky limit for anonymous is 10s, better play safe)
const DARK_MAP_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_MAP_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Finland Bounding Box (Default view)
const INITIAL_VIEW = [60.1699, 24.9384]; // Helsinki
const INITIAL_ZOOM = 6;

// --- State Management ---
let map;
let flights = new Map(); // icao24 -> { marker, data }
let selectedIcao = null;
let markersLayer;

// --- DOM Elements ---
const flightCountEl = document.getElementById('flight-count');
const lastUpdateEl = document.getElementById('last-update');
const flightListEl = document.getElementById('flight-list');
const flightSearchEl = document.getElementById('flight-search');
const detailsPanelEl = document.getElementById('flight-details');
const detailsContentEl = document.getElementById('details-content');
const closeDetailsBtn = document.getElementById('close-details');

// --- Initialization ---
function initApp() {
  initMap();
  fetchFlights();
  setInterval(fetchFlights, REFRESH_INTERVAL);

  // Event Listeners
  flightSearchEl.addEventListener('input', updateFlightList);
  closeDetailsBtn.addEventListener('click', hideDetails);
}

function initMap() {
  map = L.map('map', {
    zoomControl: false,
    attributionControl: true
  }).setView(INITIAL_VIEW, INITIAL_ZOOM);

  L.tileLayer(DARK_MAP_TILES, {
    attribution: DARK_MAP_ATTRIBUTION,
    maxZoom: 19
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

// --- API Logic ---
async function fetchFlights() {
  try {
    // We use a bounding box around Finland to avoid hitting payload limits + relevance
    // lamin, lomin, lamax, lomax
    const response = await fetch(`${OPENSKY_URL}?lamin=59.0&lomin=19.0&lamax=70.0&lomax=33.0`);
    if (!response.ok) throw new Error('Network error');
    
    const data = await response.json();
    processFlightData(data.states || []);
    updateUI();
  } catch (error) {
    console.error('Failed to fetch flights:', error);
  }
}

function processFlightData(states) {
  const currentIcaoSet = new Set();
  
  states.forEach(state => {
    const flight = {
      icao24: state[0],
      callsign: state[1] ? state[1].trim() : 'N/A',
      country: state[2],
      lastContact: state[3],
      longitude: state[5],
      latitude: state[6],
      altitude: state[7] ? Math.round(state[7] * 3.28084) : 0, // meters to ft
      onGround: state[8],
      velocity: state[9] ? Math.round(state[9] * 1.94384) : 0, // m/s to knots
      heading: state[10] || 0,
      verticalRate: state[11],
    };

    if (!flight.latitude || !flight.longitude) return;

    currentIcaoSet.add(flight.icao24);
    updateOrAddFlightMarker(flight);
  });

  // Remove flights no longer in the sky
  for (let [icao, flightData] of flights) {
    if (!currentIcaoSet.has(icao)) {
      markersLayer.removeLayer(flightData.marker);
      flights.delete(icao);
      if (selectedIcao === icao) hideDetails();
    }
  }
}

// --- Marker Logic ---
function updateOrAddFlightMarker(flight) {
  const { icao24, latitude, longitude, heading, callsign } = flight;
  
  const planeIcon = L.divIcon({
    html: `
      <div class="plane-marker ${selectedIcao === icao24 ? 'selected' : ''}" style="transform: rotate(${heading}deg);">
        <svg viewBox="0 0 24 24" width="32" height="32">
          <path d="M21,16L21,14L13,9L13,3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5L10,9L2,14L2,16L10,13.5L10,19L8,20.5L8,22L11.5,21L15,22L15,20.5L13,19L13,13.5L21,16Z" />
        </svg>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  if (flights.has(icao24)) {
    const entry = flights.get(icao24);
    entry.marker.setLatLng([latitude, longitude]);
    entry.marker.setIcon(planeIcon);
    entry.data = flight;
  } else {
    const marker = L.marker([latitude, longitude], { icon: planeIcon })
      .on('click', () => showDetails(icao24))
      .addTo(markersLayer);
    
    flights.set(icao24, { marker, data: flight });
  }

  // Update popup if marker is clicked but we want a tooltip too
  flights.get(icao24).marker.bindTooltip(callsign, { 
    permanent: false, 
    direction: 'top',
    offset: [0, -10],
    className: 'callsign-tooltip'
  });
}

// --- UI Logic ---
function updateUI() {
  flightCountEl.textContent = flights.size;
  lastUpdateEl.textContent = new Date().toLocaleTimeString();
  updateFlightList();

  if (selectedIcao && flights.has(selectedIcao)) {
    renderDetails(flights.get(selectedIcao).data);
  }
}

function updateFlightList() {
  const searchTerm = flightSearchEl.value.toLowerCase();
  const sortedFlights = Array.from(flights.values())
    .map(f => f.data)
    .filter(f => f.callsign.toLowerCase().includes(searchTerm))
    .sort((a, b) => a.callsign.localeCompare(b.callsign));

  if (sortedFlights.length === 0) {
    flightListEl.innerHTML = '<div class="no-results">No flights found</div>';
    return;
  }

  flightListEl.innerHTML = sortedFlights.map(f => `
    <div class="flight-card ${selectedIcao === f.icao24 ? 'active' : ''}" onclick="window.selectFlight('${f.icao24}')">
      <div class="flight-info">
        <h3>${f.callsign}</h3>
        <p>${f.country}</p>
      </div>
      <div class="flight-value">
        <div class="speed">${f.velocity} KT</div>
        <p>${f.altitude} FT</p>
      </div>
    </div>
  `).join('');
}

function showDetails(icao24) {
  const flight = flights.get(icao24);
  if (!flight) return;

  selectedIcao = icao24;
  detailsPanelEl.classList.remove('hidden');
  renderDetails(flight.data);
  updateUI(); // Refresh list to show active state
  
  // Center map on flight
  map.panTo([flight.data.latitude, flight.data.longitude]);
}

function renderDetails(f) {
  detailsContentEl.innerHTML = `
    <div class="details-header">
      <div class="callsign-badge">${f.callsign}</div>
      <div>
        <p style="font-size: 14px; font-weight: 600;">${f.country}</p>
        <p style="font-size: 10px; color: var(--text-secondary);">ICAO: ${f.icao24.toUpperCase()}</p>
      </div>
    </div>
    <div class="details-grid">
      <div class="detail-item">
        <span class="label">ALTITUDE</span>
        <span class="value">${f.altitude.toLocaleString()} FT</span>
      </div>
      <div class="detail-item">
        <span class="label">GROUND SPEED</span>
        <span class="value">${f.velocity} KT</span>
      </div>
      <div class="detail-item">
        <span class="label">HEADING</span>
        <span class="value">${f.heading}°</span>
      </div>
      <div class="detail-item">
        <span class="label">VERT RATE</span>
        <span class="value">${f.verticalRate || 0} m/s</span>
      </div>
      <div class="detail-item">
        <span class="label">LATITUDE</span>
        <span class="value">${f.latitude.toFixed(4)}</span>
      </div>
      <div class="detail-item">
        <span class="label">LONGITUDE</span>
        <span class="value">${f.longitude.toFixed(4)}</span>
      </div>
    </div>
  `;
}

function hideDetails() {
  selectedIcao = null;
  detailsPanelEl.classList.add('hidden');
  updateUI();
}

// Global exposure for onclick
window.selectFlight = (icao) => showDetails(icao);

// Start
document.addEventListener('DOMContentLoaded', initApp);
