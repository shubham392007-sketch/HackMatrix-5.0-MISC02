/**
 * GrowthLens Feature 4: Growth Intelligence & Manager Insights
 * Standalone Client Application
 */

const API_BASE = '/api/v1/feature4';

// State Management
const state = {
  currentTab: 'tab-narrative',
  learnerId: 'shubham_pokale',
  competencyId: 'C01',
  cycle: 'Q2-Q3 2026',
  teamId: 'Core Engineering',
  evidenceStore: {}, // keyed by evidence_id
  narrativeData: null,
  benchmarkData: null,
  confidenceData: null,
  heatmapData: null,
};

// Cycle Date Map
const CYCLE_DATES = {
  'Q2-Q3 2026': { start: '2026-05-01', end: '2026-09-30' },
  'Q2 2026': { start: '2026-04-01', end: '2026-06-30' },
  'Q3 2026': { start: '2026-07-01', end: '2026-09-30' },
  'All Time': { start: '2025-01-01', end: '2027-01-01' }
};

// DOM Initializer
document.addEventListener('DOMContentLoaded', async () => {
  initTabs();
  initFilterListeners();
  initDrawer();
  await loadLearnersAndTeams();
  fetchAllData();
});

async function loadLearnersAndTeams() {
  try {
    const [lRes, tRes] = await Promise.all([
      fetch(`${API_BASE}/learners`),
      fetch(`${API_BASE}/teams`)
    ]);
    if (lRes.ok) {
      const learners = await lRes.json();
      const select = document.getElementById('learnerSelect');
      if (select && learners.length > 0) {
        select.innerHTML = learners.map(l => 
          `<option value="${l.learner_id}" ${l.learner_id === state.learnerId ? 'selected' : ''}>${l.name} (${l.role})</option>`
        ).join('');
      }
    }
    if (tRes.ok) {
      const teams = await tRes.json();
      const teamSelect = document.getElementById('heatmapTeamSelect');
      if (teamSelect && teams.length > 0) {
        teamSelect.innerHTML = teams.map(t =>
          `<option value="${t.team_id}" ${t.team_id === state.teamId ? 'selected' : ''}>${t.team_name} (${t.member_count} members)</option>`
        ).join('');
      }
    }
  } catch (e) {
    console.warn('Could not load dynamic learners/teams:', e);
  }
}

// ── Tab Switching ───────────────────────────────────────────
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      document.getElementById(targetId)?.classList.add('active');
      state.currentTab = targetId;

      // Lazy refresh for specific tab if needed
      if (targetId === 'tab-confidence' && state.confidenceData) {
        renderConfidenceChart(state.confidenceData);
      }
    });
  });
}

// ── Filter Controls ─────────────────────────────────────────
function initFilterListeners() {
  const learnerSelect = document.getElementById('learnerSelect');
  const compSelect = document.getElementById('compSelect');
  const periodPreset = document.getElementById('periodPreset');
  const btnRefresh = document.getElementById('btnRefreshAll');
  const heatmapTeamSelect = document.getElementById('heatmapTeamSelect');

  learnerSelect.addEventListener('change', (e) => {
    state.learnerId = e.target.value;
    fetchAllData();
  });

  compSelect.addEventListener('change', (e) => {
    state.competencyId = e.target.value;
    fetchBenchmark();
    fetchConfidenceDecay();
  });

  periodPreset.addEventListener('change', (e) => {
    state.cycle = e.target.value;
    fetchNarrative();
    fetchBenchmark();
  });

  btnRefresh.addEventListener('click', () => {
    fetchAllData();
  });

  if (heatmapTeamSelect) {
    heatmapTeamSelect.addEventListener('change', (e) => {
      state.teamId = e.target.value;
      fetchHeatmap();
    });
  }
}

// ── Master Fetch ────────────────────────────────────────────
async function fetchAllData() {
  const spinner = document.getElementById('globalSpinner');
  if (spinner) spinner.style.display = 'inline-block';

  try {
    await Promise.all([
      fetchNarrative(),
      fetchBenchmark(),
      fetchConfidenceDecay(),
      fetchHeatmap(),
    ]);
  } catch (err) {
    console.error('Error fetching Feature 4 data:', err);
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}

// ── 8.3 Auto-Generated Growth Narrative ─────────────────────
async function fetchNarrative() {
  const loading = document.getElementById('narrativeLoading');
  const content = document.getElementById('narrativeContent');
  if (loading) loading.style.display = 'block';

  const dates = CYCLE_DATES[state.cycle] || CYCLE_DATES['Q2-Q3 2026'];
  const payload = {
    learner_id: state.learnerId,
    evaluation_period: {
      start_date: dates.start,
      end_date: dates.end,
      period_label: state.cycle
    }
  };

  try {
    const res = await fetch(`${API_BASE}/narrative`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    state.narrativeData = data;
    renderNarrative(data);
  } catch (e) {
    if (content) content.innerHTML = `<p class="text-danger">Failed to load narrative: ${e.message}</p>`;
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

function renderNarrative(data) {
  const content = document.getElementById('narrativeContent');
  const periodLabel = document.getElementById('narrativePeriodLabel');
  const accList = document.getElementById('keyAccomplishmentsList');
  const supList = document.getElementById('areasForSupportList');
  const topList = document.getElementById('suggestedTopicsList');
  const badgeCount = document.getElementById('evidenceCountBadge');
  const ledger = document.getElementById('evidenceList');

  const pLabel = data.evaluation_period.label || data.evaluation_period.period_label || 'Evaluation Period';
  if (periodLabel) periodLabel.textContent = `${pLabel} (${data.evaluation_period.start_date} to ${data.evaluation_period.end_date})`;

  // Store evidence in lookup map
  state.evidenceStore = {};
  let evidenceList = [];
  if (data.supporting_evidence) {
    if (Array.isArray(data.supporting_evidence)) {
      evidenceList = data.supporting_evidence;
    } else {
      evidenceList = Object.values(data.supporting_evidence);
    }
  } else if (data.evidence_sources) {
    evidenceList = data.evidence_sources;
  }

  evidenceList.forEach(ev => {
    state.evidenceStore[ev.evidence_id] = ev;
  });

  // Render markdown prose with interactive badges
  const rawNarrative = data.narrative || data.narrative_text || '';
  let html = renderSimpleMarkdown(rawNarrative);
  // Replace evidence brackets like [EV-0155, EV-0156] or [E001] with clickable badges
  html = html.replace(/\[((?:(?:EV-?\d+|E\d+)(?:,\s*)?)+)\]/gi, (match, p1) => {
    const ids = p1.split(/,\s*/);
    return ids.map(id => `<span class="evidence-badge" onclick="openEvidenceDrawer('${id.trim()}')">${id.trim()}</span>`).join(' ');
  });
  if (content) content.innerHTML = html;

  // Render Manager Briefing
  if (data.manager_briefing) {
    const mb = data.manager_briefing;
    const improvements = mb.key_improvements || mb.key_accomplishments || [];
    const stagnating = mb.stagnating_areas || mb.areas_for_support || [];
    const topics = mb.suggested_focus || mb.suggested_1on1_topics || [];

    if (accList) accList.innerHTML = improvements.map(it => `<li>${linkifyEvidence(it)}</li>`).join('');
    if (supList) supList.innerHTML = stagnating.map(it => `<li>${linkifyEvidence(it)}</li>`).join('');
    if (topList) topList.innerHTML = topics.map(it => `<li>${it}</li>`).join('');
  }

  // Render Evidence Ledger in Sidebar
  if (badgeCount) badgeCount.textContent = `${evidenceList.length} records`;
  if (ledger) {
    if (evidenceList.length === 0) {
      ledger.innerHTML = '<p class="text-dim">No evidence points logged for this period.</p>';
    } else {
      ledger.innerHTML = evidenceList.map(ev => `
        <div class="evidence-ledger-item" onclick="openEvidenceDrawer('${ev.evidence_id}')">
          <div class="evidence-item-header">
            <span class="evidence-item-tag">${ev.evidence_id} • ${ev.title || ev.competency_name || 'Evidence'}</span>
            <span class="evidence-item-score">${(ev.raw_score ?? ev.score ?? 0).toFixed(1)}</span>
          </div>
          <div class="evidence-item-snippet">${ev.timestamp} via ${ev.source_type || ev.source || 'telemetry'}</div>
        </div>
      `).join('');
    }
  }
}

function linkifyEvidence(text) {
  return text.replace(/\[((?:(?:EV-?\d+|E\d+)(?:,\s*)?)+)\]/gi, (match, p1) => {
    const ids = p1.split(/,\s*/);
    return ids.map(id => `<span class="evidence-badge" onclick="openEvidenceDrawer('${id.trim()}')">${id.trim()}</span>`).join(' ');
  });
}

function renderSimpleMarkdown(md) {
  if (!md) return '';
  let out = md;
  // Headers
  out = out.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  out = out.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  // Bold
  out = out.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  // Lists
  out = out.replace(/^\- (.*$)/gim, '<li>$1</li>');
  // Wrap list items
  out = out.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
  // Clean double ul tags
  out = out.replace(/<\/ul>\s*<ul>/gim, '');
  // Paragraphs
  const blocks = out.split('\n\n');
  return blocks.map(b => {
    if (b.startsWith('<h') || b.startsWith('<ul') || b.startsWith('<li')) return b;
    return `<p>${b}</p>`;
  }).join('');
}

// ── 8.4 Peer-Percentile Growth Benchmarking ─────────────────
async function fetchBenchmark() {
  const loading = document.getElementById('benchmarkLoading');
  const display = document.getElementById('benchmarkContent');
  const unavail = document.getElementById('benchmarkUnavailable');
  if (loading) loading.style.display = 'block';

  const dates = CYCLE_DATES[state.cycle] || CYCLE_DATES['Q2-Q3 2026'];
  const payload = {
    learner_id: state.learnerId,
    competency_id: state.competencyId,
    evaluation_period: {
      start_date: dates.start,
      end_date: dates.end
    }
  };

  try {
    const res = await fetch(`${API_BASE}/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    state.benchmarkData = data;
    renderBenchmark(data);
  } catch (e) {
    console.error('Benchmark fetch error:', e);
  } finally {
    if (loading) loading.style.display = 'none';
  }
}

function renderBenchmark(data) {
  const display = document.getElementById('benchmarkContent');
  const unavail = document.getElementById('benchmarkUnavailable');

  if (!data.available) {
    if (display) display.style.display = 'none';
    if (unavail) {
      unavail.style.display = 'block';
      const reasonEl = document.getElementById('benchmarkUnavailableReason');
      if (reasonEl) reasonEl.textContent = data.reason || 'Insufficient peer cohort size (minimum k required for privacy protection).';
    }
    return;
  }

  if (display) display.style.display = 'block';
  if (unavail) unavail.style.display = 'none';

  const pVal = document.getElementById('percentileVal');
  const pTag = document.getElementById('benchmarkTierTag');
  const pLevel = document.getElementById('cohortLevelPill');
  const pCohort = document.getElementById('cohortSizePill');
  const pMarker = document.getElementById('spectrumMarker');
  const pMarkerText = document.getElementById('spectrumMarkerText');
  const title = document.getElementById('benchmarkTitle');

  if (title) title.textContent = `${data.competency_name} Growth Velocity`;
  if (pVal) pVal.textContent = data.growth_percentile ?? '--';
  if (pTag) pTag.textContent = `${data.relative_tier ? data.relative_tier.toUpperCase() : 'TOP 20%'} growth rate relative to peers`;
  if (pLevel) pLevel.textContent = `Baseline: ${data.starting_level_group || 'Proficient'}`;
  if (pCohort) pCohort.textContent = `Cohort: ${data.cohort_size_bucket || '10–25 peers'}`;

  const pct = data.growth_percentile || 50;
  if (pMarker) {
    pMarker.style.left = `${Math.min(96, Math.max(4, pct))}%`;
  }
  if (pMarkerText) {
    pMarkerText.textContent = `${pct}%`;
  }
}

// ── 8.5 Evidence Staleness & Confidence Decay ───────────────
async function fetchConfidenceDecay() {
  try {
    const res = await fetch(`${API_BASE}/confidence-decay/${state.learnerId}/${state.competencyId}`);
    const data = await res.json();
    state.confidenceData = data;
    renderConfidenceDecay(data);
  } catch (e) {
    console.error('Confidence decay fetch error:', e);
  }
}

function renderConfidenceDecay(data) {
  // Meter & stats
  const meterBar = document.getElementById('meterBar');
  const meterDays = document.getElementById('meterDaysText');
  const meterPct = document.getElementById('meterPctText');
  const freshnessDot = document.getElementById('freshnessDot');
  const freshnessStateText = document.getElementById('freshnessStateText');

  const pct = data.freshness_percentage ?? 80;
  if (meterBar) meterBar.style.width = `${pct}%`;
  if (meterDays) meterDays.textContent = `${data.days_since_last_evidence} days since last evidence`;
  if (meterPct) meterPct.textContent = `${data.freshness_state} (${pct}%)`;

  if (freshnessStateText) freshnessStateText.textContent = `${data.freshness_state} (${pct}%)`;
  if (freshnessDot) {
    freshnessDot.className = 'freshness-dot ' + (
      data.freshness_state === 'Fresh' ? 'green' : data.freshness_state === 'Aging' ? 'amber' : 'red'
    );
  }

  // 4 Factors
  if (data.methodology?.features) {
    const f = data.methodology.features;
    document.getElementById('factorVolume').textContent = f.volume || '--';
    document.getElementById('factorDiversity').textContent = f.diversity || '--';
    document.getElementById('factorRecency').textContent = f.recency || '--';
    document.getElementById('factorStability').textContent = f.stability || '--';
  }

  // Render SVG Chart
  renderConfidenceChart(data);
}

function renderConfidenceChart(data) {
  const svg = document.getElementById('trajectorySvg');
  if (!svg || !data.timeline || data.timeline.length === 0) return;

  const points = data.timeline;
  const W = 760;
  const H = 320;
  const pad = { top: 30, right: 30, bottom: 40, left: 50 };

  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Scale ranges
  const minScore = 40.0;
  const maxScore = 100.0;
  const yScale = (score) => pad.top + plotH - ((score - minScore) / (maxScore - minScore)) * plotH;
  const xScale = (idx) => pad.left + (idx / Math.max(1, points.length - 1)) * plotW;

  // Build Uncertainty Band Path (Polygon Envelope)
  const upperCoords = points.map((p, i) => `${xScale(i)},${yScale(p.band_upper)}`);
  const lowerCoords = points.slice().reverse().map((p, i) => {
    const origIdx = points.length - 1 - i;
    return `${xScale(origIdx)},${yScale(p.band_lower)}`;
  });
  const envelopePath = `M ${upperCoords.join(' L ')} L ${lowerCoords.join(' L ')} Z`;

  // Observed vs Projected Line Segments
  const observedPts = points.filter(p => p.is_observed);
  const projectedPts = points.filter(p => !p.is_observed);

  // Line paths
  const obsCoords = observedPts.map((p, i) => `${xScale(i)},${yScale(p.score)}`);
  const obsPath = obsCoords.length ? `M ${obsCoords.join(' L ')}` : '';

  let projPath = '';
  if (projectedPts.length > 0) {
    const lastObsIdx = observedPts.length - 1;
    const startX = xScale(lastObsIdx);
    const startY = yScale(observedPts[lastObsIdx].score);
    const projCoords = projectedPts.map((p, i) => `${xScale(observedPts.length + i)},${yScale(p.score)}`);
    projPath = `M ${startX},${startY} L ${projCoords.join(' L ')}`;
  }

  // Grid lines
  let gridSvg = '';
  for (let s = minScore; s <= maxScore; s += 15) {
    const y = yScale(s);
    gridSvg += `
      <line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="#232d3f" stroke-dasharray="3,3" />
      <text x="${pad.left - 10}" y="${y + 4}" fill="#6b7280" font-size="11" text-anchor="end">${s}</text>
    `;
  }

  // X-axis timestamps
  let xLabelsSvg = '';
  points.forEach((p, i) => {
    const x = xScale(i);
    const label = p.timestamp.length > 5 ? p.timestamp.slice(5) : p.timestamp;
    xLabelsSvg += `<text x="${x}" y="${H - 12}" fill="#9ca3af" font-size="10" text-anchor="middle">${label}</text>`;
  });

  // Points (Circles)
  let dotsSvg = '';
  points.forEach((p, i) => {
    const cx = xScale(i);
    const cy = yScale(p.score);
    const fill = p.is_observed ? '#6366f1' : '#38bdf8';
    const stroke = p.is_observed ? '#fff' : '#38bdf8';
    dotsSvg += `
      <circle cx="${cx}" cy="${cy}" r="5" fill="${fill}" stroke="${stroke}" stroke-width="2">
        <title>${p.timestamp}: Score ${p.score} (Conf: ${(p.confidence * 100).toFixed(0)}%) - ${p.staleness_note}</title>
      </circle>
    `;
  });

  svg.innerHTML = `
    <!-- Background Grid -->
    ${gridSvg}
    ${xLabelsSvg}

    <!-- Uncertainty Envelope -->
    <path d="${envelopePath}" fill="rgba(99, 102, 241, 0.18)" stroke="rgba(99, 102, 241, 0.35)" stroke-width="1" />

    <!-- Trajectory Lines -->
    <path d="${obsPath}" fill="none" stroke="#6366f1" stroke-width="3" />
    <path d="${projPath}" fill="none" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="6,4" />

    <!-- Data Markers -->
    ${dotsSvg}
  `;
}

// ── 8.6 Manager Team Skill Heatmap ──────────────────────────
async function fetchHeatmap() {
  try {
    const res = await fetch(`${API_BASE}/team-heatmap?team_id=${encodeURIComponent(state.teamId)}`);
    const data = await res.json();
    state.heatmapData = data;
    renderHeatmap(data);
  } catch (e) {
    console.error('Heatmap fetch error:', e);
  }
}

function renderHeatmap(data) {
  const headerRow = document.getElementById('heatmapHeaderRow');
  const tbody = document.getElementById('heatmapBody');
  const tfoot = document.getElementById('heatmapFooter');
  const insightsGrid = document.getElementById('teamInsightsGrid');

  if (!data || !headerRow || !tbody) return;

  // Render Header
  headerRow.innerHTML = `
    <th class="sticky-col">Team Member</th>
    <th>Role</th>
    ${data.competencies.map(c => `<th>${c.competency_name}</th>`).join('')}
  `;

  // Render Member Rows
  tbody.innerHTML = data.matrix.map(mem => {
    return `
      <tr>
        <td class="sticky-col">
          <strong>${mem.display_name}</strong>
          <div class="heatmap-sub">${mem.employee_id}</div>
        </td>
        <td>${mem.role}</td>
        ${data.competencies.map(c => {
          const cell = mem.cells[c.competency_id] || {
            trend: 'insufficient_evidence',
            icon: '?',
            confidence: 0.0,
            freshness_state: 'Unknown'
          };
          const cls = `cell-${cell.trend}`;
          return `
            <td>
              <div class="heatmap-cell-content ${cls}" title="${c.competency_name}: ${cell.trend} (Conf: ${(cell.confidence * 100).toFixed(0)}%, Freshness: ${cell.freshness_state})">
                <span class="heatmap-icon">${cell.icon}</span>
                <span class="heatmap-sub">${cell.trend === 'insufficient_evidence' ? 'no data' : (cell.confidence * 100).toFixed(0) + '%'}</span>
              </div>
            </td>
          `;
        }).join('')}
      </tr>
    `;
  }).join('');

  // Render Footer Aggregates
  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="heatmap-footer-row">
        <td class="sticky-col">Dominant Trend</td>
        <td>Aggregated</td>
        ${data.competencies.map(c => {
          const agg = data.team_aggregates[c.competency_id];
          const icon = agg.dominant_trend === 'improving' ? '↑' : agg.dominant_trend === 'declining' ? '↓' : '→';
          const cls = `cell-${agg.dominant_trend}`;
          return `
            <td>
              <div class="heatmap-cell-content ${cls}">
                <span class="heatmap-icon">${icon}</span>
                <span class="heatmap-sub">${agg.dominant_trend}</span>
              </div>
            </td>
          `;
        }).join('')}
      </tr>
    `;
  }

  // Render Team Skill Insights Cards
  if (insightsGrid && data.team_insights) {
    insightsGrid.innerHTML = data.team_insights.map(ins => `
      <div class="insight-card ${ins.insight_type}">
        <div class="insight-header">
          <span class="insight-comp-title">${ins.competency_name}</span>
          <span class="insight-type-badge">${ins.insight_type.replace('_', ' ')}</span>
        </div>
        <p class="insight-summary">${ins.summary}</p>
        <div class="insight-action">
          <strong>Recommended Action:</strong> ${ins.actionable_suggestion}
        </div>
      </div>
    `).join('');
  }
}

// ── Evidence Drawer ─────────────────────────────────────────
function initDrawer() {
  const drawer = document.getElementById('evidenceDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const btnClose = document.getElementById('btnCloseDrawer');

  function close() {
    drawer?.classList.remove('open');
    backdrop?.classList.remove('active');
  }

  btnClose?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
}

function openEvidenceDrawer(evidenceId) {
  const drawer = document.getElementById('evidenceDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const drawerBody = document.getElementById('drawerBody');
  const drawerTitle = document.getElementById('drawerTitle');

  const ev = state.evidenceStore[evidenceId];
  if (!ev) {
    if (drawerBody) drawerBody.innerHTML = `<p class="text-danger">Evidence record [${evidenceId}] not found in current evaluation ledger.</p>`;
  } else {
    if (drawerTitle) drawerTitle.textContent = `Evidence Record: ${ev.evidence_id}`;
    if (drawerBody) {
      const score = (ev.raw_score ?? ev.score ?? 0).toFixed(1);
      const title = ev.title || ev.competency_name || 'Competency Milestone';
      const channel = ev.source_type || ev.source || 'telemetry';
      const detail = ev.detail || ev.source_detail || '';
      const snippet = ev.detail || ev.snippet || `Score ${score} recorded on ${ev.timestamp}`;

      drawerBody.innerHTML = `
        <div class="factor-row"><span>Milestone:</span><strong>${title}</strong></div>
        <div class="factor-row"><span>Timestamp:</span><strong>${ev.timestamp}</strong></div>
        <div class="factor-row"><span>Raw Score:</span><strong class="text-success">${score} / 100</strong></div>
        <div class="factor-row"><span>Source Channel:</span><strong>${channel}</strong></div>
        <div class="factor-row"><span>Source Detail:</span><strong>${detail}</strong></div>
        
        <div style="margin-top: 20px;">
          <h4 style="font-size: 0.85rem; margin-bottom: 6px; color: var(--text-muted);">Verified Context Snippet:</h4>
          <blockquote style="background: var(--bg-surface-elevated); border-left: 3px solid var(--accent); padding: 10px 14px; font-size: 0.82rem; border-radius: 4px; color: var(--text-main);">
            "${snippet}"
          </blockquote>
        </div>
      `;
    }
  }

  drawer?.classList.add('open');
  backdrop?.classList.add('active');
}
