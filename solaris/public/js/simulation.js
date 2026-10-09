/**
 * simulation.js
 * Polls the backend simulation state at a controlled interval and
 * updates telemetry, charts, and the Three.js scenes accordingly.
 * The Three.js render loop itself runs locally via requestAnimationFrame
 * for smooth motion between polls — no per-frame API calls are made.
 */

const SolarisSim = (() => {
  const POLL_INTERVAL_MS = 500;

  let heroScene = null;
  let mainScene = null;
  let irradianceChart = null;
  let powerChart = null;
  let energyChart = null;

  let pollHandle = null;
  let latestState = null;

  const el = (id) => document.getElementById(id);

  function fmtDeg(v) {
    return `${Number(v).toFixed(1)}°`;
  }
  function fmtWm2(v) {
    return `${Number(v).toFixed(0)} W/m²`;
  }
  function fmtW(v) {
    return `${Number(v).toFixed(1)} W`;
  }
  function fmtPct(v) {
    return `${Number(v).toFixed(1)}%`;
  }
  function fmtWh(v) {
    return `${(Number(v) / 1000).toFixed(3)} kWh`;
  }

  function initScenes() {
    const heroCanvas = el('heroCanvas');
    const mainCanvas = el('mainCanvas');
    if (heroCanvas) heroScene = createSolarScene(heroCanvas, { compact: true });
    if (mainCanvas) mainScene = createSolarScene(mainCanvas, { compact: false });

    function renderLoop() {
      if (heroScene) heroScene.updateFrame();
      if (mainScene) mainScene.updateFrame();
      requestAnimationFrame(renderLoop);
    }
    requestAnimationFrame(renderLoop);
  }

  function initCharts() {
    const irrCanvas = el('chartIrradiance');
    const powCanvas = el('chartPower');
    const enCanvas = el('chartEnergy');
    if (irrCanvas) irradianceChart = createLineChart(irrCanvas);
    if (powCanvas) powerChart = createLineChart(powCanvas);
    if (enCanvas) energyChart = createBarChart(enCanvas);
  }

  function updateStatusBadge(state) {
    const badge = el('simStatusBadge');
    const text = el('simStatusText');
    if (!badge || !text) return;

    badge.classList.remove('is-running', 'is-paused', 'is-optimal');

    if (state.dayComplete) {
      text.textContent = 'Day complete';
      badge.classList.add('is-paused');
    } else if (state.running) {
      if (state.mode === 'automatic' && state.trackerStatus === 'HOLDING') {
        text.textContent = 'OPTIMAL ORIENTATION';
        badge.classList.add('is-optimal');
      } else if (state.mode === 'automatic') {
        text.textContent = 'AUTO TRACKING';
        badge.classList.add('is-running');
      } else if (state.mode === 'fixed') {
        text.textContent = 'FIXED MODE';
        badge.classList.add('is-running');
      } else {
        text.textContent = 'MANUAL CONTROL';
        badge.classList.add('is-running');
      }
    } else {
      text.textContent = 'PAUSED';
      badge.classList.add('is-paused');
    }
  }

  function updateSunPath(state) {
    const dot = el('sunPathDot');
    const panelLine = el('panelPathLine');
    if (!dot) return;
    // Map elevation (0-90) and time progress (6-18h) onto a simple arc.
    const progress = Math.max(0, Math.min(1, (state.time - 6) / 12));
    const x = 10 + progress * 220;
    const elevFactor = Math.max(0, Math.sin(Math.PI * progress));
    const y = 105 - elevFactor * 95;
    dot.setAttribute('cx', x.toFixed(1));
    dot.setAttribute('cy', y.toFixed(1));

    if (panelLine) {
      const panelAngle = ((state.panel.elevation || 0) / 90) * 90;
      const rad = (panelAngle * Math.PI) / 180;
      const cx = x;
      const cy = y > 20 ? y - 20 : y + 20;
      panelLine.setAttribute('x1', cx.toFixed(1));
      panelLine.setAttribute('y1', y.toFixed(1));
      panelLine.setAttribute('x2', (cx + Math.sin(rad) * 14).toFixed(1));
      panelLine.setAttribute('y2', (y - Math.cos(rad) * 14).toFixed(1));
    }
  }

  function updateWhyMoving(state) {
    const box = el('whyMovingText');
    if (!box) return;
    if (!state.running && !state.dayComplete) {
      box.textContent = 'Press Start to begin the simulation.';
      return;
    }
    if (state.dayComplete) {
      box.textContent = 'Simulated day complete. Reset to run again.';
      return;
    }
    if (state.mode === 'fixed') {
      box.textContent = 'Fixed mode — panel orientation is locked.';
    } else if (state.mode === 'manual') {
      box.textContent = 'Manual mode — orientation is set by the sliders below.';
    } else {
      box.textContent = state.trackerMessage || 'Optimizing orientation…';
    }
  }

  function applyState(state) {
    latestState = state;

    // Toolbar
    if (el('simTimeLabel')) el('simTimeLabel').textContent = state.timeLabel;
    updateStatusBadge(state);
    updateWhyMoving(state);

    const progress = Math.max(0, Math.min(1, (state.time - 6) / 12));
    if (el('timeFill')) el('timeFill').style.width = `${(progress * 100).toFixed(1)}%`;

    // Telemetry — Sun
    if (el('sunAzimuth')) el('sunAzimuth').textContent = fmtDeg(state.sun.azimuth);
    if (el('sunElevation')) el('sunElevation').textContent = fmtDeg(state.sun.elevation);

    // Telemetry — Panel
    if (el('panelAzimuth')) el('panelAzimuth').textContent = fmtDeg(state.panel.azimuth);
    if (el('panelElevation')) el('panelElevation').textContent = fmtDeg(state.panel.elevation);

    // Telemetry — Performance
    if (el('metricIrradiance')) el('metricIrradiance').textContent = fmtWm2(state.irradiance);
    if (el('metricPower')) el('metricPower').textContent = fmtW(state.power);
    if (el('metricIncidence')) el('metricIncidence').textContent = fmtDeg(state.incidenceAngle);
    if (el('metricTrackingEfficiency')) el('metricTrackingEfficiency').textContent = fmtPct(state.trackingEfficiency);

    // Telemetry — Energy
    if (el('metricFixedEnergy')) el('metricFixedEnergy').textContent = fmtWh(state.fixedEnergyWh);
    if (el('metricTrackedEnergy')) el('metricTrackedEnergy').textContent = fmtWh(state.trackedEnergyWh);
    if (el('metricGain')) el('metricGain').textContent = `${state.energyGainPct >= 0 ? '+' : ''}${state.energyGainPct.toFixed(1)}%`;

    // Hero mini metrics
    if (el('heroIrradiance')) el('heroIrradiance').textContent = fmtWm2(state.irradiance);
    if (el('heroPower')) el('heroPower').textContent = fmtW(state.power);
    if (el('heroTrackingStatus')) {
      el('heroTrackingStatus').textContent = state.running ? 'Live' : 'Standby';
    }

    // Comparison section
    if (el('compareFixedValue')) el('compareFixedValue').textContent = fmtWh(state.fixedEnergyWh);
    if (el('compareTrackValue')) el('compareTrackValue').textContent = fmtWh(state.trackedEnergyWh);
    if (el('compareGainBadge')) {
      const gain = state.energyGainPct;
      el('compareGainBadge').textContent = `${gain >= 0 ? '+' : ''}${gain.toFixed(1)}% more energy`;
    }

    updateSunPath(state);

    // Scenes
    if (heroScene) {
      heroScene.setSun(state.sun.azimuth, state.sun.elevation);
      heroScene.setPanelTarget(state.panel.azimuth, state.panel.elevation);
    }
    if (mainScene) {
      mainScene.setSun(state.sun.azimuth, state.sun.elevation);
      mainScene.setPanelTarget(state.panel.azimuth, state.panel.elevation);
    }

    // Buttons enabled state
    if (el('btnStart')) el('btnStart').disabled = state.running;
    if (el('btnPause')) el('btnPause').disabled = !state.running;
  }

  function applyResults(results) {
    const history = results.history || [];
    const labels = history.map((h) => SolarisSim.formatTime(h.time));

    if (irradianceChart) {
      irradianceChart.draw(
        [
          { label: 'Fixed', color: '#c7cad0', values: history.map((h) => h.fixedIrradiance) },
          { label: 'Tracking', color: '#e2952c', values: history.map((h) => h.trackIrradiance) }
        ],
        labels
      );
    }
    if (powerChart) {
      powerChart.draw(
        [
          { label: 'Fixed', color: '#c7cad0', values: history.map((h) => h.fixedPower) },
          { label: 'Tracking', color: '#e2952c', values: history.map((h) => h.trackPower) }
        ],
        labels
      );
    }
    if (energyChart) {
      energyChart.draw(results.fixedEnergyWh, results.trackedEnergyWh);
    }
  }

  async function poll() {
    try {
      const state = await SolarisAPI.getState();
      applyState(state);
      const results = await SolarisAPI.getResults();
      applyResults(results);
    } catch (err) {
      console.error('SOLARIS polling error:', err);
    }
  }

  function startPolling() {
    if (pollHandle) return;
    poll();
    pollHandle = setInterval(poll, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollHandle) {
      clearInterval(pollHandle);
      pollHandle = null;
    }
  }

  function formatTime(hoursDecimal) {
    const h = Math.floor(hoursDecimal);
    const m = Math.floor((hoursDecimal - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return {
    initScenes,
    initCharts,
    startPolling,
    stopPolling,
    poll,
    formatTime,
    getLatestState: () => latestState
  };
})();
