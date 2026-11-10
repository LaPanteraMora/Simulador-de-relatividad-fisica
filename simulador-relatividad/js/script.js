'use strict';

/* ---------- Referencias al HTML ---------- */
const $ = id => document.getElementById(id);
const speed = $('speed'), time = $('time'), length = $('length');
const space = $('space'), chart = $('chart');

/* ---------- Estado ---------- */
let beta = 0.8;          // v/c
let gamma = 5 / 3;       // factor de Lorentz
let phase = 0;           // avance de la animación
let last = 0;            // marca de tiempo del cuadro anterior
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let running = !reducedMotion;

/* ---------- Física y resultados ---------- */
function calculate() {
  beta = Number(speed.value);
  const tau = Number(time.value);     // tiempo propio (nave)
  const L0 = Number(length.value);    // longitud propia

  gamma = 1 / Math.sqrt(1 - beta * beta);  // γ = 1/√(1 − v²/c²)
  const dt = tau * gamma;                  // Δt = γ·Δτ
  const L = L0 / gamma;                    // L = L₀/γ

  $('speedVal').textContent = beta.toFixed(2) + ' c';
  $('timeVal').textContent = tau + (tau === 1 ? ' año' : ' años');
  $('lengthVal').textContent = L0 + ' m';
  $('shipTime').textContent = tau.toFixed(2) + ' años';
  $('earthTime').textContent = dt.toFixed(2) + ' años';
  $('gamma').textContent = gamma.toFixed(3);
  $('contracted').textContent = L.toFixed(2) + ' m';

  $('explanation').textContent =
    `A ${Math.round(beta * 100)}% de la velocidad de la luz, por cada ${tau} años que pasan en la nave, ` +
    `la Tierra mide ${dt.toFixed(2)} años entre esos mismos eventos. ` +
    `La nave, que en reposo mide ${L0} m, mide ${L.toFixed(2)} m en el sistema terrestre.`;

  drawChart();
}

/* ---------- Canvas nítido en pantallas de alta densidad ---------- */
function prepare(c) {
  const rect = c.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(rect.width * dpr);
  c.height = Math.round(rect.height * dpr);
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}

/* ---------- Animación de la nave ---------- */
const stars = Array.from({ length: 75 }, (_, i) => ({
  x: ((i * 79 + 13) % 997) / 997,
  y: ((i * 137 + 47) % 991) / 991,
  r: i % 7 === 0 ? 1.6 : 0.8
}));

function drawSpace() {
  const { ctx, w, h } = prepare(space);
  ctx.fillStyle = '#0f2036';
  ctx.fillRect(0, 0, w, h);

  // Estrellas que se desplazan según la velocidad
  for (const s of stars) {
    const x = ((s.x * w - phase * beta * 0.22) % w + w) % w;
    ctx.fillStyle = 'rgba(230, 240, 255, .8)';
    ctx.beginPath();
    ctx.arc(x, s.y * h, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tierra
  ctx.fillStyle = '#4a90d0';
  ctx.beginPath();
  ctx.arc(45, h - 42, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4f7fb';
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillText('Tierra', 19, h - 10);

  // Nave (se estrecha horizontalmente al aumentar γ)
  const x = w * 0.57, y = h * 0.45, scale = 0.6 + 0.4 / gamma;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, 1);
  ctx.fillStyle = '#d6e2f0';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 0); ctx.lineTo(-36, -22); ctx.lineTo(-28, 0); ctx.lineTo(-36, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3cc3c0';                       // cabina
  ctx.beginPath();
  ctx.ellipse(10, -2, 19, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2b04f';                       // llama del motor
  ctx.beginPath();
  ctx.moveTo(-32, -8); ctx.lineTo(-32 - beta * 35, 0); ctx.lineTo(-32, 8);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#c8d8ea';
  ctx.fillText('Nave · ' + beta.toFixed(2) + ' c', Math.max(10, x - 55), y + 50);
  ctx.fillStyle = '#8ea5bf';
  ctx.fillText('Longitud contraída (ilustrativa)', 10, 22);
}

/* ---------- Gráfica γ vs v ---------- */
function drawChart() {
  const { ctx, w, h } = prepare(chart);
  const l = 46, r = 15, t = 15, b = 36, cw = w - l - r, ch = h - t - b;

  ctx.fillStyle = '#0f2036';
  ctx.fillRect(0, 0, w, h);
  ctx.font = '12px "Segoe UI", system-ui, sans-serif';

  // Rejilla y eje vertical (γ de 1 a 8)
  ctx.textAlign = 'right';
  ctx.lineWidth = 1;
  for (let y = 1; y <= 8; y++) {
    const py = t + ch - (y - 1) / 7 * ch;
    ctx.strokeStyle = '#27405c';
    ctx.beginPath(); ctx.moveTo(l, py); ctx.lineTo(w - r, py); ctx.stroke();
    ctx.fillStyle = '#b4c7dc';
    ctx.fillText(String(y), l - 8, py + 4);
  }

  // Eje horizontal (v/c)
  ctx.textAlign = 'center';
  for (let x = 0; x <= 1.0001; x += 0.2) {
    ctx.fillStyle = '#b4c7dc';
    ctx.fillText(x.toFixed(1) + 'c', l + x * cw, h - 12);
  }

  // Curva
  ctx.strokeStyle = '#4fd1cc';
  ctx.lineWidth = 3;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= 990; i++) {
    const v = i / 1000, g = 1 / Math.sqrt(1 - v * v);
    if (g > 8) break;
    const px = l + v * cw, py = t + ch - (g - 1) / 7 * ch;
    if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Punto de la velocidad elegida
  if (gamma <= 8) {
    const px = l + beta * cw, py = t + ch - (gamma - 1) / 7 * ch;
    const nearRight = px > w - 90;
    ctx.fillStyle = '#ffc66b';
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = nearRight ? 'right' : 'left';
    ctx.fillText('γ = ' + gamma.toFixed(2), px + (nearRight ? -10 : 10), Math.max(12, py - 10));
  }
}

/* ---------- Bucle de animación ---------- */
function frame(ts) {
  const dt = Math.min((ts - last) || 0, 50);
  last = ts;
  if (running) phase += dt * 0.065;
  drawSpace();
  requestAnimationFrame(frame);
}

/* ---------- Eventos ---------- */
[speed, time, length].forEach(el => el.addEventListener('input', calculate));

$('pause').addEventListener('click', () => {
  running = !running;
  $('pause').textContent = running ? 'Pausar' : 'Reanudar';
});

$('reset').addEventListener('click', () => {
  speed.value = 0.8; time.value = 10; length.value = 100;
  phase = 0;
  calculate();
});

window.addEventListener('resize', drawChart);

/* ---------- Inicio ---------- */
$('pause').textContent = running ? 'Pausar' : 'Reanudar';
calculate();
requestAnimationFrame(frame);
