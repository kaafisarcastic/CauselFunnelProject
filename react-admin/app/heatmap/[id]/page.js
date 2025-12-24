import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';

async function fetchSessionDoc(sessionId) {
  if (!sessionId) return { doc: null, raw: null, error: null };
  const url = `${API_BASE_URL}/api/sessions?sessionId=${encodeURIComponent(sessionId)}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      const body = await res.text().catch(() => null);
      return { doc: null, raw: body, error: { status: res.status, body, url } };
    }
    const payload = await res.json().catch(() => null);
    return { doc: payload?.data || null, raw: payload || null, error: null };
  } catch (err) {
    return { doc: null, raw: null, error: { message: err?.message || String(err), url } };
  }
}

export default async function HeatmapPage({ params }) {
  const resolvedParams = await params;
  const sessionId = resolvedParams?.id;
  const { doc, error } = await fetchSessionDoc(sessionId);

  if (error) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <div className="mb-6 rounded-lg overflow-hidden shadow-md p-4 bg-rose-50 border border-rose-100">
          <h2 className="text-lg font-semibold">Heatmap</h2>
          <p className="text-sm mt-2 text-rose-700">Unable to load session: {error.message || error.status}</p>
          <p className="text-xs mt-1 text-gray-500 break-all">Endpoint: {error.url}</p>
          <div className="mt-4"><Link href="/" className="underline text-sm">Return to dashboard</Link></div>
        </div>
      </main>
    );
  }

  if (!doc) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <div className="p-6 bg-white border rounded shadow-sm">
          <h2 className="text-lg font-semibold">Heatmap</h2>
          <p className="text-sm text-gray-600 mt-2">No session found for <span className="font-mono">{sessionId}</span></p>
          <div className="mt-3 text-xs text-gray-500">Raw API response (for debugging):</div>
          <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 overflow-auto">{JSON.stringify((await fetchSessionDoc(sessionId)).raw, null, 2)}</pre>
          <div className="mt-4"><Link href="/" className="underline text-sm">Return to dashboard</Link></div>
        </div>
      </main>
    );
  }

  // Flatten events from devices
  const devices = doc.devices || {};
  const events = [];
  for (const [device, arr] of Object.entries(devices)) {
    if (Array.isArray(arr)) {
      for (const e of arr) {
        events.push({ ...e, device });
      }
    }
  }

  // Compute simple intensity by counting duplicate coords (rounded)
  const buckets = {};
  for (const ev of events) {
    const key = `${Math.round((ev.rel_x ?? ev.x ?? 0) * 1000)}/${Math.round((ev.rel_y ?? ev.y ?? 0) * 1000)}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }

  // Render
  return (
    <main className="p-8 max-w-6xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Heatmap for session</h1>
            <div className="text-sm text-gray-600 mt-1 font-mono">{doc.sessionId || doc._id}</div>
            <div className="text-xs text-gray-500">Events: {events.length} • Recorded: {new Date(doc.startTime).toLocaleString()}</div>
          </div>
          <div className="flex gap-3">
            <Link href={`/sessions/${doc.sessionId || doc._id}`} className="px-3 py-1 bg-white border rounded text-sm">View session</Link>
            <Link href="/" className="px-3 py-1 bg-white border rounded text-sm">Dashboard</Link>
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-6">
                <div className="p-4 bg-white border rounded">
          <h3 className="text-lg font-semibold mb-2">Legend & details</h3>
          <div className="mb-3 text-sm text-gray-700">Dots show click locations. Larger/brighter dots indicate multiple clicks in the same area.</div>
          <div className="mb-4">
            <div className="text-xs text-gray-500">Devices present:</div>
            <div className="mt-2 text-sm">{Object.keys(devices).length ? Object.keys(devices).join(', ') : 'unknown'}</div>
          </div>

          <div className="mb-4">
            <div className="text-xs text-gray-500">Total events</div>
            <div className="font-medium mt-1">{events.length}</div>
          </div>
        </div>

        
        <div>
          <h2 className="text-2xl font-semibold mb-4">Click heatmap</h2>
          <div className="relative bg-gray-100 border rounded overflow-hidden w-full" style={{ height: '75vh', maxHeight: 1000 }}>
            <img src="/image.png" alt="page snapshot" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />

            {/* overlay dots (bigger for visibility) */}
            {events.map((ev, idx) => {
              let left = null;
              let top = null;
              if (typeof ev.rel_x === 'number' && typeof ev.rel_y === 'number') {
                left = `${Math.max(0, Math.min(100, Math.round(ev.rel_x * 10000) / 100))}%`;
                top = `${Math.max(0, Math.min(100, Math.round(ev.rel_y * 10000) / 100))}%`;
              } else if (typeof ev.x === 'number' && typeof ev.y === 'number' && typeof ev.doc_w === 'number' && typeof ev.doc_h === 'number') {
                left = `${Math.max(0, Math.min(100, Math.round((ev.x / ev.doc_w) * 10000) / 100))}%`;
                top = `${Math.max(0, Math.min(100, Math.round((ev.y / ev.doc_h) * 10000) / 100))}%`;
              } else if (typeof ev.x === 'number' && typeof ev.y === 'number') {
                left = `${ev.x}px`;
                top = `${ev.y}px`;
              }

              const bucketKey = `${Math.round((ev.rel_x ?? ev.x ?? 0) * 1000)}/${Math.round((ev.rel_y ?? ev.y ?? 0) * 1000)}`;
              const intensity = Math.min(10, buckets[bucketKey] || 1);
              const size = 22 + intensity * 8; // larger px
              const opacity = Math.min(0.95, 0.12 + intensity * 0.1);

              return (
                <span
                  key={`${idx}-${ev.timestamp}`}
                  title={`${ev.event_type} ${ev.device} ${new Date(ev.timestamp).toLocaleString()}`}
                  style={{ position: 'absolute', left, top, transform: 'translate(-50%, -50%)', width: size, height: size, borderRadius: '999px', background: `radial-gradient(circle at 30% 30%, rgba(255,80,80,${opacity}), rgba(220,38,38,${opacity * 0.9}))`, boxShadow: `0 10px 30px rgba(220,38,38,${opacity})`, opacity: 0.95 }}
                />
              );
            })}
          </div>
        </div>


      </section>
    </main>
  );
}
