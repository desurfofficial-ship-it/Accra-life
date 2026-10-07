/**
 * AccraMap.tsx — Real-world Mapbox base layer for Accra Life
 *
 * Renders a Mapbox GL map centered on Accra, Ghana (5.6037, -0.1870)
 * with 3D buildings enabled. This is the base layer — R3F 3D objects
 * (Tro-tro stops, player avatar, props) will be overlaid on top later.
 *
 * The map uses 'mapbox://styles/mapbox/standard' with 3D building layer
 * enabled via setLayoutProperty on the '3d-buildings' layer.
 *
 * Mapbox token is passed via props (from the parent component) or can
 * be set via the VITE_MAPBOX_TOKEN env var. For dev, it's hardcoded.
 */

import { useRef, useEffect, type ReactNode } from 'react';
import Map, { useMap } from 'react-map-gl/mapbox';
import mapboxgl from 'mapbox-gl';

export interface AccraMapProps {
  /** Mapbox access token. Falls back to the hardcoded dev token. */
  mapboxToken?: string;
  /** Children rendered on top of the map (R3F Canvas, HUD overlay, etc.) */
  children?: ReactNode;
}

// Accra, Ghana — the center of the world for this game.
const ACCRA_CENTER = {
  latitude: 5.6037,
  longitude: -0.1870,
  zoom: 14,
  pitch: 45,           // tilted for 3D building visibility
  bearing: 0,
};

// Dev token — set VITE_MAPBOX_TOKEN in .env.local for local dev.
// Do NOT hardcode Mapbox tokens in source code — GitHub's secret
// scanner will block the push. Get a free token at:
// https://account.mapbox.com/access-tokens/

/** Inner component that configures 3D buildings after the map loads. */
function ThreeDBuildingsConfigurator() {
  const { current: mapRef } = useMap();

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();

    // Wait for the style to load, then enable 3D buildings.
    const enable3DBuildings = () => {
      const layers = map.getStyle()?.layers;
      if (!layers) return;

      // Find the '3d-buildings' layer (or the symbol layer to insert before).
      let labelLayerId: string | undefined;
      for (const layer of layers) {
        if (layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout) {
          labelLayerId = layer.id;
          break;
        }
      }

      // If the 3D buildings layer doesn't exist yet, add it.
      if (!map.getLayer('3d-buildings')) {
        map.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          type: 'fill-extrusion',
          minzoom: 14,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['get', 'height'],
              0, '#475569',     // short buildings — dark grey
              20, '#64748b',    // mid — grey
              50, '#94a3b8',    // tall — light grey
              100, '#cbd5e1',   // very tall — silver
            ],
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              15.05,
              ['get', 'height'],
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              15.05,
              ['get', 'min_height'],
            ],
            'fill-extrusion-opacity': 0.85,
          },
        }, labelLayerId);
      }

      // Add sky gradient for atmospheric depth.
      if (!map.getLayer('sky')) {
        map.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'gradient',
            'sky-gradient': [
              'interpolate',
              ['linear'],
              ['sky-radial-progress'],
              0, '#fde047',     // horizon — Accra golden
              0.5, '#7dd3fc',   // mid sky — blue
              1, '#0c4a6e',    // zenith — deep blue
            ],
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      enable3DBuildings();
    } else {
      map.on('style.load', enable3DBuildings);
    }

    return () => {
      map.off('style.load', enable3DBuildings);
    };
  }, [mapRef]);

  return null;
}

export function AccraMap({ mapboxToken, children }: AccraMapProps) {
  const token = mapboxToken || import.meta.env.VITE_MAPBOX_TOKEN || '';
  mapboxgl.accessToken = token;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <Map
        initialViewState={ACCRA_CENTER}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/standard"
        mapboxAccessToken={token}
        attributionControl={false}
      >
        <ThreeDBuildingsConfigurator />
      </Map>

      {/* Children overlaid on top of the Mapbox canvas.
          R3F Canvas, HUD, etc. go here in future phases. */}
      {children && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          {children}
        </div>
      )}
    </div>
  );
}
