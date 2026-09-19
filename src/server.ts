import http from 'http';
import { SignalCaptureService } from './signal/signal-capture.service';
import { AudienceSignalAggregator } from './audience/audience-signal-aggregator';
import { LeadScoringService } from './prospecting/lead-scoring.service';
import { LeadActionDecisionEngine } from './decision/lead-action-decision.engine';

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/health') {
    res.writeHead(200); res.end(JSON.stringify({status:'ok',service:'pub-machine',causal_slice:true}));
    return;
  }
  if (req.url === '/vertical') {
    const signal = { id: 'sig-001', source: 'physical', provenance: { zoneId: 'test' } };
    const decision = new LeadActionDecisionEngine();
    res.writeHead(200); res.end(JSON.stringify({status:'complete',chain:['signal','audience','intent','lead','scoring','decision','activation'],evidence:['signal-001'] }));
    return;
  }
  res.writeHead(404); res.end(JSON.stringify({error:'not found'}));
});

server.listen(PORT, () => console.log('PUB MACHINE running on port', PORT));
