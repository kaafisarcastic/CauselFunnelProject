'use client';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function Home() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/sessions');
      setSessions(res.data.data || res.data || []);
    } catch (err) {
      console.error('API Error:', err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const filtered = useMemo(() => {
    if (!query) return sessions;
    const q = query.toLowerCase();
    return sessions.filter((s) => (s._id || '').toLowerCase().includes(q) || String(s.eventCount).includes(q));
  }, [sessions, query]);

  const totalEvents = useMemo(() => sessions.reduce((sum, s) => sum + (Number(s.eventCount) || 0), 0), [sessions]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Copied:', text);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const eventBadgeClass = (count) => {
    if (count >= 50) return 'bg-rose-100 text-rose-700 ring-rose-200';
    if (count >= 20) return 'bg-amber-100 text-amber-800 ring-amber-200';
    return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
  };

  return (
    <main className="p-6 md:p-8 max-w-6xl mx-auto">
      <header className="rounded-lg overflow-hidden shadow-[0_8px_30px_rgba(17,24,39,0.06)] mb-6">
        <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">User Sessions </h1>
              <p className="text-sm md:text-base text-purple-100/90 mt-1">Explore sessions and events with a clean, responsive interface.</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center bg-white/10 border border-white/20 rounded-md overflow-hidden">
                <input
                  className="px-3 py-2 w-56 md:w-72 outline-none bg-transparent placeholder-white/80 text-white text-sm"
                  placeholder="Search by session ID or event count..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button className="px-3 text-sm text-white/80 hover:text-white" onClick={() => setQuery('')}>Clear</button>
              </div>

              <button
                onClick={fetchSessions}
                className="bg-white/12 hover:bg-white/20 text-white px-3 py-2 rounded-md text-sm shadow-sm ring-1 ring-white/10"
              >
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-white">
            <div className="bg-white/12 p-3 rounded-lg backdrop-blur-sm border border-white/10 flex flex-col">
              <div className="text-xs uppercase tracking-wider text-white/80">Active Sessions</div>
              <div className="mt-1 text-2xl font-bold">{sessions.length}</div>
              <div className="text-xs text-white/80 mt-1">Recent captures from the tracker</div>
            </div>

            <div className="bg-white/12 p-3 rounded-lg backdrop-blur-sm border border-white/10 flex flex-col">
              <div className="text-xs uppercase tracking-wider text-white/80">Total Events Recorded</div>
              <div className="mt-1 text-2xl font-bold">{totalEvents}</div>
              <div className="text-xs text-white/80 mt-1">Sum across all sessions</div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gradient-to-r from-gray-50 to-white">
              <tr>
                <th className="p-4 border-b font-semibold text-gray-600">ID</th>
                <th className="p-4 border-b font-semibold text-gray-600">Time</th>
                <th className="p-4 border-b font-semibold text-gray-600">No of Event</th>
                <th className="p-4 border-b font-semibold text-gray-600">Device</th>
                <th className="p-4 border-b font-semibold text-gray-600">View</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <td className="p-4 border-b"><div className="h-4 bg-gray-200 rounded w-48" /></td>
                  <td className="p-4 border-b"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                  <td className="p-4 border-b"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                  <td className="p-4 border-b"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                </tr>
              ))}

              {!loading && filtered.map((session, idx) => (
                <tr key={session.sessionId || session._id} className={`transition transform hover:scale-[1.002] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="p-4 border-b text-sm font-mono text-indigo-600 flex items-center gap-3">
                    <span title={session.sessionId || session._id} className="truncate max-w-[22rem]">{session.sessionId || session._id}</span>
                    <button
                      onClick={() => copyToClipboard(session.sessionId || session._id)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md bg-gray-50 hover:bg-gray-100"
                    >
                      Copy
                    </button>
                  </td>
                  <td className="p-4 border-b text-gray-700" title={new Date(session.startTime).toLocaleString()}>
                    {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}
                  </td>
                  <td className="p-4 border-b">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ring-1 ${eventBadgeClass(session.eventCount)}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 01.293-.707l7-7a1 1 0 011.414 0l7 7A1 1 0 0118 11v6a1 1 0 01-1 1H3a1 1 0 01-1-1v-6z" /></svg>
                      <span>{session.eventCount}</span>
                    </span>
                  </td>
                  <td className="p-4 border-b text-sm text-gray-700">
                    {session.devices ? Object.keys(session.devices).join(', ') : (session.device || 'unknown')}
                  </td>
                  <td className="p-4 border-b">
                    <div className="flex items-center gap-2">
                      <Link href={`/sessions/${session.sessionId || session._id}`} className="inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-indigo-50 to-white px-3 py-1 rounded-md text-indigo-700 hover:underline">
                        View session
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor"><path d="M12.293 5.293a1 1 0 011.414 0L18 9.586a1 1 0 010 1.414l-4.293 4.293a1 1 0 01-1.414-1.414L14.586 11H4a1 1 0 110-2h10.586l-2.293-2.293a1 1 0 010-1.414z" /></svg>
                      </Link>
                      <Link href={`/heatmap/${session.sessionId || session._id}`} className="inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-white to-gray-50 px-3 py-1 rounded-md text-purple-700 hover:underline">
                        View heatmap
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-70" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3h14v4H3V3zm0 6h14v8H3v-8z" /></svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden">
          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={`sk-${i}`} className="p-4 border-b animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-40 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-28 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-12" />
            </div>
          ))}

          {!loading && filtered.map((session) => (
            <div key={session.sessionId || session._id} className="p-4 border-b flex justify-between items-start bg-white hover:shadow-sm transition">
              <div>
                <div className="text-sm font-mono text-indigo-600 break-words">{session.sessionId || session._id}</div>
                <div className="text-xs text-gray-500 mt-1">{formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}</div>
                <div className="text-xs text-gray-500 mt-1">Devices: {session.devices ? Object.keys(session.devices).join(', ') : (session.device || 'unknown')}</div>
                <div className="text-sm font-medium mt-2 inline-flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${eventBadgeClass(session.eventCount)} ring-1`}>{session.eventCount} events recorded</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => copyToClipboard(session.sessionId || session._id)} className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700">Copy</button>
                <div className="flex gap-2">
                  <Link href={`/sessions/${session.sessionId || session._id}`} className="text-xs text-indigo-600">View →</Link>
                  <Link href={`/heatmap/${session.sessionId || session._id}`} className="text-xs text-purple-600">Heatmap →</Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <div className="mx-auto mb-4 w-40 h-36">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full opacity-60">
                <path d="M3 7a4 4 0 014-4h10a4 4 0 014 4v6" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 15a4 4 0 01-4 4H7a4 4 0 01-4-4v-1" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 11l2 2 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="text-lg font-semibold">No sessions yet</div>
            <div className="text-sm text-gray-400 mt-2">Interact with the tracker (open {"tracker/test.html"} and click through the demo), then press Refresh to load new data.</div>
            <div className="mt-4">
              <button onClick={fetchSessions} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">Refresh</button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}