// SunCalc (BSD-2-Clause) calcola posizione e illuminazione della Luna nel browser.
import SunCalc from 'https://cdn.jsdelivr.net/npm/suncalc@1.9.0/+esm';

const R_MOON_KM = 1737.4;
const SYNODIC_MONTH = 29.530588853;
const $ = (id) => document.getElementById(id);
const canvas = $('moonCanvas');
const ctx = canvas.getContext('2d');
const status = $('status');
let lastDate = new Date();
const moonImageCache = new Map();
let lastMoon;

function pad(n) { return String(n).padStart(2, '0'); }
function localInputValue(date) { return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function deg(rad) { return rad * 180 / Math.PI; }
function clamp(x, low, high) { return Math.min(high, Math.max(low, x)); }
function fixed(x, digits = 2) { return Number(x).toLocaleString('it-IT', { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
function phaseName(phase) { return ['Luna nuova','Falce crescente','Primo quarto','Gibbosa crescente','Luna piena','Gibbosa calante','Ultimo quarto','Falce calante'][Math.floor(((phase * 360 + 22.5) % 360) / 45)]; }
function formatInZone(date, zone, options) { return new Intl.DateTimeFormat('it-IT', { timeZone: zone, ...options }).format(date); }

function getDate() {
  const value = $('dateTime').value;
  return value ? new Date(value) : new Date();
}

function nearestNasaFrame(index, phase, fraction) {
  // Stessa conversione usata da LunarDelight: fase 0…360° → frame NASA più vicino.
  const phaseDeg = phase * 360;
  const illuminationDegree = phaseDeg <= 180 ? fraction * 180 : 360 - fraction * 180;
  return index.reduce((best, frame) => Math.abs(frame.illumination_degree - illuminationDegree) < Math.abs(best.illumination_degree - illuminationDegree) ? frame : best);
}

function loadMoonImage(number) {
  if (!moonImageCache.has(number)) moonImageCache.set(number, new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Frame NASA ${number} non disponibile.`));
    image.src = `assets/nasa/moon.${String(number).padStart(3, '0')}.png`;
  }));
  return moonImageCache.get(number);
}

function sunPositionAngle(date, lat, lon, moon) {
  // Angolo del Sole rispetto alla Luna nel sistema alt-az locale (come la rotazione Skyfield).
  const sun = SunCalc.getPosition(date, lat, lon);
  const deltaAz = sun.azimuth - moon.azimuth;
  let angle = Math.atan2(Math.sin(deltaAz), Math.tan(sun.altitude) * Math.cos(moon.altitude) - Math.sin(moon.altitude) * Math.cos(deltaAz));
  angle = (deg(angle) + 360) % 360;
  return angle > 180 ? 360 - angle : angle;
}

function drawMoon(cx, cy, radius, image, positionAngle) {
  ctx.save();
  ctx.translate(cx, cy);
  // Pillow (usato dal Python) e Canvas hanno convenzioni visive opposte sull'asse Y.
  // Invertiamo il segno per ottenere la stessa rotazione di Image.rotate(...).
  ctx.rotate((90 - positionAngle) * Math.PI / 180);
  ctx.drawImage(image, -radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

function moonOnlyDataUrl() {
  const output = document.createElement('canvas');
  output.width = 1080; output.height = 1080;
  const out = output.getContext('2d');
  out.fillStyle = '#000'; out.fillRect(0, 0, output.width, output.height);
  out.translate(540, 540);
  out.rotate((90 - lastMoon.positionAngle) * Math.PI / 180);
  out.drawImage(lastMoon.image, -540, -540, 1080, 1080);
  return output.toDataURL('image/png');
}

function drawCard(data) {
  const { date, lat, lon, place, zone, moon, illum, image, positionAngle } = data;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const radius = 390; drawMoon(415, 450, radius, image, positionAngle);
  const phaseDegrees = (illum.phase * 360) % 360;
  const age = illum.phase * SYNODIC_MONTH;
  const toFull = ((.5 - illum.phase + 1) % 1) * SYNODIC_MONTH;
  const toNew = (1 - illum.phase) * SYNODIC_MONTH;
  const diameter = 2 * Math.atan(R_MOON_KM / moon.distance) * 180 / Math.PI * 60;
  const trend = illum.phase === 0 || illum.phase === .5 ? '—' : illum.phase < .5 ? 'Crescente' : 'Calante';
  const utcDate = new Intl.DateTimeFormat('sv-SE', { timeZone:'UTC', year:'numeric',month:'2-digit',day:'2-digit' }).format(date);
  const lines = [
    ['terminal • Moon', '#00aa46'], ['', '#00ff5a'],
    [`LOCATION   : lat=${lat.toFixed(4).padStart(8)}  lon=${lon.toFixed(4).padStart(8)}`, '#00ff5a'],
    `PLACE      : ${place}`, `DATE (IT)  : ${formatInZone(date, zone, {day:'2-digit',month:'2-digit',year:'numeric'})}`,
    `TIME (IT)  : ${formatInZone(date, zone, {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}  [${zone}]`,
    `TIME (UTC) : ${formatInZone(date, 'UTC', {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}  [${utcDate}]`, '',
    `DISTANCE   : ${fixed(moon.distance,0)} km`, `ANG_DIAM   : ${fixed(diameter)} arcmin`,
    `ILLUM      : ${fixed(illum.fraction * 100)} %`, `PHASE      : ${fixed(phaseDegrees)} deg  (${phaseName(illum.phase)})`,
    `TREND      : ${trend}`, `AGE        : ${fixed(age)} d   (since New Moon, est.)`,
    `TO_FULL    : ${fixed(toFull)} d   (est.)`, `TO_NEW     : ${fixed(toNew)} d   (est.)`,
    `ALTITUDE   : ${fixed(deg(moon.altitude))} deg`, `AZIMUTH    : ${fixed((deg(moon.azimuth)+180)%360)} deg`,
    `POS_ANGLE  : ${fixed(positionAngle)} deg`
  ];
  ctx.font = '25px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'; ctx.textBaseline = 'top';
  let y = 72; for (const row of lines) { const [text, color] = Array.isArray(row) ? row : [row, '#00ff5a']; ctx.fillStyle = color; ctx.fillText(text, 820, y); y += 39; }
  ctx.font = '22px ui-monospace, monospace'; ctx.fillStyle = '#00aa46'; ctx.textAlign = 'right'; ctx.fillText('B. Raucci', 1540, 848); ctx.textAlign = 'left';
}

async function generate() {
  const lat = Number($('lat').value), lon = Number($('lon').value);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) { status.textContent = 'Inserisci coordinate valide.'; return; }
  const date = getDate(); if (Number.isNaN(date.getTime())) { status.textContent = 'Inserisci una data valida.'; return; }
  const zone = $('timezone').value === 'local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : $('timezone').value;
  try {
    status.textContent = 'Caricamento del frame fotografico NASA…';
    const moon = SunCalc.getMoonPosition(date, lat, lon);
    const illum = SunCalc.getMoonIllumination(date);
    if (!Array.isArray(window.NASA_ILLUMINATION_INDEX)) throw new Error('Indice immagini NASA non trovato. Verifica assets/illumination.js.');
    const frame = nearestNasaFrame(window.NASA_ILLUMINATION_INDEX, illum.phase, illum.fraction);
    const image = await loadMoonImage(frame.img_num);
    const positionAngle = sunPositionAngle(date, lat, lon, moon);
    drawCard({date, lat, lon, place: $('place').value.trim() || 'Casa', zone, moon, illum, image, positionAngle});
    lastDate = date; lastMoon = { image, positionAngle };
    $('download').disabled = false; $('downloadMoon').disabled = false;
    status.textContent = `Frame NASA ${frame.img_num} · ${formatInZone(date, zone, {dateStyle:'medium', timeStyle:'medium'})}.`;
  } catch (error) {
    status.textContent = `Errore: ${error.message}`;
  }
}

$('now').addEventListener('click', () => { $('dateTime').value = localInputValue(new Date()); generate(); });
$('generate').addEventListener('click', generate);
$('locate').addEventListener('click', () => navigator.geolocation?.getCurrentPosition(
  ({coords}) => { $('lat').value = coords.latitude.toFixed(4); $('lon').value = coords.longitude.toFixed(4); status.textContent = 'Coordinate aggiornate dal dispositivo.'; generate(); },
  () => { status.textContent = 'Posizione non disponibile: verifica il permesso del browser.'; }, {enableHighAccuracy:true, timeout:10000}
));
$('download').addEventListener('click', () => { const a = document.createElement('a'); a.download = `moon_${lastDate.toISOString().replaceAll(':','-').slice(0,19)}.png`; a.href = canvas.toDataURL('image/png'); a.click(); });
$('downloadMoon').addEventListener('click', () => { if (!lastMoon) return; const a = document.createElement('a'); a.download = `moon_only_${lastDate.toISOString().replaceAll(':','-').slice(0,19)}.png`; a.href = moonOnlyDataUrl(); a.click(); });
$('dateTime').value = localInputValue(new Date()); generate();
