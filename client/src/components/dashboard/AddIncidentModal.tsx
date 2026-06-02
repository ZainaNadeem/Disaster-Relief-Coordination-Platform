'use client';

import { useState } from 'react';
import axios from 'axios';
import { Geocoder } from '@mapbox/search-js-react';
import api from '@/lib/api';
import type { Incident } from '@/lib/types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

interface Coords {
  lng: number;
  lat: number;
}

// Admin-only modal to create an incident. Location is picked with a Mapbox
// geocoder (client-side); if no token is configured it falls back to manual
// lat/lng inputs so the form still works.
export default function AddIncidentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (incident: Incident) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!coords) {
      setError('Select a location.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post<Incident>('/incidents', {
        title,
        description,
        lat: coords.lat,
        lng: coords.lng,
      });
      onCreated(data);
      onClose();
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Failed to create incident',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // The web-component-backed Geocoder has loose JSX typings; cast to a component.
  const GeocoderInput = Geocoder as unknown as React.ComponentType<Record<string, unknown>>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold">Add Incident</h2>
        {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <input
          required
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
        <textarea
          required
          placeholder="Description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Location</label>
          {MAPBOX_TOKEN ? (
            <>
              <GeocoderInput
                accessToken={MAPBOX_TOKEN}
                value={locationLabel}
                onChange={(v: string) => setLocationLabel(v)}
                options={{ country: 'US' }}
                onRetrieve={(feature: { geometry?: { coordinates?: [number, number] } }) => {
                  const c = feature?.geometry?.coordinates;
                  if (c) setCoords({ lng: c[0], lat: c[1] });
                }}
              />
              {coords && (
                <p className="mt-1 text-xs text-gray-500">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
              )}
            </>
          ) : (
            // Fallback: no Mapbox token → enter coordinates manually.
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                required
                placeholder="Latitude"
                onChange={(e) =>
                  setCoords((c) => ({ lng: c?.lng ?? 0, lat: Number(e.target.value) }))
                }
                className="w-full rounded border px-3 py-2"
              />
              <input
                type="number"
                step="any"
                required
                placeholder="Longitude"
                onChange={(e) =>
                  setCoords((c) => ({ lat: c?.lat ?? 0, lng: Number(e.target.value) }))
                }
                className="w-full rounded border px-3 py-2"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
