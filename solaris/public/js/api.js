/**
 * api.js
 * Thin wrapper around the SOLARIS REST API.
 */
const SolarisAPI = (() => {
  async function request(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Request failed');
    }
    return json.data;
  }

  return {
    getState: () => request('/api/simulation/state'),
    getResults: () => request('/api/simulation/results'),
    getConfig: () => request('/api/config'),

    start: () => request('/api/simulation/start', { method: 'POST' }),
    pause: () => request('/api/simulation/pause', { method: 'POST' }),
    reset: () => request('/api/simulation/reset', { method: 'POST' }),
    step: () => request('/api/simulation/step', { method: 'POST' }),

    setTrackingMode: (mode) =>
      request('/api/tracking/mode', { method: 'POST', body: JSON.stringify({ mode }) }),

    setPanelOrientation: (azimuth, elevation) =>
      request('/api/panel/orientation', {
        method: 'POST',
        body: JSON.stringify({ azimuth, elevation })
      }),

    setSpeed: (speed) =>
      request('/api/simulation/speed', { method: 'POST', body: JSON.stringify({ speed }) })
  };
})();
