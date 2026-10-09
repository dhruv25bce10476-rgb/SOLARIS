/**
 * charts.js
 * Minimal dependency-free line chart renderer drawn on an HTML canvas.
 * Used for the Irradiance / Power / Energy analytics panels.
 */

function createLineChart(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight || canvas.getAttribute('height') || 200;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { w, h };
  }

  /**
   * @param {Array<{label:string, color:string, values:number[]}>} series
   * @param {string[]} xLabels
   */
  function draw(series, xLabels) {
    const { w, h } = resize();
    ctx.clearRect(0, 0, w, h);

    const paddingLeft = 44;
    const paddingRight = 12;
    const paddingTop = 12;
    const paddingBottom = 24;
    const plotW = w - paddingLeft - paddingRight;
    const plotH = h - paddingTop - paddingBottom;

    const allValues = series.flatMap((s) => s.values);
    const maxVal = Math.max(1, ...allValues) * 1.1;
    const minVal = 0;

    // Grid lines
    ctx.strokeStyle = '#eceae4';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8b929b';
    ctx.font = '11px Inter, sans-serif';
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = paddingTop + (plotH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();
      const val = maxVal - (maxVal / gridLines) * i;
      ctx.fillText(Math.round(val).toString(), 4, y + 3);
    }

    if (!allValues.length || allValues.every((v) => v === 0)) {
      ctx.fillStyle = '#b7bcc2';
      ctx.fillText('Waiting for simulation data…', paddingLeft, paddingTop + plotH / 2);
      return;
    }

    const n = Math.max(...series.map((s) => s.values.length), 1);

    series.forEach((s) => {
      if (!s.values.length) return;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      s.values.forEach((v, i) => {
        const x = paddingLeft + (plotW * i) / Math.max(1, n - 1);
        const y = paddingTop + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // X-axis labels (first, middle, last)
    if (xLabels && xLabels.length) {
      ctx.fillStyle = '#8b929b';
      const first = xLabels[0];
      const last = xLabels[xLabels.length - 1];
      const mid = xLabels[Math.floor(xLabels.length / 2)];
      ctx.fillText(first, paddingLeft, h - 6);
      ctx.fillText(mid, paddingLeft + plotW / 2 - 12, h - 6);
      ctx.textAlign = 'right';
      ctx.fillText(last, w - paddingRight, h - 6);
      ctx.textAlign = 'left';
    }
  }

  window.addEventListener('resize', () => resize());

  return { draw };
}

/** Simple grouped bar chart for the "Energy Generated" comparison. */
function createBarChart(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight || canvas.getAttribute('height') || 180;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { w, h };
  }

  function draw(fixedWh, trackedWh) {
    const { w, h } = resize();
    ctx.clearRect(0, 0, w, h);

    const paddingLeft = 60;
    const paddingRight = 40;
    const paddingTop = 20;
    const paddingBottom = 30;
    const plotW = w - paddingLeft - paddingRight;
    const plotH = h - paddingTop - paddingBottom;
    const maxVal = Math.max(1, fixedWh, trackedWh) * 1.2;

    ctx.strokeStyle = '#eceae4';
    for (let i = 0; i <= 4; i++) {
      const y = paddingTop + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();
    }

    const barWidth = Math.min(90, plotW / 5);
    const gap = plotW / 3;

    function bar(x, value, color, label) {
      const barH = (value / maxVal) * plotH;
      ctx.fillStyle = color;
      ctx.fillRect(x, paddingTop + plotH - barH, barWidth, barH);
      ctx.fillStyle = '#15181c';
      ctx.font = '600 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${(value / 1000).toFixed(2)} kWh`, x + barWidth / 2, paddingTop + plotH - barH - 8);
      ctx.fillStyle = '#8b929b';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(label, x + barWidth / 2, h - 8);
    }

    bar(paddingLeft + gap * 0.5, fixedWh, '#c7cad0', 'Fixed');
    bar(paddingLeft + gap * 0.5 + gap + barWidth, trackedWh, '#e2952c', 'Tracking');
    ctx.textAlign = 'left';
  }

  window.addEventListener('resize', () => resize());

  return { draw };
}
