/**
 * threeScene.js
 * Builds a Three.js scene visualizing the Sun and a tracked solar panel.
 * Angle convention matches the backend physics model:
 *   azimuth  - degrees clockwise from North (0-360)
 *   elevation - degrees above the horizon (0-90)
 */

function angleToVector(azimuthDeg, elevationDeg, radius) {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  return new THREE.Vector3(
    radius * Math.cos(el) * Math.sin(az),
    radius * Math.sin(el),
    radius * Math.cos(el) * Math.cos(az)
  );
}

function lerpAngle(current, target, t) {
  // shortest-path angular interpolation (handles 0/360 wrap)
  let diff = ((target - current + 540) % 360) - 180;
  return current + diff * t;
}

function createSolarScene(canvas, opts = {}) {
  const compact = !!opts.compact;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(compact ? 9 : 11, compact ? 6 : 7, compact ? 9 : 11);
  camera.lookAt(0, 1.2, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // --- Lighting ---
  const ambient = new THREE.AmbientLight(0xfff3df, 0.55);
  scene.add(ambient);

  const sunLight = new THREE.DirectionalLight(0xffe8b0, 1.15);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -8;
  sunLight.shadow.camera.right = 8;
  sunLight.shadow.camera.top = 8;
  sunLight.shadow.camera.bottom = -8;
  scene.add(sunLight);
  scene.add(sunLight.target);

  // --- Ground ---
  const groundGeo = new THREE.CircleGeometry(9, 64);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xf0ede3, roughness: 1 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  if (!compact) {
    const ringGeo = new THREE.RingGeometry(4.4, 4.5, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd7d2c4, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    scene.add(ring);
  }

  // --- Sun ---
  const sunGeo = new THREE.SphereGeometry(0.55, 24, 24);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xf5b342 });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  scene.add(sunMesh);

  const sunGlowGeo = new THREE.SphereGeometry(0.85, 24, 24);
  const sunGlowMat = new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.35 });
  const sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
  sunMesh.add(sunGlow);

  // Sunlight ray (line from sun to panel)
  const rayMaterial = new THREE.LineBasicMaterial({ color: 0xf0b24a, transparent: true, opacity: 0.4 });
  const rayGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0)
  ]);
  const rayLine = new THREE.Line(rayGeometry, rayMaterial);
  scene.add(rayLine);

  // --- Mount + Panel group ---
  const mountGroup = new THREE.Group();
  scene.add(mountGroup);

  const poleGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.6, 12);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x9a9a92, roughness: 0.6 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 0.8;
  pole.castShadow = true;
  mountGroup.add(pole);

  const panelPivot = new THREE.Group();
  panelPivot.position.y = 1.6;
  mountGroup.add(panelPivot);

  const panelWidth = 2.2;
  const panelHeight = 1.3;
  const panelGeo = new THREE.BoxGeometry(panelWidth, panelHeight, 0.06);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x1c2b3a, roughness: 0.35, metalness: 0.2 });
  const panelMesh = new THREE.Mesh(panelGeo, panelMat);
  panelMesh.castShadow = true;
  panelMesh.receiveShadow = true;
  panelPivot.add(panelMesh);

  // Panel grid lines (visual cell divisions)
  const gridColor = 0x3c5068;
  const gridGroup = new THREE.Group();
  const cols = 4, rows = 3;
  for (let i = 1; i < cols; i++) {
    const x = -panelWidth / 2 + (panelWidth / cols) * i;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, -panelHeight / 2, 0.032),
      new THREE.Vector3(x, panelHeight / 2, 0.032)
    ]);
    gridGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: gridColor })));
  }
  for (let j = 1; j < rows; j++) {
    const y = -panelHeight / 2 + (panelHeight / rows) * j;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-panelWidth / 2, y, 0.032),
      new THREE.Vector3(panelWidth / 2, y, 0.032)
    ]);
    gridGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: gridColor })));
  }
  panelPivot.add(gridGroup);

  // Frame edges
  const edges = new THREE.EdgesGeometry(panelGeo);
  const frame = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x0c141d }));
  panelPivot.add(frame);

  // --- State ---
  const state = {
    sunAz: 90,
    sunEl: 5,
    panelAz: 180,
    panelEl: 45,
    targetPanelAz: 180,
    targetPanelEl: 45
  };

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth || 300;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight || 200;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function setSun(azimuthDeg, elevationDeg) {
    state.sunAz = azimuthDeg;
    state.sunEl = elevationDeg;
  }

  function setPanelTarget(azimuthDeg, elevationDeg) {
    state.targetPanelAz = azimuthDeg;
    state.targetPanelEl = elevationDeg;
  }

  function updateFrame() {
    // Smoothly interpolate panel toward target (never teleports)
    state.panelAz = lerpAngle(state.panelAz, state.targetPanelAz, 0.06);
    state.panelEl += (state.targetPanelEl - state.panelEl) * 0.06;

    const sunPos = angleToVector(state.sunAz, Math.max(state.sunEl, -6), 7.5);
    sunPos.y += 1.4;
    sunMesh.position.copy(sunPos);
    sunLight.position.copy(sunPos);
    sunLight.target.position.set(0, 1.4, 0);

    const dayLight = Math.max(0.08, Math.sin(THREE.MathUtils.degToRad(Math.max(state.sunEl, 1))));
    sunLight.intensity = 0.5 + dayLight * 1.1;
    ambient.intensity = 0.35 + dayLight * 0.35;

    // Panel normal points toward panelAz/panelEl.
    // Panel default faces +Z, so rotate group: yaw by azimuth, pitch by elevation.
    panelPivot.rotation.set(0, 0, 0);
    panelPivot.rotation.y = THREE.MathUtils.degToRad(state.panelAz);
    panelPivot.rotateX(-THREE.MathUtils.degToRad(state.panelEl));

    // Sunray from sun to panel center
    const panelWorldPos = new THREE.Vector3();
    panelMesh.getWorldPosition(panelWorldPos);
    rayGeometry.setFromPoints([sunPos, panelWorldPos]);
    rayLine.visible = state.sunEl > 0;

    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    setSun,
    setPanelTarget,
    updateFrame,
    resize
  };
}
