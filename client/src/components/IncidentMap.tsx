'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Map, Marker, Popup, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import api from '@/lib/api';
import type { IncidentFeature, IncidentFeatureCollection } from '@/lib/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Continental US default view.
const US_CENTER = { longitude: -98.5795, latitude: 39.8283, zoom: 3.2 };

// Marker color rules:
//   red   = ACTIVE with at least one HIGH-priority open task
//   amber = ACTIVE (no high-priority tasks)
//   green = RESOLVED
function markerColor(f: IncidentFeature): string {
  const { status, high_priority_task_count } = f.properties;
  if (status === 'RESOLVED') return '#16a34a'; // green
  if (high_priority_task_count > 0) return '#dc2626'; // red
  return '#f59e0b'; // amber
}

export default function IncidentMap() {
  const mapRef = useRef<MapRef | null>(null);
  const [features, setFeatures] = useState<IncidentFeature[]>([]);
  const [selected, setSelected] = useState<IncidentFeature | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch the GeoJSON on mount.
  useEffect(() => {
    let active = true;
    api
      .get<IncidentFeatureCollection>('/incidents/map')
      .then(({ data }) => {
        if (active) setFeatures(data.features);
      })
      .catch(() => {
        if (active) setError('Failed to load incidents');
      });
    return () => {
      active = false;
    };
  }, []);

  // 4. Fit the map to all markers once data + map are ready.
  const fitToMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map || features.length === 0) return;

    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;
    for (const f of features) {
      const [lng, lat] = f.geometry.coordinates;
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }

    if (features.length === 1) {
      map.flyTo({ center: [minLng, minLat], zoom: 8 });
    } else {
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 64, duration: 800, maxZoom: 10 },
      );
    }
  }, [features]);

  useEffect(() => {
    fitToMarkers();
  }, [fitToMarkers]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 p-6 text-center text-gray-600">
        Set <code className="mx-1 rounded bg-gray-200 px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> in
        client/.env.local to display the map.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {error && (
        <div className="absolute left-2 top-2 z-10 rounded bg-red-600 px-3 py-1 text-sm text-white">
          {error}
        </div>
      )}
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={US_CENTER}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onLoad={fitToMarkers}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />

        {features.map((f) => {
          const [lng, lat] = f.geometry.coordinates;
          return (
            <Marker
              key={f.properties.id}
              longitude={lng}
              latitude={lat}
              anchor="center"
              onClick={(e) => {
                // Stop the click from propagating to the map (which closes popups).
                e.originalEvent.stopPropagation();
                setSelected(f);
              }}
            >
              <span
                className="block h-4 w-4 cursor-pointer rounded-full border-2 border-white shadow"
                style={{ backgroundColor: markerColor(f) }}
                title={f.properties.title}
              />
            </Marker>
          );
        })}

        {selected && (
          <Popup
            longitude={selected.geometry.coordinates[0]}
            latitude={selected.geometry.coordinates[1]}
            anchor="bottom"
            offset={16}
            onClose={() => setSelected(null)}
            closeOnClick={false}
          >
            <div className="space-y-2 p-1">
              <h3 className="font-semibold">{selected.properties.title}</h3>
              <p className="text-sm text-gray-600">
                Open tasks: {selected.properties.open_task_count}
                {selected.properties.high_priority_task_count > 0 && (
                  <span className="ml-1 font-medium text-red-600">
                    ({selected.properties.high_priority_task_count} high priority)
                  </span>
                )}
              </p>
              <Link
                href={`/incidents/${selected.properties.id}`}
                className="inline-block rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
              >
                View Incident
              </Link>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
