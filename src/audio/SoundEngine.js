/**
 * Lightweight sound engine using Web Audio API
 * No sound files needed — all effects are synthesized
 */

let ctx = null;
let musicElement = null;
let muted = false;
let sfxVolume = 0.3;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

/**
 * Play a synthesized sound effect
 */
export function playSFX(type) {
  if (muted) return;
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();

    switch (type) {
      case 'shoot': _shoot(ac); break;
      case 'enemyShoot': _enemyShoot(ac); break;
      case 'hit': _hit(ac); break;
      case 'explode': _explode(ac); break;
      case 'thrust': _thrust(ac); break;
      case 'dock': _dock(ac); break;
      case 'alert': _alert(ac); break;
      case 'pickup': _pickup(ac); break;
      case 'powerDown': _powerDown(ac); break;
      case 'powerUp': _powerUp(ac); break;
    }
  } catch (e) { /* audio not available */ }
}

function _makeGain(ac, vol = sfxVolume) {
  const g = ac.createGain();
  g.gain.value = vol;
  g.connect(ac.destination);
  return g;
}

function _shoot(ac) {
  const osc = ac.createOscillator();
  const gain = _makeGain(ac, 0.15);
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
  osc.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.1);
}

function _enemyShoot(ac) {
  const osc = ac.createOscillator();
  const gain = _makeGain(ac, 0.1);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ac.currentTime + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
  osc.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.15);
}

function _hit(ac) {
  const osc = ac.createOscillator();
  const gain = _makeGain(ac, 0.2);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
  osc.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.2);
}

function _explode(ac) {
  // White noise burst
  const bufferSize = ac.sampleRate * 0.3;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const gain = _makeGain(ac, 0.25);
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1000, ac.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, ac.currentTime + 0.3);
  noise.connect(filter);
  filter.connect(gain);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
  noise.start(ac.currentTime);
  noise.stop(ac.currentTime + 0.3);
}

function _thrust(ac) {
  // Low rumble
  const osc = ac.createOscillator();
  const gain = _makeGain(ac, 0.05);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(60, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
  osc.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.08);
}

function _dock(ac) {
  // Pleasant chime
  const osc = ac.createOscillator();
  const gain = _makeGain(ac, 0.15);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, ac.currentTime);       // C5
  osc.frequency.setValueAtTime(659, ac.currentTime + 0.1); // E5
  osc.frequency.setValueAtTime(784, ac.currentTime + 0.2); // G5
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
  osc.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.4);
}

function _alert(ac) {
  // Two-tone alarm
  const osc = ac.createOscillator();
  const gain = _makeGain(ac, 0.15);
  osc.type = 'square';
  osc.frequency.setValueAtTime(800, ac.currentTime);
  osc.frequency.setValueAtTime(600, ac.currentTime + 0.15);
  osc.frequency.setValueAtTime(800, ac.currentTime + 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.45);
  osc.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.45);
}

function _pickup(ac) {
  const osc = ac.createOscillator();
  const gain = _makeGain(ac, 0.1);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, ac.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
  osc.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.15);
}

function _powerDown(ac) {
  const osc = ac.createOscillator();
  const gain = _makeGain(ac, 0.2);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.5);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
  osc.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.5);
}

function _powerUp(ac) {
  const osc = ac.createOscillator();
  const gain = _makeGain(ac, 0.2);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(60, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
  osc.connect(gain);
  osc.start(ac.currentTime);
  osc.stop(ac.currentTime + 0.5);
}

/**
 * Start background music
 */
export function startMusic(src = 'sounds/background.mp3') {
  if (musicElement) return;
  musicElement = new Audio(src);
  musicElement.loop = true;
  musicElement.volume = 0.15;
  musicElement.play().catch(() => {
    // Autoplay blocked — will start on first user interaction
    const resume = () => {
      musicElement.play().catch(() => {});
      document.removeEventListener('click', resume);
      document.removeEventListener('keydown', resume);
    };
    document.addEventListener('click', resume);
    document.addEventListener('keydown', resume);
  });
}

export function toggleMute() {
  muted = !muted;
  if (musicElement) musicElement.muted = muted;
  return muted;
}

export function setMusicVolume(v) {
  if (musicElement) musicElement.volume = Math.max(0, Math.min(1, v));
}

export function setSFXVolume(v) {
  sfxVolume = Math.max(0, Math.min(1, v));
}
