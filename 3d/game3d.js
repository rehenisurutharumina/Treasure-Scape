// ============================================================
// TREASURE ESCAPE 3D — Main Game Logic (Three.js)
// Depends on world.js loaded before this file.
// ============================================================

// ==============================
// 1: DOM REFERENCES
// ==============================
const scoreEl         = document.getElementById('score');
const timerEl         = document.getElementById('timer');
const difficultyEl    = document.getElementById('difficulty');
const overlay         = document.getElementById('overlay');
const overlayEmoji    = document.getElementById('overlay-emoji');
const statusText      = document.getElementById('status-text');
const statusSub       = document.getElementById('status-sub');
const finalStats      = document.getElementById('final-stats');
const minimapCanvas   = document.getElementById('minimap');
const minimapCtx      = minimapCanvas.getContext('2d');
const startScreen     = document.getElementById('start-screen');
const playBtn         = document.getElementById('play-btn');
const pauseBtn        = document.getElementById('pause-btn');
const restartGameBtn  = document.getElementById('restart-game-btn');
const pauseScreen     = document.getElementById('pause-screen');
const resumeBtn       = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const restartBtn      = document.getElementById('restart-btn');
const hudEl           = document.getElementById('hud');
const gameButtonsEl   = document.getElementById('game-buttons');
const controlsHintEl  = document.getElementById('controls-hint');
const distIndicator   = document.getElementById('distance-indicator');
const treasureDistEl  = document.getElementById('treasure-distance');
const ghostDistEl     = document.getElementById('ghost-distance');
const healthBarFill   = document.getElementById('health-bar-fill');

// ==============================
// 2: GAME SETTINGS
// ==============================
const PLAYER_SPEED   = 0.12;
const SPRINT_SPEED   = 0.2;
const GHOST_BASE_SPD = 0.04;
const MAX_HEALTH     = 100;
const GHOST_DAMAGE   = 0.4;     // damage per frame when close
const HEALTH_REGEN   = 0.02;    // regen per frame when far
const BONUS_SCORE    = 500;

// ==============================
// 3: GAME STATE
// ==============================
let score = 0, time = 0, health = MAX_HEALTH;
let ghostSpeed = GHOST_BASE_SPD;
let gameOver = false, gamePaused = false, gameStarted = false;
let timerInterval = null, scoreInterval = null;
let cameraMode = 'third';  // 'third' or 'top'
let playerIsMoving = false;
const keys = {};

// ==============================
// 4: THREE.JS SETUP
// ==============================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 250);
camera.position.set(0, 12, 18);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ==============================
// 5: BUILD WORLD (from world.js)
// ==============================
buildWorld(scene);
const playerObj  = buildPlayer(scene);
const ghostObj   = buildGhost(scene);
const treasureObj = buildTreasure(scene);

const player  = playerObj.player;
const ghost   = ghostObj.ghost;
const treasure = treasureObj.treasure;

// ==============================
// 6: SOUND SYSTEM (optional files)
// ==============================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function playTone(freq, dur, type, vol) {
  try {
    if (!audioCtx) audioCtx = new AudioCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.value = vol || 0.15;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.stop(audioCtx.currentTime + dur);
  } catch(e) { /* audio not supported */ }
}

function playWinSound() {
  playTone(523, 0.15, 'square', 0.1);
  setTimeout(() => playTone(659, 0.15, 'square', 0.1), 150);
  setTimeout(() => playTone(784, 0.3, 'square', 0.12), 300);
}

function playLoseSound() {
  playTone(300, 0.3, 'sawtooth', 0.1);
  setTimeout(() => playTone(200, 0.5, 'sawtooth', 0.1), 300);
}

function playGhostNearSound() {
  playTone(80 + Math.random()*40, 0.4, 'sawtooth', 0.04);
}

let ghostSoundTimer = 0;

// ==============================
// 6B: BACKGROUND MUSIC ENGINE
// ==============================
// Procedural ambient fantasy music using oscillators.
// Creates a dark atmospheric drone + evolving melody.
// No audio files needed — runs entirely from Web Audio API.

let bgMusicPlaying = false;
let bgMusicNodes = [];    // all oscillators/gains to stop later
let bgMusicMaster = null; // master gain node
let melodyInterval = null;

function startBackgroundMusic() {
  try {
    if (bgMusicPlaying) return;
    if (!audioCtx) audioCtx = new AudioCtx();
    bgMusicPlaying = true;

    // Master volume control
    bgMusicMaster = audioCtx.createGain();
    bgMusicMaster.gain.value = 0.25;
    bgMusicMaster.connect(audioCtx.destination);

    // --- LAYER 1: Deep bass drone ---
    const bass = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bass.type = 'sine';
    bass.frequency.value = 55; // A1 — deep rumble
    bassGain.gain.value = 0.12;
    bass.connect(bassGain);
    bassGain.connect(bgMusicMaster);
    bass.start();
    bgMusicNodes.push(bass, bassGain);

    // Sub-bass LFO for movement
    const bassLfo = audioCtx.createOscillator();
    const bassLfoGain = audioCtx.createGain();
    bassLfo.type = 'sine';
    bassLfo.frequency.value = 0.15; // very slow wobble
    bassLfoGain.gain.value = 8;
    bassLfo.connect(bassLfoGain);
    bassLfoGain.connect(bass.frequency);
    bassLfo.start();
    bgMusicNodes.push(bassLfo, bassLfoGain);

    // --- LAYER 2: Atmospheric pad (eerie chord) ---
    const padNotes = [110, 164.81, 220]; // Am chord: A2, E3, A3
    padNotes.forEach((freq) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(bgMusicMaster);
      osc.start();
      bgMusicNodes.push(osc, gain);

      // Slow detune for haunting shimmer
      const lfo = audioCtx.createOscillator();
      const lfoG = audioCtx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.3 + Math.random() * 0.3;
      lfoG.gain.value = 2;
      lfo.connect(lfoG);
      lfoG.connect(osc.detune);
      lfo.start();
      bgMusicNodes.push(lfo, lfoG);
    });

    // --- LAYER 3: Ghost whisper (filtered noise-like texture) ---
    const whisper = audioCtx.createOscillator();
    const whisperGain = audioCtx.createGain();
    const whisperFilter = audioCtx.createBiquadFilter();
    whisper.type = 'sawtooth';
    whisper.frequency.value = 1200;
    whisperGain.gain.value = 0.015;
    whisperFilter.type = 'bandpass';
    whisperFilter.frequency.value = 800;
    whisperFilter.Q.value = 5;
    whisper.connect(whisperFilter);
    whisperFilter.connect(whisperGain);
    whisperGain.connect(bgMusicMaster);
    whisper.start();
    bgMusicNodes.push(whisper, whisperGain);

    // Sweep the whisper filter slowly
    const whisperLfo = audioCtx.createOscillator();
    const whisperLfoG = audioCtx.createGain();
    whisperLfo.type = 'sine';
    whisperLfo.frequency.value = 0.08;
    whisperLfoG.gain.value = 500;
    whisperLfo.connect(whisperLfoG);
    whisperLfoG.connect(whisperFilter.frequency);
    whisperLfo.start();
    bgMusicNodes.push(whisperLfo, whisperLfoG);

    // --- LAYER 4: Evolving melody (plays a random note every few seconds) ---
    // Minor pentatonic scale in A: A, C, D, E, G across octaves
    const melodyNotes = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];

    function playMelodyNote() {
      if (!bgMusicPlaying) return;
      const freq = melodyNotes[Math.floor(Math.random() * melodyNotes.length)];
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.value = 0.06;
      osc.connect(gain);
      gain.connect(bgMusicMaster);
      osc.start();
      // Fade out over 2 seconds
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.5);
      osc.stop(audioCtx.currentTime + 2.5);
    }

    // Play a melody note every 2-4 seconds
    melodyInterval = setInterval(() => {
      if (bgMusicPlaying) playMelodyNote();
    }, 2500);
    playMelodyNote(); // first note immediately

  } catch(e) { /* audio not supported, game continues silently */ }
}

function stopBackgroundMusic() {
  bgMusicPlaying = false;
  clearInterval(melodyInterval);
  melodyInterval = null;

  // Stop all active oscillators
  bgMusicNodes.forEach(node => {
    try {
      if (node.stop) node.stop();
      if (node.disconnect) node.disconnect();
    } catch(e) { /* already stopped */ }
  });
  bgMusicNodes = [];

  if (bgMusicMaster) {
    try { bgMusicMaster.disconnect(); } catch(e) {}
    bgMusicMaster = null;
  }
}

function pauseBackgroundMusic() {
  if (bgMusicMaster) {
    try { bgMusicMaster.gain.setValueAtTime(0, audioCtx.currentTime); } catch(e) {}
  }
}

function resumeBackgroundMusic() {
  if (bgMusicMaster) {
    try { bgMusicMaster.gain.setValueAtTime(0.25, audioCtx.currentTime); } catch(e) {}
  }
}

// ==============================
// 7: KEYBOARD INPUT
// ==============================
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  if ((e.key === 'p' || e.key === 'P') && gameStarted && !gameOver) togglePause();
  if ((e.key === 'c' || e.key === 'C') && gameStarted && !gameOver && !gamePaused) {
    cameraMode = cameraMode === 'third' ? 'top' : 'third';
  }
});
document.addEventListener('keyup', (e) => { keys[e.key] = false; });

// ==============================
// 8: PLAYER MOVEMENT
// ==============================
function movePlayer() {
  const prevX = player.position.x;
  const prevZ = player.position.z;
  const isSprinting = keys['Shift'];
  const spd = isSprinting ? SPRINT_SPEED : PLAYER_SPEED;

  if (keys['w']||keys['W']||keys['ArrowUp'])    player.position.z -= spd;
  if (keys['s']||keys['S']||keys['ArrowDown'])  player.position.z += spd;
  if (keys['a']||keys['A']||keys['ArrowLeft'])  player.position.x -= spd;
  if (keys['d']||keys['D']||keys['ArrowRight']) player.position.x += spd;

  // Boundary clamp
  player.position.x = Math.max(-WORLD_SIZE+1, Math.min(WORLD_SIZE-1, player.position.x));
  player.position.z = Math.max(-WORLD_SIZE+1, Math.min(WORLD_SIZE-1, player.position.z));

  // Tree collision
  for (const t of trees) {
    const d = Math.sqrt((player.position.x-t.x)**2 + (player.position.z-t.z)**2);
    if (d < t.radius) { player.position.x = prevX; player.position.z = prevZ; break; }
  }
  // Rock collision
  for (const r of rocks) {
    const d = Math.sqrt((player.position.x-r.x)**2 + (player.position.z-r.z)**2);
    if (d < r.radius) { player.position.x = prevX; player.position.z = prevZ; break; }
  }

  const movedX = player.position.x - prevX;
  const movedZ = player.position.z - prevZ;
  playerIsMoving = (Math.abs(movedX) > 0.001 || Math.abs(movedZ) > 0.001);
  if (playerIsMoving) {
    const targetRot = Math.atan2(movedX, movedZ);
    player.rotation.y += (targetRot - player.rotation.y) * 0.2; // smooth rotation
  }
}

// ==============================
// 9: GHOST AI
// ==============================
function moveGhost() {
  const dx = player.position.x - ghost.position.x;
  const dz = player.position.z - ghost.position.z;
  const dist = Math.sqrt(dx*dx + dz*dz);

  if (dist > 0.5) {
    ghost.position.x += (dx/dist) * ghostSpeed;
    ghost.position.z += (dz/dist) * ghostSpeed;
  }
  ghost.rotation.y = Math.atan2(dx, dz);
  ghost.position.y = Math.sin(Date.now()*0.003) * 0.4;

  // Ghost near sound
  if (dist < 10) {
    ghostSoundTimer++;
    if (ghostSoundTimer % 60 === 0) playGhostNearSound();
  }
}

// ==============================
// 10: HEALTH SYSTEM
// ==============================
function updateHealth() {
  const dx = player.position.x - ghost.position.x;
  const dz = player.position.z - ghost.position.z;
  const dist = Math.sqrt(dx*dx + dz*dz);

  if (dist < 3) {
    health -= GHOST_DAMAGE * (3 - dist); // more damage when closer
  } else {
    health = Math.min(MAX_HEALTH, health + HEALTH_REGEN);
  }
  health = Math.max(0, Math.min(MAX_HEALTH, health));

  const pct = (health / MAX_HEALTH) * 100;
  healthBarFill.style.width = pct + '%';

  // Color shift
  if (pct > 60) {
    healthBarFill.style.background = 'linear-gradient(90deg, #34d399, #22c55e)';
    healthBarFill.style.boxShadow = '0 0 8px rgba(52,211,153,0.4)';
  } else if (pct > 30) {
    healthBarFill.style.background = 'linear-gradient(90deg, #fb923c, #facc15)';
    healthBarFill.style.boxShadow = '0 0 8px rgba(251,146,60,0.4)';
  } else {
    healthBarFill.style.background = 'linear-gradient(90deg, #f43f5e, #ef4444)';
    healthBarFill.style.boxShadow = '0 0 8px rgba(244,63,94,0.5)';
  }

  if (health <= 0) endGame('lose');
}

// ==============================
// 11: COLLISION DETECTION
// ==============================
function checkCollisions() {
  const gDist = Math.sqrt(
    (player.position.x-ghost.position.x)**2 +
    (player.position.z-ghost.position.z)**2
  );
  if (gDist < 1.5) { endGame('lose'); return; }

  const tDist = Math.sqrt(
    (player.position.x-treasure.position.x)**2 +
    (player.position.z-treasure.position.z)**2
  );
  if (tDist < 2) { endGame('win'); return; }
}

// ==============================
// 12: CAMERA
// ==============================
let cameraShakeTime = 0;

function updateCamera() {
  if (cameraMode === 'third') {
    // Behind and above player, offset by facing direction
    const behindX = player.position.x - Math.sin(player.rotation.y) * 6;
    const behindZ = player.position.z - Math.cos(player.rotation.y) * 6;
    const targetX = behindX;
    const targetY = player.position.y + 8;
    const targetZ = behindZ + 8;

    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.position.z += (targetZ - camera.position.z) * 0.05;
  } else {
    // Top-down view
    camera.position.x += (player.position.x - camera.position.x) * 0.08;
    camera.position.y += (25 - camera.position.y) * 0.05;
    camera.position.z += (player.position.z + 2 - camera.position.z) * 0.08;
  }

  // Camera shake
  if (cameraShakeTime > 0) {
    camera.position.x += (Math.random()-0.5) * 0.3;
    camera.position.y += (Math.random()-0.5) * 0.2;
    cameraShakeTime--;
  }

  camera.lookAt(player.position.x, 1.5, player.position.z);
}

// ==============================
// 13: DISTANCE INDICATOR
// ==============================
function updateDistances() {
  const tDist = Math.sqrt(
    (player.position.x-treasure.position.x)**2 +
    (player.position.z-treasure.position.z)**2
  );
  const gDist = Math.sqrt(
    (player.position.x-ghost.position.x)**2 +
    (player.position.z-ghost.position.z)**2
  );
  treasureDistEl.textContent = Math.round(tDist);
  ghostDistEl.textContent = Math.round(gDist);
}

// ==============================
// 14: MINIMAP
// ==============================
function drawMinimap() {
  const w = minimapCanvas.width, h = minimapCanvas.height;
  const scale = w / (WORLD_SIZE * 2);

  minimapCtx.clearRect(0, 0, w, h);
  minimapCtx.fillStyle = 'rgba(0,20,0,0.7)';
  minimapCtx.fillRect(0, 0, w, h);
  minimapCtx.strokeStyle = 'rgba(255,255,255,0.15)';
  minimapCtx.strokeRect(0, 0, w, h);

  // Trees
  minimapCtx.fillStyle = '#1a5c1a';
  for (const t of trees) {
    minimapCtx.beginPath();
    minimapCtx.arc((t.x+WORLD_SIZE)*scale, (t.z+WORLD_SIZE)*scale, 2, 0, Math.PI*2);
    minimapCtx.fill();
  }

  // Treasure
  minimapCtx.fillStyle = '#facc15';
  minimapCtx.beginPath();
  minimapCtx.arc((treasure.position.x+WORLD_SIZE)*scale, (treasure.position.z+WORLD_SIZE)*scale, 5, 0, Math.PI*2);
  minimapCtx.fill();

  // Ghost
  minimapCtx.fillStyle = '#ff3366';
  minimapCtx.beginPath();
  minimapCtx.arc((ghost.position.x+WORLD_SIZE)*scale, (ghost.position.z+WORLD_SIZE)*scale, 3.5, 0, Math.PI*2);
  minimapCtx.fill();

  // Player
  minimapCtx.fillStyle = '#22d3ee';
  minimapCtx.beginPath();
  minimapCtx.arc((player.position.x+WORLD_SIZE)*scale, (player.position.z+WORLD_SIZE)*scale, 4, 0, Math.PI*2);
  minimapCtx.fill();

  // Direction indicator
  minimapCtx.strokeStyle = '#22d3ee';
  minimapCtx.lineWidth = 2;
  const px = (player.position.x+WORLD_SIZE)*scale;
  const pz = (player.position.z+WORLD_SIZE)*scale;
  minimapCtx.beginPath();
  minimapCtx.moveTo(px, pz);
  minimapCtx.lineTo(px + Math.sin(player.rotation.y)*8, pz - Math.cos(player.rotation.y)*8);
  minimapCtx.stroke();
}

// ==============================
// 15: DIFFICULTY
// ==============================
function updateDifficulty() {
  if (score <= 100) {
    ghostSpeed = GHOST_BASE_SPD;
    difficultyEl.textContent = 'Easy'; difficultyEl.className = 'easy';
  } else if (score <= 200) {
    ghostSpeed = 0.06;
    difficultyEl.textContent = 'Medium'; difficultyEl.className = 'medium';
  } else {
    ghostSpeed = 0.08;
    difficultyEl.textContent = 'Hard'; difficultyEl.className = 'hard';
  }
}

// ==============================
// 16: TREASURE PLACEMENT
// ==============================
function placeTreasure() {
  let tx, tz;
  do {
    tx = (Math.random()-0.5)*WORLD_SIZE*1.2;
    tz = (Math.random()-0.5)*WORLD_SIZE*1.2;
  } while (Math.sqrt(tx*tx+tz*tz) < 15);
  treasure.position.set(tx, 0, tz);
}

// ==============================
// 17: END GAME
// ==============================
function endGame(type) {
  if (gameOver) return;
  gameOver = true;
  clearInterval(timerInterval);
  clearInterval(scoreInterval);

  overlay.classList.remove('hidden');

  if (type === 'win') {
    score += BONUS_SCORE;
    overlayEmoji.textContent = '🎉';
    statusText.textContent = 'Treasure Found!';
    statusText.className = 'win';
    statusSub.textContent = 'You escaped the ghost and claimed the treasure!';
    stopBackgroundMusic();
    playWinSound();
  } else {
    cameraShakeTime = 30;
    overlayEmoji.textContent = '💀';
    statusText.textContent = 'Game Over!';
    statusText.className = 'lose';
    statusSub.textContent = 'The ghost consumed your soul...';
    stopBackgroundMusic();
    playLoseSound();
  }

  // Final stats panel
  finalStats.innerHTML = `
    <div class="final-stat">
      <div class="final-stat-label">Score</div>
      <div class="final-stat-value gold">${score}</div>
    </div>
    <div class="final-stat">
      <div class="final-stat-label">Time</div>
      <div class="final-stat-value green">${time}s</div>
    </div>
    <div class="final-stat">
      <div class="final-stat-label">Health</div>
      <div class="final-stat-value cyan">${Math.round(health)}%</div>
    </div>
  `;
}

// ==============================
// 18: PAUSE TOGGLE
// ==============================
function togglePause() {
  if (gameOver) return;
  gamePaused = !gamePaused;
  if (gamePaused) {
    pauseScreen.classList.remove('hidden');
    clearInterval(timerInterval);
    clearInterval(scoreInterval);
    pauseBackgroundMusic();
  } else {
    pauseScreen.classList.add('hidden');
    startTimers();
    resumeBackgroundMusic();
  }
}

// ==============================
// 19: TIMERS
// ==============================
function startTimers() {
  clearInterval(scoreInterval);
  scoreInterval = setInterval(() => {
    if (!gameOver && !gamePaused) {
      score += 10;
      scoreEl.textContent = score;
      updateDifficulty();
    }
  }, 1000);

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameOver && !gamePaused) {
      time++;
      timerEl.textContent = time;
    }
  }, 1000);
}

// ==============================
// 20: START / RESTART
// ==============================
function startGame() {
  gameOver = false;
  gamePaused = false;
  gameStarted = true;
  score = 0; time = 0; health = MAX_HEALTH;
  ghostSpeed = GHOST_BASE_SPD;
  ghostSoundTimer = 0;
  cameraMode = 'third';

  scoreEl.textContent = 0;
  timerEl.textContent = 0;
  difficultyEl.textContent = 'Easy';
  difficultyEl.className = 'easy';
  healthBarFill.style.width = '100%';

  overlay.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  startScreen.classList.add('hidden');

  hudEl.classList.remove('hidden');
  gameButtonsEl.classList.remove('hidden');
  controlsHintEl.classList.remove('hidden');
  minimapCanvas.classList.remove('hidden');
  distIndicator.classList.remove('hidden');

  player.position.set(0, 0, 0);
  player.rotation.y = 0;
  ghost.position.set(30, 0, 30);
  placeTreasure();

  // Start music and timers
  stopBackgroundMusic();
  startBackgroundMusic();
  startTimers();
}

function restartGame() { startGame(); }

// ==============================
// 21: BUTTON EVENTS
// ==============================
playBtn.addEventListener('click', () => startGame());
pauseBtn.addEventListener('click', () => togglePause());
restartGameBtn.addEventListener('click', () => restartGame());
resumeBtn.addEventListener('click', () => togglePause());
pauseRestartBtn.addEventListener('click', () => restartGame());
restartBtn.addEventListener('click', () => restartGame());

// ==============================
// 22: ANIMATION LOOP
// ==============================
function animate() {
  requestAnimationFrame(animate);
  const t = Date.now() * 0.001;

  if (!gameOver && !gamePaused && gameStarted) {
    movePlayer();
    moveGhost();
    updateHealth();
    checkCollisions();
    updateDistances();

    // Treasure rotation + sparkle animation
    treasure.rotation.y += 0.01;
    for (const sp of treasureObj.sparkles) {
      const d = sp.userData;
      sp.position.x = Math.cos(t*d.speed + d.angle) * d.radius;
      sp.position.z = Math.sin(t*d.speed + d.angle) * d.radius;
      sp.position.y = 1 + Math.sin(t*2 + d.yOff) * 0.5 + d.yOff*0.5;
      sp.material.opacity = 0.4 + Math.sin(t*3 + d.angle) * 0.4;
    }

    // Boy running animation
    if (playerIsMoving) {
      const swing = Math.sin(t * 12) * 0.6;
      playerObj.legLPivot.rotation.x = swing;
      playerObj.legRPivot.rotation.x = -swing;
      playerObj.armLPivot.rotation.x = -swing;
      playerObj.armRPivot.rotation.x = swing;
      playerObj.body.position.y = 1.4 + Math.abs(Math.sin(t*12))*0.08;
    } else {
      playerObj.legLPivot.rotation.x *= 0.9;
      playerObj.legRPivot.rotation.x *= 0.9;
      playerObj.armLPivot.rotation.x *= 0.9;
      playerObj.armRPivot.rotation.x *= 0.9;
      playerObj.body.position.y = 1.4;
    }

    // Ghost mist animation
    for (const wisp of ghostMist) {
      const d = wisp.userData;
      wisp.position.x += Math.sin(t*2+d.phase)*0.01;
      wisp.position.y = 0.5+Math.sin(t*1.5+d.phase)*0.5+Math.random()*0.3;
      wisp.material.opacity = 0.1+Math.sin(t+d.phase)*0.08;
    }
  }

  // Firefly animation (always runs for ambiance)
  for (const ff of fireflies) {
    const d = ff.userData;
    ff.position.y = d.baseY + Math.sin(t*d.speed+d.phase)*0.5;
    ff.position.x += d.driftX;
    ff.position.z += d.driftZ;
    if (ff.position.x > WORLD_SIZE) ff.position.x = -WORLD_SIZE;
    if (ff.position.x < -WORLD_SIZE) ff.position.x = WORLD_SIZE;
    if (ff.position.z > WORLD_SIZE) ff.position.z = -WORLD_SIZE;
    if (ff.position.z < -WORLD_SIZE) ff.position.z = WORLD_SIZE;
    ff.material.opacity = 0.5+Math.sin(t*d.speed*2+d.phase)*0.5;
    ff.material.transparent = true;
  }

  updateCamera();
  drawMinimap();
  renderer.render(scene, camera);
}

// ==============================
// 23: WINDOW RESIZE
// ==============================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ==============================
// 24: LAUNCH - show start screen, begin render loop
// ==============================
animate();
