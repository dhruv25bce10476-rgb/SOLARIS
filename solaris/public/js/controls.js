/**
 * controls.js
 * Wires up all interactive simulator controls to the REST API.
 */

const SolarisControls = (() => {
  function setActiveSegment(group, value, attr) {
    group.querySelectorAll('.solaris-segment').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset[attr] === String(value));
    });
  }

  function initButtons() {
    const btnStart = document.getElementById('btnStart');
    const btnPause = document.getElementById('btnPause');
    const btnReset = document.getElementById('btnReset');

    btnStart?.addEventListener('click', async () => {
      try {
        await SolarisAPI.start();
        SolarisSim.poll();
      } catch (err) {
        console.error(err);
      }
    });

    btnPause?.addEventListener('click', async () => {
      try {
        await SolarisAPI.pause();
        SolarisSim.poll();
      } catch (err) {
        console.error(err);
      }
    });

    btnReset?.addEventListener('click', async () => {
      try {
        await SolarisAPI.reset();
        SolarisSim.poll();
      } catch (err) {
        console.error(err);
      }
    });
  }

  function initSpeedControl() {
    const group = document.getElementById('speedControl');
    if (!group) return;
    group.querySelectorAll('.solaris-segment').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const speed = btn.dataset.speed;
        setActiveSegment(group, speed, 'speed');
        try {
          await SolarisAPI.setSpeed(Number(speed));
        } catch (err) {
          console.error(err);
        }
      });
    });
  }

  function initModeControl() {
    const group = document.getElementById('modeControl');
    const manualControls = document.getElementById('manualControls');
    if (!group) return;
    group.querySelectorAll('.solaris-segment').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const mode = btn.dataset.mode;
        setActiveSegment(group, mode, 'mode');
        if (manualControls) manualControls.hidden = mode !== 'manual';
        try {
          await SolarisAPI.setTrackingMode(mode);
        } catch (err) {
          console.error(err);
        }
      });
    });
  }

  function initManualSliders() {
    const az = document.getElementById('manualAzimuth');
    const el = document.getElementById('manualElevation');
    const azValue = document.getElementById('manualAzimuthValue');
    const elValue = document.getElementById('manualElevationValue');
    if (!az || !el) return;

    async function pushOrientation() {
      azValue.textContent = `${az.value}°`;
      elValue.textContent = `${el.value}°`;
      try {
        await SolarisAPI.setPanelOrientation(Number(az.value), Number(el.value));
      } catch (err) {
        console.error(err);
      }
    }

    az.addEventListener('input', pushOrientation);
    el.addEventListener('input', pushOrientation);
  }

  function initNav() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    toggle?.addEventListener('click', () => {
      const isOpen = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    links?.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => links.classList.remove('is-open'))
    );
  }

  function init() {
    initButtons();
    initSpeedControl();
    initModeControl();
    initManualSliders();
    initNav();
  }

  return { init };
})();
