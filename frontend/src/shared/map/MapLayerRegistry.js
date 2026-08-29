/**
 * Map Layer Registry (§8.5, §8.9) — REAL, not stub.
 *
 * This is what lets four people add markers to one map without merge wars.
 * Each feature registers { id, label, defaultOn, render(map, data) }.
 * The shell renders toggles for all registered layers.
 *
 * Usage:
 *   import { registerLayer } from '../../shared/map/MapLayerRegistry';
 *   registerLayer({
 *     id: 'bus-stops',
 *     label: 'Bus Stops',
 *     defaultOn: true,
 *     render: (map, data) => {
 *       // Add markers, popups, etc. to the MapLibre map instance
 *     }
 *   });
 */

const layers = new Map();

/**
 * Register a map layer.
 *
 * @param {Object} layer
 * @param {string} layer.id - Unique layer identifier
 * @param {string} layer.label - Display name for UI toggle
 * @param {boolean} layer.defaultOn - Whether layer is visible on load
 * @param {Function} layer.render - (map, data) => void. Called when layer is toggled on.
 * @param {Function} [layer.cleanup] - Optional cleanup function called when toggled off
 */
export function registerLayer(layer) {
  if (!layer.id || !layer.label || typeof layer.render !== 'function') {
    throw new Error('Layer must have id, label, and render function');
  }
  
  if (layers.has(layer.id)) {
    console.warn(`Layer "${layer.id}" already registered. Overwriting.`);
  }
  
  layers.set(layer.id, {
    id: layer.id,
    label: layer.label,
    defaultOn: layer.defaultOn !== false, // Default to true unless explicitly false
    render: layer.render,
    cleanup: layer.cleanup || (() => {}),
  });
}

/**
 * Get all registered layers.
 *
 * @returns {Array} Array of layer objects
 */
export function getAllLayers() {
  return Array.from(layers.values());
}

/**
 * Get a specific layer by ID.
 *
 * @param {string} id
 * @returns {Object|null} Layer object or null if not found
 */
export function getLayer(id) {
  return layers.get(id) || null;
}

/**
 * Unregister a layer (rarely needed, but available for cleanup).
 *
 * @param {string} id
 */
export function unregisterLayer(id) {
  layers.delete(id);
}

/**
 * Clear all layers (useful for testing or hot-reload).
 */
export function clearAllLayers() {
  layers.clear();
}

/**
 * Example layer registrations (§8 features can follow this pattern).
 */

// Example: Bus stops layer
export const registerBusStopsLayer = () => {
  registerLayer({
    id: 'bus-stops',
    label: 'Bus Stops',
    defaultOn: true,
    render: (map, data) => {
      if (!data.stops) return;
      
      // Add GeoJSON source
      if (!map.getSource('bus-stops')) {
        map.addSource('bus-stops', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: data.stops.map(stop => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: stop.location.coordinates, // [lng, lat]
              },
              properties: {
                id: stop.id,
                code: stop.code,
                name: stop.name,
                nameMr: stop.nameMr,
                isDepot: stop.isDepot,
                isMandi: stop.isMandi,
              },
            })),
          },
        });
      }
      
      // Add circle layer
      if (!map.getLayer('bus-stops-circles')) {
        map.addLayer({
          id: 'bus-stops-circles',
          type: 'circle',
          source: 'bus-stops',
          paint: {
            'circle-radius': [
              'case',
              ['get', 'isDepot'], 10,
              ['get', 'isMandi'], 8,
              6,
            ],
            'circle-color': [
              'case',
              ['get', 'isDepot'], '#3b82f6',
              ['get', 'isMandi'], '#10b981',
              '#6b7280',
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
      }
      
      // Add labels
      if (!map.getLayer('bus-stops-labels')) {
        map.addLayer({
          id: 'bus-stops-labels',
          type: 'symbol',
          source: 'bus-stops',
          layout: {
            'text-field': ['get', 'code'],
            'text-size': 11,
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#1f2937',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1,
          },
        });
      }
      
      // Add popups
      map.on('click', 'bus-stops-circles', (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        
        new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-2">
              <h3 class="font-semibold">${props.name}</h3>
              <p class="text-xs text-gray-600">${props.nameMr || ''}</p>
              <p class="text-xs mt-1"><span class="font-mono">${props.code}</span></p>
              ${props.isDepot ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Depot</span>' : ''}
              ${props.isMandi ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">APMC</span>' : ''}
            </div>
          `)
          .addTo(map);
      });
      
      map.on('mouseenter', 'bus-stops-circles', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      
      map.on('mouseleave', 'bus-stops-circles', () => {
        map.getCanvas().style.cursor = '';
      });
    },
    cleanup: (map) => {
      // Remove layers and source when toggled off
      if (map.getLayer('bus-stops-labels')) map.removeLayer('bus-stops-labels');
      if (map.getLayer('bus-stops-circles')) map.removeLayer('bus-stops-circles');
      if (map.getSource('bus-stops')) map.removeSource('bus-stops');
    },
  });
};

// Example: Bus routes layer
export const registerBusRoutesLayer = () => {
  registerLayer({
    id: 'bus-routes',
    label: 'Bus Routes',
    defaultOn: false,
    render: (map, data) => {
      if (!data.routes) return;
      
      // TODO: P4 implements route polylines
      // For each route, draw LineString connecting stops
    },
    cleanup: (map) => {
      if (map.getLayer('bus-routes-lines')) map.removeLayer('bus-routes-lines');
      if (map.getSource('bus-routes')) map.removeSource('bus-routes');
    },
  });
};

// Example: EV charging candidates layer
export const registerEVCandidatesLayer = () => {
  registerLayer({
    id: 'ev-candidates',
    label: 'EV Charging Sites',
    defaultOn: false,
    render: (map, data) => {
      if (!data.candidates) return;
      
      if (!map.getSource('ev-candidates')) {
        map.addSource('ev-candidates', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: data.candidates.map(c => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: c.location.coordinates,
              },
              properties: {
                id: c.id,
                name: c.name,
                siteType: c.siteType,
                totalScore: c.totalScore,
                selected: c.selected,
              },
            })),
          },
        });
      }
      
      if (!map.getLayer('ev-candidates-circles')) {
        map.addLayer({
          id: 'ev-candidates-circles',
          type: 'circle',
          source: 'ev-candidates',
          paint: {
            'circle-radius': ['case', ['get', 'selected'], 12, 8],
            'circle-color': ['case', ['get', 'selected'], '#10b981', '#d1d5db'],
            'circle-stroke-width': 2,
            'circle-stroke-color': ['case', ['get', 'selected'], '#059669', '#9ca3af'],
          },
        });
      }
    },
    cleanup: (map) => {
      if (map.getLayer('ev-candidates-circles')) map.removeLayer('ev-candidates-circles');
      if (map.getSource('ev-candidates')) map.removeSource('ev-candidates');
    },
  });
};

// Example: Congestion overlay layer
export const registerCongestionLayer = () => {
  registerLayer({
    id: 'congestion',
    label: 'Traffic Congestion',
    defaultOn: false,
    render: (map, data) => {
      if (!data.congestionSegments) return;
      
      // TODO: P4 implements heatmap or colored road segments
      // Based on edgeSpeedFactors from environment
    },
    cleanup: (map) => {
      if (map.getLayer('congestion-heatmap')) map.removeLayer('congestion-heatmap');
      if (map.getSource('congestion')) map.removeSource('congestion');
    },
  });
};

// Example: Rain overlay layer
export const registerRainLayer = () => {
  registerLayer({
    id: 'rain',
    label: 'Rain Probability',
    defaultOn: false,
    render: (map, data) => {
      if (!data.rainProbPct) return;
      
      // TODO: P4 implements rain overlay visualization
      // Could be a semi-transparent polygon over affected areas
    },
    cleanup: (map) => {
      if (map.getLayer('rain-overlay')) map.removeLayer('rain-overlay');
      if (map.getSource('rain')) map.removeSource('rain');
    },
  });
};

/**
 * Auto-register example layers on module load.
 * In production, each feature module would call registerLayer() on import.
 */
if (typeof window !== 'undefined') {
  // Only register in browser, not during SSR
  registerBusStopsLayer();
  registerBusRoutesLayer();
  registerEVCandidatesLayer();
  registerCongestionLayer();
  registerRainLayer();
}

export default {
  registerLayer,
  getAllLayers,
  getLayer,
  unregisterLayer,
  clearAllLayers,
};
