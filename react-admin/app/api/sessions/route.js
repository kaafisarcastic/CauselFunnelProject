import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.DB_URI || process.env.MONGO_URL;
const MONGODB_DB = process.env.MONGODB_DB || process.env.MONGO_DB || process.env.DB_NAME || 'analytics';

if (!MONGODB_URI) {
  console.warn('MONGODB_URI not set in environment. API will fail until it is configured.');
}

let cachedClient = global._mongoClientPromise;
let cachedDb = global._mongoDB;

if (!cachedClient) {
  const client = new MongoClient(MONGODB_URI, {
    // useUnifiedTopology is default in modern drivers
  });
  cachedClient = client.connect();
  global._mongoClientPromise = cachedClient;
}

async function getDb() {
  if (cachedDb) return cachedDb;
  const client = await cachedClient;
  const db = client.db(MONGODB_DB);
  cachedDb = db;
  global._mongoDB = db;
  return db;
}

// Helper to validate incoming event objects
function normalizeEvents(input, defaultDevice = null) {
  // Accept an array of events or a single event
  const arr = Array.isArray(input) ? input : [input];
  return arr.map((e) => {
    const device = e.device || defaultDevice || null;
    const x = e.position_x ?? e.x ?? null;
    const y = e.position_y ?? e.y ?? null;
    return {
      event_type: e.event_type || e.type || 'click',
      position_x: x,
      position_y: y,
      rel_x: typeof e.rel_x === 'number' ? e.rel_x : (typeof x === 'number' && typeof e.doc_w === 'number' ? x / e.doc_w : e.rel_x),
      rel_y: typeof e.rel_y === 'number' ? e.rel_y : (typeof y === 'number' && typeof e.doc_h === 'number' ? y / e.doc_h : e.rel_y),
      selector: e.selector || null,
      device,
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
      meta: e.meta || null,
      x,
      y,
    };
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders() });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { sessionId, device, events, eventCount } = body || {};
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400, headers: corsHeaders() });

    const db = await getDb();
    const sessions = db.collection('sessions');

    const deviceKey = device || (Array.isArray(events) && events[0] && events[0].device) || 'unknown';
    const normalized = normalizeEvents(events || [], deviceKey);
    const now = new Date();

    // Upsert session and push events into devices.<deviceKey> array
    const result = await sessions.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: { sessionId, startTime: now },
        $set: { updatedAt: now },
        $push: { [`devices.${deviceKey}`]: { $each: normalized } },
        $inc: { eventCount: normalized.length }
      },
      { returnDocument: 'after', upsert: true }
    );

    return NextResponse.json({ ok: true, data: result.value }, { headers: corsHeaders() });
  } catch (err) {
    console.error('POST /api/sessions error', err);
    return NextResponse.json({ error: String(err) }, { status: 500, headers: corsHeaders() });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { sessionId, device, events } = body || {};
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400, headers: corsHeaders() });
    if (!events) return NextResponse.json({ error: 'events are required' }, { status: 400, headers: corsHeaders() });

    const db = await getDb();
    const sessions = db.collection('sessions');

    const deviceKey = device || (Array.isArray(events) && events[0] && events[0].device) || 'unknown';
    const normalized = normalizeEvents(events, deviceKey);
    const now = new Date();

    const result = await sessions.findOneAndUpdate(
      { sessionId },
      {
        $set: { updatedAt: now },
        $push: { [`devices.${deviceKey}`]: { $each: normalized } },
        $inc: { eventCount: normalized.length }
      },
      { returnDocument: 'after', upsert: true }
    );

    return NextResponse.json({ ok: true, data: result.value }, { headers: corsHeaders() });
  } catch (err) {
    console.error('PUT /api/sessions error', err);
    return NextResponse.json({ error: String(err) }, { status: 500, headers: corsHeaders() });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || searchParams.get('id');

    const db = await getDb();
    const sessions = db.collection('sessions');

    if (sessionId) {
      const doc = await sessions.findOne({ sessionId });
      if (!doc) return NextResponse.json({ error: 'session not found' }, { status: 404, headers: corsHeaders() });
      return NextResponse.json({ ok: true, data: doc }, { headers: corsHeaders() });
    }

    // No sessionId provided -> return list of sessions (support optional limit)
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit')) || 100));
    const cursor = sessions.find({}).sort({ updatedAt: -1 }).limit(limit);
    const docs = await cursor.toArray();
    return NextResponse.json({ ok: true, data: docs }, { headers: corsHeaders() });
  } catch (err) {
    console.error('GET /api/sessions error', err);
    return NextResponse.json({ error: String(err) }, { status: 500, headers: corsHeaders() });
  }
}
