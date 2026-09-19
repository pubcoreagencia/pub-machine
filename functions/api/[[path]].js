// PUB MACHINE - Cloudflare Pages Functions API
// Plain JavaScript for Cloudflare Pages Functions compatibility

// Import the compiled types from dist (or use inline definitions for demo)
// For production, we'd use the built dist/ output. For now, we'll use inline implementations.

// In-memory stores for demo (in production use durable objects / D1 / KV)
class MemorySignalStore {
  constructor() {
    this.signals = [];
    this.subjectIndex = new Map();
  }

  async save(signal) {
    this.signals.push(signal);
    if (!this.subjectIndex.has(signal.subjectId)) {
      this.subjectIndex.set(signal.subjectId, []);
    }
    this.subjectIndex.get(signal.subjectId).push(signal);
  }

  async getBySubject(subjectId) {
    return this.subjectIndex.get(subjectId) || [];
  }

  async getAll() {
    return [...this.signals];
  }

  async clear() {
    this.signals = [];
    this.subjectIndex.clear();
  }
}

// Simple Haversine distance calculation
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Point in polygon (Ray casting)
function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > point.lat) !== (yj > point.lat))
      && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Check if point is in zone
function isPointInZone(point, zone) {
  if (zone.type === 'circle') {
    const distance = haversineDistance(point.lat, point.lng, zone.coordinates.lat, zone.coordinates.lng);
    return distance <= zone.radiusMeters;
  } else if (zone.type === 'polygon') {
    return pointInPolygon(point, zone.coordinates);
  }
  return false;
}

const signalStore = new MemorySignalStore();
const signals = [];

// Demo zones
const demoZones = [
  {
    zoneId: "sp-corretor-hub",
    name: "Hub Corretores SP",
    type: "circle",
    coordinates: { lat: -23.5505, lng: -46.6333 },
    radiusMeters: 200,
    metadata: { category: "business_hub", vertical: "real_estate" }
  },
  {
    zoneId: "rj-fintech-district",
    name: "Distrito Fintech RJ",
    type: "circle",
    coordinates: { lat: -22.9068, lng: -43.1729 },
    radiusMeters: 300,
    metadata: { category: "tech_hub", vertical: "fintech" }
  },
  {
    zoneId: "bh-corporate-tower",
    name: "Torre Corporativa BH",
    type: "circle",
    coordinates: { lat: -19.9167, lng: -43.9345 },
    radiusMeters: 150,
    metadata: { category: "corporate", vertical: "enterprise" }
  }
];

const demoConsent = {
  subjectId: "demo-user-001",
  granted: true,
  grantedAt: new Date().toISOString(),
  scope: ["geolocation", "presence", "profiling", "marketing"],
  version: "1.0"
};

// Simple signal ingestion
async function ingestSignal(signal, consent, zones) {
  if (!consent.granted) {
    return { accepted: false, reason: "CONSENT_DENIED" };
  }

  const matchingZones = zones.filter(z => isPointInZone(signal.coordinates, z));
  
  const enrichedSignal = {
    ...signal,
    matchedZones: matchingZones.map(z => z.zoneId),
    ingestedAt: new Date().toISOString()
  };

  signals.push(enrichedSignal);
  await signalStore.save(enrichedSignal);

  return {
    accepted: true,
    signalId: signal.signalId,
    matchedZones: matchingZones.map(z => z.zoneId),
    zoneCount: matchingZones.length
  };
}

// Build audience profile
async function buildAudienceProfile(subjectId, zones) {
  const subjectSignals = signals.filter(s => s.subjectId === subjectId);
  const zonesVisited = [...new Set(subjectSignals.flatMap(s => s.matchedZones || []))];
  
  const segments = [];
  for (const zoneId of zonesVisited) {
    const zone = zones.find(z => z.zoneId === zoneId);
    if (zone) {
      const zoneSignals = subjectSignals.filter(s => (s.matchedZones || []).includes(zoneId));
      const totalDwell = zoneSignals.reduce((sum, s) => sum + (s.metadata?.dwellMinutes || 0), 0);
      const avgDwell = zoneSignals.length > 0 ? totalDwell / zoneSignals.length : 0;
      const visits = zoneSignals.length;
      
      segments.push({
        zoneId,
        zoneName: zone.name,
        vertical: zone.metadata?.vertical,
        category: zone.metadata?.category,
        visits,
        totalDwellMinutes: totalDwell,
        avgDwellMinutes: avgDwell,
        affinity: Math.min(1.0, visits / 10 + avgDwell / 120),
        lastVisit: zoneSignals[zoneSignals.length - 1]?.timestamp
      });
    }
  }

  return {
    subjectId,
    segments,
    totalSignals: subjectSignals.length,
    zonesVisited: zonesVisited.length,
    lastActivity: subjectSignals[subjectSignals.length - 1]?.timestamp,
    builtAt: new Date().toISOString()
  };
}

// Intent Bridge - converts audience to intent signals
function evaluateIntentBridge(profile, zones) {
  const intentSignals = [];
  
  for (const segment of profile.segments) {
    // Only emit intent if there's empirical evidence (visits + dwell)
    if (segment.visits >= 2 && segment.totalDwellMinutes >= 30) {
      intentSignals.push({
        signalId: `intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        subjectId: profile.subjectId,
        zoneId: segment.zoneId,
        intentType: segment.vertical === 'enterprise' ? 'enterprise_evaluation' : 
                    segment.vertical === 'fintech' ? 'fintech_solutions' : 'business_services',
        strength: Math.min(1.0, segment.affinity * 1.2),
        evidence: {
          visits: segment.visits,
          totalDwellMinutes: segment.totalDwellMinutes,
          avgDwellMinutes: segment.avgDwellMinutes
        },
        timestamp: new Date().toISOString(),
        provenance: 'physical_presence'
      });
    }
  }
  
  return intentSignals;
}

// Physical Intent Adapter
function adaptPhysicalIntent(bridgeSignal, zone) {
  const intentMap = {
    'enterprise_evaluation': { baseScore: 45, halfLifeHours: 168 }, // 7 days
    'fintech_solutions': { baseScore: 55, halfLifeHours: 72 }, // 3 days
    'business_services': { baseScore: 35, halfLifeHours: 120 } // 5 days
  };
  
  const config = intentMap[bridgeSignal.intentType] || { baseScore: 30, halfLifeHours: 120 };
  const hoursSinceSignal = (Date.now() - new Date(bridgeSignal.timestamp).getTime()) / (1000 * 60 * 60);
  const decayFactor = Math.pow(0.5, hoursSinceSignal / config.halfLifeHours);
  const finalScore = Math.round(config.baseScore * bridgeSignal.strength * decayFactor * 100) / 100;
  
  return {
    leadSignalId: `lead-sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    subjectId: bridgeSignal.subjectId,
    leadId: `lead-${bridgeSignal.subjectId}`,
    intentType: bridgeSignal.intentType,
    score: finalScore,
    channel: 'physical',
    zoneId: bridgeSignal.zoneId,
    zoneName: zone?.name || bridgeSignal.zoneId,
    vertical: zone?.metadata?.vertical || 'unknown',
    category: zone?.metadata?.category || 'unknown',
    provenance: {
      bridgeSignalId: bridgeSignal.signalId,
      originalIntentType: bridgeSignal.intentType,
      evidence: bridgeSignal.evidence
    },
    timestamp: new Date().toISOString(),
    expiresAt: new Date(Date.now() + config.halfLifeHours * 2 * 60 * 60 * 1000).toISOString()
  };
}

// Lead Intent Signals Service (simplified)
const leadIntentSignalsStore = new Map();

async function ingestLeadIntent(signal) {
  const key = signal.leadId;
  if (!leadIntentSignalsStore.has(key)) {
    leadIntentSignalsStore.set(key, []);
  }
  leadIntentSignalsStore.get(key).push(signal);
  return signal;
}

async function getLeadSignals(leadId) {
  return leadIntentSignalsStore.get(leadId) || [];
}

// Lead Scoring
async function calculateLeadScore(leadId) {
  const signals = await getLeadSignals(leadId);
  
  if (signals.length === 0) {
    return { leadId, score: 0, breakdown: {}, calculatedAt: new Date().toISOString() };
  }
  
  // Multi-signal composition
  const physicalSignals = signals.filter(s => s.channel === 'physical');
  const digitalSignals = signals.filter(s => s.channel !== 'physical');
  
  let physicalScore = 0;
  let digitalScore = 0;
  
  for (const s of physicalSignals) {
    physicalScore += s.score;
  }
  for (const s of digitalSignals) {
    digitalScore += s.score;
  }
  
  // Physical signals weighted at 40%, digital at 60% (but we only have physical in demo)
  const finalScore = Math.min(100, Math.round(physicalScore * 0.4 + digitalScore * 0.6));
  
  const breakdown = {
    physical: { count: physicalSignals.length, total: physicalScore },
    digital: { count: digitalSignals.length, total: digitalScore },
    composition: 'physical_40_digital_60'
  };
  
  return {
    leadId,
    score: finalScore,
    breakdown,
    signalsCount: signals.length,
    calculatedAt: new Date().toISOString()
  };
}

// Decision & Dispatch
async function makeDecision(leadId) {
  const scoreResult = await calculateLeadScore(leadId);
  const score = scoreResult.score;
  
  // Determine action based on score
  let action, priority, channel, requiresApproval = false, slaHours = 24;
  
  if (score >= 80) {
    action = 'schedule_call';
    priority = 'P0';
    channel = 'phone';
    requiresApproval = true; // P0 never auto-executes in V0
    slaHours = 2;
  } else if (score >= 60) {
    action = 'send_email';
    priority = 'P1';
    channel = 'email';
    slaHours = 4;
  } else if (score >= 40) {
    action = 'nurture_sequence';
    priority = 'P2';
    channel = 'email';
    slaHours = 24;
  } else {
    action = 'monitor';
    priority = 'P3';
    channel = 'none';
    slaHours = 168;
  }
  
  return {
    decisionId: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    leadId,
    action,
    priority,
    channel,
    score,
    requiresApproval,
    slaHours,
    cooldownHours: 48,
    reasoning: `Score ${score} qualifies for ${action} (${priority})`,
    expiresAt: new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    audit: {
      scoreBreakdown: scoreResult.breakdown,
      signalCount: scoreResult.signalsCount
    }
  };
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Health check
    if (path === "/api/health") {
      return new Response(JSON.stringify({
        status: "ok",
        service: "pub-machine",
        version: "0.1.0",
        timestamp: new Date().toISOString(),
        pipeline: {
          signalCapture: "operational",
          audienceIntelligence: "operational",
          intentBridge: "operational",
          leadScoring: "operational",
          decisionDispatch: "operational"
        }
      }), { headers: corsHeaders });
    }

    // Pipeline status
    if (path === "/api/pipeline/status") {
      return new Response(JSON.stringify({
        layers: [
          { id: 1, name: "Signal Intelligence", status: "active", description: "Geofence engine, presence detection, LGPD governance" },
          { id: 2, name: "Audience Intelligence", status: "active", description: "Behavioral features, segmentation, intent bridge" },
          { id: 3, name: "Physical → Lead Intent", status: "active", description: "Cross-channel signal composition, decay, scoring" },
          { id: 4, name: "Lead Scoring & Prioritization", status: "active", description: "Multi-signal scoring, velocity, conversion forecast" },
          { id: 5, name: "Decision & Dispatch", status: "active", description: "Deterministic actions, SLA, cooldown, human handoff" }
        ],
        demoZones: demoZones.length,
        timestamp: new Date().toISOString()
      }), { headers: corsHeaders });
    }

    // Simulate signal ingestion
    if (path === "/api/demo/ingest-signal" && request.method === "POST") {
      const body = await request.json();
      const { lat, lng, zoneId, accuracy = 10, confidence = 0.95 } = body;

      const targetZone = demoZones.find(z => z.zoneId === zoneId) || demoZones[0];

      const signal = {
        signalId: `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        subjectId: demoConsent.subjectId,
        timestamp: new Date().toISOString(),
        coordinates: { lat, lng },
        accuracyMeters: accuracy,
        confidence,
        source: "mobile_sdk",
        metadata: { demo: true }
      };

      const result = await ingestSignal(signal, demoConsent, [targetZone]);

      return new Response(JSON.stringify({
        success: true,
        signalId: signal.signalId,
        result,
        zone: targetZone
      }), { headers: corsHeaders });
    }

    // Get audience profile
    if (path === "/api/demo/audience-profile") {
      const profile = await buildAudienceProfile(demoConsent.subjectId, demoZones);
      return new Response(JSON.stringify({
        success: true,
        profile
      }), { headers: corsHeaders });
    }

    // Get intent signals
    if (path === "/api/demo/intent-signals") {
      const profile = await buildAudienceProfile(demoConsent.subjectId, demoZones);
      const bridgeSignals = evaluateIntentBridge(profile, demoZones);
      const leadSignals = [];

      for (const bs of bridgeSignals) {
        const adapted = adaptPhysicalIntent(bs, demoZones[0]);
        if (adapted) {
          leadSignals.push(await ingestLeadIntent(adapted));
        }
      }

      return new Response(JSON.stringify({
        success: true,
        bridgeSignals,
        leadSignals
      }), { headers: corsHeaders });
    }

    // Get lead score
    if (path === "/api/demo/lead-score") {
      const profile = await buildAudienceProfile(demoConsent.subjectId, demoZones);
      const bridgeSignals = evaluateIntentBridge(profile, demoZones);

      for (const bs of bridgeSignals) {
        const adapted = adaptPhysicalIntent(bs, demoZones[0]);
        if (adapted) {
          await ingestLeadIntent(adapted);
        }
      }

      const leadId = `lead-${demoConsent.subjectId}`;
      const score = await calculateLeadScore(leadId);

      return new Response(JSON.stringify({
        success: true,
        leadId,
        score,
        breakdown: score.breakdown
      }), { headers: corsHeaders });
    }

    // Get decision
    if (path === "/api/demo/decision") {
      const profile = await buildAudienceProfile(demoConsent.subjectId, demoZones);
      const bridgeSignals = evaluateIntentBridge(profile, demoZones);

      for (const bs of bridgeSignals) {
        const adapted = adaptPhysicalIntent(bs, demoZones[0]);
        if (adapted) {
          await ingestLeadIntent(adapted);
        }
      }

      const leadId = `lead-${demoConsent.subjectId}`;
      const decision = await makeDecision(leadId);

      return new Response(JSON.stringify({
        success: true,
        leadId,
        decision
      }), { headers: corsHeaders });
    }

    // Full pipeline demo
    if (path === "/api/demo/full-pipeline" && request.method === "POST") {
      const body = await request.json();
      const scenarioSignals = body.signals || [
        { lat: -23.5505, lng: -46.6333, zoneId: "sp-corretor-hub", dwellMinutes: 15 },
        { lat: -23.5510, lng: -46.6340, zoneId: "sp-corretor-hub", dwellMinutes: 25 },
        { lat: -22.9068, lng: -43.1729, zoneId: "rj-fintech-district", dwellMinutes: 45 }
      ];

      const results = {
        signals: [],
        profiles: [],
        bridgeSignals: [],
        leadSignals: [],
        scores: [],
        decision: null
      };

      const startTime = Date.now();

      // Ingest signals
      for (const s of scenarioSignals) {
        const zone = demoZones.find(z => z.zoneId === s.zoneId) || demoZones[0];
        const signal = {
          signalId: `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          subjectId: demoConsent.subjectId,
          timestamp: new Date(Date.now() - s.dwellMinutes * 60 * 1000).toISOString(),
          coordinates: { lat: s.lat, lng: s.lng },
          accuracyMeters: 10,
          confidence: 0.95,
          source: "mobile_sdk",
          metadata: { demo: true, dwellMinutes: s.dwellMinutes }
        };
        const result = await ingestSignal(signal, demoConsent, [zone]);
        results.signals.push({ signal, result, zone });
      }

      // Build audience profile
      const profile = await buildAudienceProfile(demoConsent.subjectId, demoZones);
      results.profiles.push(profile);

      // Intent bridge
      const bridgeSignals = evaluateIntentBridge(profile, demoZones);
      results.bridgeSignals = bridgeSignals;

      // Physical intent adapter + lead intent
      for (const bs of bridgeSignals) {
        const adapted = adaptPhysicalIntent(bs, demoZones[0]);
        if (adapted) {
          const leadSignal = await ingestLeadIntent(adapted);
          results.leadSignals.push({ bridge: bs, adapted, leadSignal });
        }
      }

      // Lead scoring
      const leadId = `lead-${demoConsent.subjectId}`;
      const score = await calculateLeadScore(leadId);
      results.scores.push(score);

      // Decision
      const decision = await makeDecision(leadId);
      results.decision = decision;

      const duration = Date.now() - startTime;

      return new Response(JSON.stringify({
        success: true,
        pipeline: results,
        summary: {
          signalsIngested: results.signals.length,
          zonesVisited: [...new Set(scenarioSignals.map(s => s.zoneId))].length,
          audienceSegments: profile.segments.length,
          intentSignals: bridgeSignals.length,
          leadScore: score.score,
          decisionAction: decision?.action || "no_action",
          decisionPriority: decision?.priority || "none",
          duration
        }
      }), { headers: corsHeaders });
    }

    // List demo zones
    if (path === "/api/demo/zones") {
      return new Response(JSON.stringify({
        success: true,
        zones: demoZones
      }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error)
    }), { status: 500, headers: corsHeaders });
  }
}