// PUB MACHINE Control Room - Frontend Application
let currentRunId = null;
let runsMap = new Map();
let runCounter = 0;

// DOM Elements
const elConnectionStatus = document.getElementById('connection-status');
const elHeaderStatusPill = document.getElementById('header-status-pill');
const elHeaderStatusText = document.getElementById('header-status-text');
const elRunsList = document.getElementById('runs-list');
const elRunsCount = document.getElementById('runs-count');
const elDispatchForm = document.getElementById('dispatch-form');
const elBtnDispatch = document.getElementById('btn-dispatch');
const elBtnText = document.querySelector('.btn-text');
const elBtnLoading = document.querySelector('.btn-loading');
const elDispatchFeedback = document.getElementById('dispatch-feedback');
const elSelectScenario = document.getElementById('select-scenario');
const elInputNotes = document.getElementById('input-notes');

// Hero Bar
const elHeroProjectTitle = document.getElementById('hero-project-title');
const elHeroRunId = document.getElementById('hero-run-id');
const elHeroScenario = document.getElementById('hero-scenario');
const elHeroDuration = document.getElementById('hero-duration');
const elHeroStateVal = document.getElementById('hero-state-val');

// Flow
const elConversationFlow = document.getElementById('conversation-flow');

// Matrix
const elValSignal = document.getElementById('val-signal');
const elValAudience = document.getElementById('val-audience');
const elValIntent = document.getElementById('val-intent');
const elValScoring = document.getElementById('val-scoring');
const elValDecision = document.getElementById('val-decision');
const elValDetails = document.getElementById('val-details');

// Metrics
const elMetricSignals = document.getElementById('metric-signals');
const elMetricZones = document.getElementById('metric-zones');
const elMetricSegments = document.getElementById('metric-segments');
const elMetricIntents = document.getElementById('metric-intents');
const elMetricScore = document.getElementById('metric-score');
const elMetricAction = document.getElementById('metric-action');

// Deploy
const elDeployUrl = document.getElementById('deploy-url');
const elDeployBuild = document.getElementById('deploy-build');

const stateLabels = {
  'IDLE': 'AGUARDANDO',
  'INGESTING': 'INGERINDO SINAIS',
  'BUILDING_PROFILE': 'CONSTRUINDO PERFIL',
  'EVALUATING_INTENT': 'AVALIANDO INTENÇÃO',
  'SCORING': 'CALCULANDO SCORE',
  'DECIDING': 'TOMANDO DECISÃO',
  'COMPLETED': 'CONCLUÍDO',
  'FAILED': 'FALHOU'
};

const stateClasses = {
  'IDLE': 'idle',
  'INGESTING': 'running',
  'BUILDING_PROFILE': 'running',
  'EVALUATING_INTENT': 'running',
  'SCORING': 'running',
  'DECIDING': 'running',
  'COMPLETED': 'pass',
  'FAILED': 'fail'
};

function setHeaderState(state) {
  const label = stateLabels[state] || state;
  const cls = stateClasses[state] || 'idle';
  elHeaderStatusPill.className = `header-status-pill ${cls}`;
  elHeaderStatusText.textContent = label;
  elHeroStateVal.className = `state-pill ${cls}`;
  elHeroStateVal.textContent = label;
}

function setConnectionState(connected) {
  if (connected) {
    elConnectionStatus.className = 'status-indicator live';
    elConnectionStatus.querySelector('.status-text').textContent = 'CONECTADO';
  } else {
    elConnectionStatus.className = 'status-indicator disconnected';
    elConnectionStatus.querySelector('.status-text').textContent = 'DESCONECTADO';
  }
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateRunId() {
  return `run-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function getScenarioLabel(value) {
  const labels = {
    'sp-corretor': '🏢 Corretores SP',
    'rj-fintech': '💰 Fintech RJ',
    'bh-corporate': '🏢 Corporativo BH',
    'multi-zone': '🌐 Multi-Zona'
  };
  return labels[value] || value;
}

function createFlowStep(step, status, details = {}) {
  const stepDiv = document.createElement('div');
  stepDiv.className = `flow-step ${status}`;
  stepDiv.dataset.step = step.id;

  const iconMap = {
    'signal': '📡',
    'audience': '👥',
    'intent': '🎯',
    'scoring': '📊',
    'decision': '⚡'
  };

  const statusIcon = status === 'completed' ? '✅' : status === 'running' ? '⏳' : status === 'failed' ? '❌' : '⏸️';

  stepDiv.innerHTML = `
    <div class="step-header">
      <span class="step-icon">${iconMap[step.id] || '⚙️'}</span>
      <span class="step-title">${step.title}</span>
      <span class="step-status ${status}">${statusIcon} ${status.toUpperCase()}</span>
    </div>
    <div class="step-details">${details.html || ''}</div>
  `;
  return stepDiv;
}

async function updatePipelineFlow(runId, pipelineData) {
  const steps = [
    { id: 'signal', title: 'Camada 1: Signal Intelligence', endpoint: 'Ingestão de sinais físicos via geofence' },
    { id: 'audience', title: 'Camada 2: Audience Intelligence', endpoint: 'Agregação em perfil comportamental' },
    { id: 'intent', title: 'Camada 3: Intent Bridge → Lead Intent', endpoint: 'Conversão de sinais físicos em intenção comercial' },
    { id: 'scoring', title: 'Camada 4: Lead Scoring', endpoint: 'Pontuação multi-canal com decay temporal' },
    { id: 'decision', title: 'Camada 5: Decision & Dispatch', endpoint: 'Ação determinística com SLA e cooldown' }
  ];

  elConversationFlow.innerHTML = '';

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    let status = 'pending';
    let detailsHtml = '';

    if (pipelineData) {
      if (i === 0) {
        status = 'completed';
        detailsHtml = `<div class="detail-item"><strong>Sinais ingeridos:</strong> ${pipelineData.summary?.signalsIngested || 0}</div>
                       <div class="detail-item"><strong>Zonas visitadas:</strong> ${pipelineData.summary?.zonesVisited || 0}</div>`;
      } else if (i === 1) {
        status = 'completed';
        detailsHtml = `<div class="detail-item"><strong>Segmentos:</strong> ${pipelineData.summary?.audienceSegments || 0}</div>
                       <div class="detail-item"><strong>Perfil:</strong> ${pipelineData.pipeline?.profiles?.[0]?.subjectId || 'N/A'}</div>`;
      } else if (i === 2) {
        status = 'completed';
        detailsHtml = `<div class="detail-item"><strong>Sinais de intenção:</strong> ${pipelineData.summary?.intentSignals || 0}</div>
                       <div class="detail-item"><strong>Bridge signals:</strong> ${pipelineData.pipeline?.bridgeSignals?.length || 0}</div>`;
      } else if (i === 3) {
        status = 'completed';
        detailsHtml = `<div class="detail-item"><strong>Score final:</strong> ${pipelineData.summary?.leadScore || 0}</div>
                       <div class="detail-item"><strong>Breakdown:</strong> ${JSON.stringify(pipelineData.pipeline?.scores?.[0]?.breakdown || {})}</div>`;
      } else if (i === 4) {
        status = 'completed';
        detailsHtml = `<div class="detail-item"><strong>Ação:</strong> ${pipelineData.summary?.decisionAction || 'N/A'}</div>
                       <div class="detail-item"><strong>Prioridade:</strong> ${pipelineData.summary?.decisionPriority || 'N/A'}</div>
                       <div class="detail-item"><strong>Requer aprovação:</strong> ${pipelineData.pipeline?.decision?.requiresApproval ? 'SIM' : 'NÃO'}</div>`;
      }
    } else if (i === 0 && runId) {
      status = 'running';
    }

    const stepEl = createFlowStep(step, status, { html: detailsHtml });
    elConversationFlow.appendChild(stepEl);
  }

  // Update matrix pills
  if (pipelineData) {
    elValSignal.className = 'matrix-pill pass'; elValSignal.textContent = '✅ OK';
    elValAudience.className = 'matrix-pill pass'; elValAudience.textContent = '✅ OK';
    elValIntent.className = 'matrix-pill pass'; elValIntent.textContent = '✅ OK';
    elValScoring.className = 'matrix-pill pass'; elValScoring.textContent = '✅ OK';
    elValDecision.className = 'matrix-pill pass'; elValDecision.textContent = '✅ OK';
    elValDetails.textContent = `Pipeline executado com sucesso. ${pipelineData.summary?.signalsIngested} sinais → ${pipelineData.summary?.audienceSegments} segmentos → ${pipelineData.summary?.intentSignals} intenções → Score ${pipelineData.summary?.leadScore} → ${pipelineData.summary?.decisionAction}`;
  } else if (runId) {
    elValSignal.className = 'matrix-pill running'; elValSignal.textContent = '⏳ RODANDO';
    elValAudience.className = 'matrix-pill not-available'; elValAudience.textContent = 'AGUARDANDO';
    elValIntent.className = 'matrix-pill not-available'; elValIntent.textContent = 'AGUARDANDO';
    elValScoring.className = 'matrix-pill not-available'; elValScoring.textContent = 'AGUARDANDO';
    elValDecision.className = 'matrix-pill not-available'; elValDecision.textContent = 'AGUARDANDO';
  }

  // Update metrics
  if (pipelineData) {
    elMetricSignals.textContent = pipelineData.summary?.signalsIngested || 0;
    elMetricZones.textContent = pipelineData.summary?.zonesVisited || 0;
    elMetricSegments.textContent = pipelineData.summary?.audienceSegments || 0;
    elMetricIntents.textContent = pipelineData.summary?.intentSignals || 0;
    elMetricScore.textContent = pipelineData.summary?.leadScore || 0;
    elMetricAction.textContent = pipelineData.summary?.decisionAction || 'N/A';
  }

  // Update hero
  if (pipelineData) {
    elHeroProjectTitle.textContent = 'Pipeline Executado';
    elHeroRunId.textContent = runId;
    elHeroScenario.textContent = getScenarioLabel(elSelectScenario.value);
    elHeroDuration.textContent = formatDuration(pipelineData.summary?.duration || 0);
    setHeaderState('COMPLETED');
  }
}

async function addRunToList(runId, scenario, status, duration) {
  runCounter++;
  elRunsCount.textContent = runCounter;

  const emptyState = elRunsList.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const card = document.createElement('div');
  card.className = 'run-card';
  card.dataset.runId = runId;
  card.onclick = () => selectRun(runId);

  const statusClass = stateClasses[status] || 'idle';
  const statusLabel = stateLabels[status] || status;

  card.innerHTML = `
    <div class="run-card-header">
      <span class="run-card-id monospace">${escapeHtml(runId)}</span>
      <span class="state-pill ${statusClass}">${escapeHtml(statusLabel)}</span>
    </div>
    <div class="run-card-project">${escapeHtml(getScenarioLabel(scenario))}</div>
    <div class="run-card-meta">
      <span>⏱️ ${formatDuration(duration)}</span>
      <span>🕐 ${new Date().toLocaleTimeString('pt-BR')}</span>
    </div>
  `;

  elRunsList.insertBefore(card, elRunsList.firstChild);
}

function selectRun(runId) {
  document.querySelectorAll('.run-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`.run-card[data-run-id="${runId}"]`);
  if (card) card.classList.add('selected');
  currentRunId = runId;
}

async function runPipeline(scenario, notes) {
  const runId = generateRunId();
  const startTime = Date.now();

  setHeaderState('INGESTING');
  setConnectionState(true);
  elBtnDispatch.disabled = true;
  elBtnText.classList.add('hidden');
  elBtnLoading.classList.remove('hidden');
  elDispatchFeedback.className = 'dispatch-feedback hidden';

  // Simulate progressive execution for visual effect
  await updatePipelineFlow(runId, null);

  try {
    // Execute full pipeline via API
    const response = await fetch('/api/demo/full-pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        scenario,
        notes,
        signals: getScenarioSignals(scenario)
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    data.summary.duration = duration;

    await updatePipelineFlow(runId, data);
    addRunToList(runId, scenario, 'COMPLETED', duration);

    elDispatchFeedback.className = 'dispatch-feedback success';
    elDispatchFeedback.innerHTML = `✅ Pipeline executado com sucesso! Score: ${data.summary.leadScore} | Ação: ${data.summary.decisionAction}`;
    
    setTimeout(() => {
      elDispatchFeedback.className = 'dispatch-feedback hidden';
    }, 5000);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Pipeline error:', error);
    
    setHeaderState('FAILED');
    addRunToList(runId, scenario, 'FAILED', duration);
    
    elDispatchFeedback.className = 'dispatch-feedback error';
    elDispatchFeedback.innerHTML = `❌ Falha na execução: ${error.message}`;
  } finally {
    elBtnDispatch.disabled = false;
    elBtnText.classList.remove('hidden');
    elBtnLoading.classList.add('hidden');
  }
}

function getScenarioSignals(scenario) {
  const scenarios = {
    'sp-corretor': [
      { lat: -23.5505, lng: -46.6333, zoneId: 'sp-corretor-hub', dwellMinutes: 15 },
      { lat: -23.5510, lng: -46.6340, zoneId: 'sp-corretor-hub', dwellMinutes: 25 },
      { lat: -23.5508, lng: -46.6335, zoneId: 'sp-corretor-hub', dwellMinutes: 30 }
    ],
    'rj-fintech': [
      { lat: -22.9068, lng: -43.1729, zoneId: 'rj-fintech-district', dwellMinutes: 45 },
      { lat: -22.9072, lng: -43.1735, zoneId: 'rj-fintech-district', dwellMinutes: 60 }
    ],
    'bh-corporate': [
      { lat: -19.9167, lng: -43.9345, zoneId: 'bh-corporate-tower', dwellMinutes: 90 }
    ],
    'multi-zone': [
      { lat: -23.5505, lng: -46.6333, zoneId: 'sp-corretor-hub', dwellMinutes: 20 },
      { lat: -22.9068, lng: -43.1729, zoneId: 'rj-fintech-district', dwellMinutes: 40 },
      { lat: -19.9167, lng: -43.9345, zoneId: 'bh-corporate-tower', dwellMinutes: 60 }
    ]
  };
  return scenarios[scenario] || scenarios['sp-corretor'];
}

// Event listeners
elDispatchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const scenario = elSelectScenario.value;
  const notes = elInputNotes.value.trim();
  await runPipeline(scenario, notes);
});

// Initial health check
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      setConnectionState(true);
      const data = await res.json();
      elDeployUrl.textContent = window.location.origin;
      elDeployBuild.textContent = 'sucesso';
    } else {
      setConnectionState(false);
    }
  } catch {
    setConnectionState(false);
  }
}

// Initialize
checkHealth();
setHeaderState('IDLE');

// Set deploy URL
elDeployUrl.textContent = window.location.origin;