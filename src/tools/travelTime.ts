import { tool } from 'ai';
import { z } from 'zod';

const ONEMAP_BASE = 'https://www.onemap.gov.sg';

// Reads a pre-obtained OneMap JWT from ONEMAP_TOKEN in .env.
// Tokens are valid for 3 days — update ONEMAP_TOKEN when it expires.
function getToken(): string {
  const token = process.env.ONEMAP_TOKEN;
  if (!token) throw new Error('ONEMAP_TOKEN is not set in environment variables');
  return token;
}

// --- Geocoding ---

interface Coordinates {
  lat: number;
  lon: number;
  resolved: string; // human-readable name from OneMap
}

async function geocode(locationName: string, token: string): Promise<Coordinates> {
  const url =
    `${ONEMAP_BASE}/api/common/elastic/search` +
    `?searchVal=${encodeURIComponent(locationName)}&returnGeom=Y&getAddrDetails=N&pageNum=1`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Geocode request failed for "${locationName}": ${res.status}`);

  const data = await res.json() as {
    results?: Array<{ LATITUDE: string; LONGITUDE: string; SEARCHVAL: string }>;
  };

  if (!data.results?.length) throw new Error(`No location found for "${locationName}"`);

  const first = data.results[0];
  return {
    lat: parseFloat(first.LATITUDE),
    lon: parseFloat(first.LONGITUDE),
    resolved: first.SEARCHVAL,
  };
}

// --- Drive routing ---

async function getDriveMinutes(start: string, end: string, token: string): Promise<number> {
  const url =
    `${ONEMAP_BASE}/api/public/routingsvc/route` +
    `?start=${start}&end=${end}&routeType=drive`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive routing failed: ${res.status}`);

  const data = await res.json() as { route_summary?: { total_time: number; total_distance: number } };
  if (!data.route_summary) throw new Error('Drive routing returned no summary');

  return Math.round(data.route_summary.total_time / 60);
}

// --- Public transport routing ---

async function getPublicTransportMinutes(start: string, end: string, token: string): Promise<number> {
  const now = new Date();
  const date = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const url =
    `${ONEMAP_BASE}/api/public/routingsvc/route` +
    `?start=${start}&end=${end}&routeType=pt&date=${date}&time=${time}&mode=transit`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`PT routing failed: ${res.status}`);

  const data = await res.json() as {
    plan?: { itineraries: Array<{ duration: number }> };
  };

  if (!data.plan?.itineraries?.length) throw new Error('PT routing returned no itineraries');

  const fastestSeconds = Math.min(...data.plan.itineraries.map((i) => i.duration));
  return Math.round(fastestSeconds / 60);
}

// --- Helpers ---

function fmtMins(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

// --- Exported tool ---

export const getTravelTime = tool({
  description:
    'Get estimated travel time between two Singapore locations by driving and by public transport (bus + MRT). Use when a client or agent asks about commute time, travel time, or how far one place is from another.',
  parameters: z.object({
    from: z
      .string()
      .describe(
        'Origin location: address, building name, MRT station, or Singapore postal code (e.g. "Tampines MRT", "Orchard Road", "307987")',
      ),
    to: z
      .string()
      .describe('Destination location: same format as from'),
  }),
  execute: async ({ from, to }) => {
    let token: string;
    try {
      token = getToken();
    } catch (err) {
      return { error: `OneMap authentication failed: ${String(err)}` };
    }

    let origin: Coordinates;
    let destination: Coordinates;
    try {
      [origin, destination] = await Promise.all([geocode(from, token), geocode(to, token)]);
    } catch (err) {
      return { error: `Geocoding failed: ${String(err)}` };
    }

    const startCoords = `${origin.lat},${origin.lon}`;
    const endCoords = `${destination.lat},${destination.lon}`;

    const [driveResult, ptResult] = await Promise.allSettled([
      getDriveMinutes(startCoords, endCoords, token),
      getPublicTransportMinutes(startCoords, endCoords, token),
    ]);

    return {
      from: { query: from, resolved: origin.resolved },
      to: { query: to, resolved: destination.resolved },
      travelTime: {
        byDriving:
          driveResult.status === 'fulfilled'
            ? { minutes: driveResult.value, formatted: fmtMins(driveResult.value) }
            : { error: driveResult.reason?.message ?? 'Drive routing unavailable' },
        byPublicTransport:
          ptResult.status === 'fulfilled'
            ? { minutes: ptResult.value, formatted: fmtMins(ptResult.value) }
            : { error: ptResult.reason?.message ?? 'PT routing unavailable' },
      },
    };
  },
});
