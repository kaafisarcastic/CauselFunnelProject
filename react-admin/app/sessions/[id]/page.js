import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';

async function fetchSessionEvents(sessionId) {
    if (!sessionId) return { data: [], error: null };
    const url = `${API_BASE_URL}/api/sessions?sessionId=${encodeURIComponent(sessionId)}`;
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) {
            const body = await res.text().catch(() => null);
            console.error('Failed to fetch session document', res.status, body);
            return { data: [], error: { status: res.status, message: `Failed to fetch session (${res.status})`, url } };
        }
        const payload = await res.json().catch(() => null);
        const doc = payload?.data || null;
        if (!doc) return { data: [], error: { message: 'No session data returned', url } };

        // Flatten events from devices map into a single array
        const devices = doc.devices || {};
        const events = [];
        for (const val of Object.values(devices)) {
            if (Array.isArray(val)) events.push(...val);
        }

        // normalize timestamps and sort by time ascending
        events.forEach(e => e.timestamp = e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString());
        events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return { data: events, error: null };
    } catch (err) {
        console.error('Fetch failed', err);
        return { data: [], error: { message: err?.message || String(err), url } };
    }
}

export default async function SessionDetail({ params }) {
    const resolvedParams = await params;
    const sessionId = resolvedParams?.id;
    const result = await fetchSessionEvents(sessionId);
    const events = Array.isArray(result.data) ? result.data : [];
    const fetchError = result.error;

    return (
        <main className="p-8 max-w-4xl mx-auto">
            <div className="mb-6 rounded-lg overflow-hidden shadow-md">
                <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 p-5 md:p-6 text-white">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold">Session Explorer</h2>
                            <h1 className="text-2xl md:text-3xl font-extrabold mt-1 tracking-tight">Session details & interaction timeline</h1>
                            <p className="text-sm text-white/90 mt-2">Quickly inspect user activity captured by the tracker.</p>
                        </div>
                        <div className="text-right text-sm">
                            <div className="text-white/90">Session</div>
                            <div className="font-mono mt-1 break-all text-white">{sessionId || '(no id)'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-6">
                <Link href="/" className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    Dashboard
                </Link>

                <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                        <span className="inline-block w-3 h-3 rounded-full bg-green-500 shadow-sm" />
                        click
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                        <span className="inline-block w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                        navigation
                    </div>
                </div>
            </div>

            {fetchError && (
                <div className="p-4 mb-6 bg-rose-50 border border-rose-100 rounded text-rose-700">
                    <div className="font-semibold">Unable to load events</div>
                    <div className="text-sm mt-1">{fetchError.message || 'An unexpected error occurred while loading events.'}</div>
                    {fetchError.url && <div className="text-xs mt-2 text-gray-500 break-all">Endpoint: {fetchError.url}</div>}
                    <div className="mt-3 flex gap-3">
                        <Link href="/" className="text-sm underline">Return to dashboard</Link>
                    </div>
                </div>
            )}

            {events.length === 0 ? (
                <div className="p-8 bg-white border border-gray-100 rounded shadow-sm text-gray-700">
                    <div className="text-lg font-medium mb-2">No interactions recorded</div>
                    <div className="text-sm text-gray-500">This session doesn't contain any captured events yet. Open the tracker demo at <span className="font-mono">http://localhost:8080/test.html</span>, interact with the page, then return and refresh.</div>
                </div>
            ) : (
                <div className="py-6 w-full">
                    <div className="flex flex-wrap gap-6 px-4">
                        {events.map((event, index) => {
                            const rowIndex = Math.floor(index / 3);
                            const snakeClass = rowIndex % 2 === 0 ? '-translate-y-6' : 'translate-y-6';
                            const inRowIndex = index % 3;
                            const isLastInRow = inRowIndex === 2 || index === events.length - 1;
                            const hasNext = index < events.length - 1;
                            return (
                                <div key={index} className={`relative w-full md:w-1/3 transition-transform ${snakeClass}`}>
                                    {/* Circle / index */}
                                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md"
                                         style={{ backgroundColor: event.event_type === 'click' ? '#16a34a' : '#3b82f6' }}>
                                        <span className="text-sm font-bold">{index + 1}</span>
                                    </div>

                                    <div className="mt-8 bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded ${event.event_type === 'click' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
                                                    {event.event_type}
                                                </span>
                                                <span className="text-xs text-gray-400">{new Date(event.timestamp).toLocaleString()}</span>
                                            </div>
                                            <div className="text-xs text-gray-500">#{index + 1}</div>
                                        </div>

                                        <div className="mt-3 text-sm text-gray-800">
                                            <div><span className="font-semibold">Page:</span> <span className="break-all">{event.url}</span></div>
                                            {event.event_type === 'click' && (
                                                <div className="mt-2 text-xs text-gray-500 font-mono">Coordinates: x:{event.position_x}, y:{event.position_y}</div>
                                            )}
                                            {event.selector && (
                                                <div className="mt-2 text-xs text-gray-600"><span className="font-semibold">Selector:</span> <span className="font-mono break-all">{event.selector}</span></div>
                                            )}
                                        </div>
                                    </div>

                                    {/* connectors inside the item container */}
                                    {hasNext && (
                                        inRowIndex !== 2 ? (
                                            <div className="hidden md:flex absolute top-1/2 right-[-56px] items-center transform -translate-y-1/2">
                                                <div className="h-0.5 bg-gray-300 w-24" />
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 ml-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M7.293 14.707a1 1 0 001.414 0L13 10.414a1 1 0 000-1.414L8.707 4.293a1 1 0 10-1.414 1.414L10.586 9l-3.293 3.293a1 1 0 000 1.414z" />
                                                </svg>
                                            </div>
                                        ) : (
                                            <div className="hidden md:flex absolute bottom-[-40px] left-1/2 transform -translate-x-1/2 items-center">
                                                <div className="w-0.5 h-10 bg-gray-300" />
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mt-2" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M7.293 4.293a1 1 0 011.414-1.414L13 7.586a1 1 0 010 1.414l-4.293 4.293a1 1 0 01-1.414-1.414L10.586 9 7.293 5.707z" />
                                                </svg>
                                            </div>
                                        )
                                    )}

                                </div>
                            );
                        })}
                    </div>
                </div>
             )}
        </main>
    );
}