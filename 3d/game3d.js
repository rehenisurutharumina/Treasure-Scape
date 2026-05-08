// ============================================================
// TREASURE ESCAPE 3D — Game Logic (Three.js)
//
// A lightweight 3D browser game.
// A boy runs through a forest. A ghost chases him.
// Reach the treasure chest before the ghost catches you!
//
// Built with Three.js only. No Unity, no other libraries.
// Opens directly in a browser.
// ============================================================


// ==============================
// SECTION 1: DOM REFERENCES
// ==============================

const scoreEl      = document.getElementById('score');
const timerEl      = document.getElementById('timer');
const difficultyEl = document.getElementById('difficulty');
const overlay      = document.getElementById('overlay');
const overlayEmoji = document.getElementById('overlay-emoji');
const statusText   = document.getElementById('status-text');
const statusSub    = document.getElementById('status-sub');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx    = minimapCanvas.getContext('2d');


// ==============================
// SECTION 2: GAME SETTINGS
// ==============================

const PLAYER_SPEED   = 0.12;   // How fast the player moves
const GHOST_BASE_SPD = 0.04;   // Ghost starting speed (Easy)
const WORLD_SIZE     = 50;     // Half-size of the ground plane
const TREE_COUNT     = 35;     // Dense tropical forest
const ROCK_COUNT     = 18;     // Rocks and boulders
const BUSH_COUNT     = 30;     // Undergrowth bushes
const FIREFLY_COUNT  = 40;     // Glowing fireflies
const MUSHROOM_COUNT = 12;     // Glowing mushrooms


// ==============================
// SECTION 3: GAME STATE
// ==============================

let score         = 0;
let time          = 0;
let ghostSpeed    = GHOST_BASE_SPD;
let gameOver      = false;
let timerInterval = null;
let scoreInterval = null;

// Keyboard tracking
const keys = {};


// ==============================
// SECTION 4: THREE.JS SETUP
// ==============================
// Create the scene, camera, and renderer.

// --- Scene ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050a18);  // Deep night sky
scene.fog = new THREE.FogExp2(0x0a0f2a, 0.015);  // Blue-purple night fog

// --- Camera ---
const camera = new THREE.PerspectiveCamera(
  60, window.innerWidth / window.innerHeight, 0.1, 250
);
camera.position.set(0, 12, 18);
camera.lookAt(0, 0, 0);

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);


// ==============================
// SECTION 5: LIGHTING & SKY
// ==============================

// Dim ambient — blue night
const ambientLight = new THREE.AmbientLight(0x4466aa, 1.2);
scene.add(ambientLight);

// Moonlight — bright silver-blue, casts shadows
const moonLight = new THREE.DirectionalLight(0x99aadd, 1.5);
moonLight.position.set(30, 50, -20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 1024;
moonLight.shadow.mapSize.height = 1024;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 100;
moonLight.shadow.camera.left = -40;
moonLight.shadow.camera.right = 40;
moonLight.shadow.camera.top = 40;
moonLight.shadow.camera.bottom = -40;
scene.add(moonLight);

// Hemisphere light — sky blue from above, dark ground below
const hemiLight = new THREE.HemisphereLight(0x223355, 0x0a1a0a, 0.4);
scene.add(hemiLight);

// Treasure golden glow
const treasureGlow = new THREE.PointLight(0xffaa00, 2.5, 18);
scene.add(treasureGlow);

// Ghost eerie glow
const ghostGlow = new THREE.PointLight(0xff3366, 1.5, 12);
scene.add(ghostGlow);

// --- MOON ---
const moonGeo = new THREE.SphereGeometry(4, 24, 24);
const moonMat = new THREE.MeshBasicMaterial({ color: 0xeeeedd });
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(60, 80, -80);
scene.add(moon);

// Moon halo glow
const moonHalo = new THREE.Mesh(
  new THREE.SphereGeometry(7, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0x556688, transparent: true, opacity: 0.15 })
);
moonHalo.position.copy(moon.position);
scene.add(moonHalo);

// Moon point light
const moonPtLight = new THREE.PointLight(0x8899bb, 0.8, 200);
moonPtLight.position.copy(moon.position);
scene.add(moonPtLight);

// --- STARS ---
const starGeo = new THREE.BufferGeometry();
const starVerts = [];
for (let i = 0; i < 600; i++) {
  starVerts.push(
    (Math.random() - 0.5) * 300,
    40 + Math.random() * 80,
    (Math.random() - 0.5) * 300
  );
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, sizeAttenuation: true });
scene.add(new THREE.Points(starGeo, starMat));


// ==============================
// SECTION 6: GROUND
// ==============================

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 30, 30),
  new THREE.MeshStandardMaterial({ color: 0x1a3d15, roughness: 0.95 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Mossy center patch
const patch = new THREE.Mesh(
  new THREE.CircleGeometry(WORLD_SIZE * 0.7, 32),
  new THREE.MeshStandardMaterial({ color: 0x264d1f, roughness: 1 })
);
patch.rotation.x = -Math.PI / 2;
patch.position.y = 0.02;
scene.add(patch);


// ==============================
// SECTION 7: TROPICAL TREES
// ==============================

const trees = [];

// --- Large jungle canopy tree ---
function createJungleTree(x, z) {
  const g = new THREE.Group();
  const h = 5 + Math.random() * 4;
  // Thick trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.55, h, 8),
    new THREE.MeshStandardMaterial({ color: 0x3d2b1f })
  );
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  g.add(trunk);
  // Big round canopy
  const cSize = 3 + Math.random() * 2;
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(cSize, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x0d4a0d })
  );
  canopy.position.y = h + cSize * 0.5;
  canopy.castShadow = true;
  g.add(canopy);
  // Secondary canopy
  const can2 = new THREE.Mesh(
    new THREE.SphereGeometry(cSize * 0.6, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x1a6622 })
  );
  can2.position.set(cSize * 0.5, h + cSize * 0.2, cSize * 0.3);
  g.add(can2);
  g.position.set(x, 0, z);
  scene.add(g);
  trees.push({ x, z, radius: 1.4 });
}

// --- Palm tree ---
function createPalm(x, z) {
  const g = new THREE.Group();
  const h = 6 + Math.random() * 3;
  const pTrunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.3, h, 8),
    new THREE.MeshStandardMaterial({ color: 0x5c3a1e })
  );
  pTrunk.position.y = h / 2;
  pTrunk.castShadow = true;
  g.add(pTrunk);
  // Palm fronds as flat cones
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 3, 4),
      new THREE.MeshStandardMaterial({ color: 0x1a7a1a, side: THREE.DoubleSide })
    );
    frond.position.set(0, h + 0.5, 0);
    frond.rotation.z = Math.PI / 3;
    frond.rotation.y = (i / 6) * Math.PI * 2;
    g.add(frond);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  trees.push({ x, z, radius: 1.0 });
}

// Scatter mixed trees
for (let i = 0; i < TREE_COUNT; i++) {
  let tx, tz;
  do {
    tx = (Math.random() - 0.5) * WORLD_SIZE * 1.6;
    tz = (Math.random() - 0.5) * WORLD_SIZE * 1.6;
  } while (Math.sqrt(tx * tx + tz * tz) < 6);
  if (Math.random() > 0.4) createJungleTree(tx, tz);
  else createPalm(tx, tz);
}

// --- Bushes (undergrowth) ---
for (let i = 0; i < BUSH_COUNT; i++) {
  const bx = (Math.random() - 0.5) * WORLD_SIZE * 1.5;
  const bz = (Math.random() - 0.5) * WORLD_SIZE * 1.5;
  if (Math.sqrt(bx * bx + bz * bz) < 4) continue;
  const s = 0.5 + Math.random() * 0.8;
  const bush = new THREE.Mesh(
    new THREE.SphereGeometry(s, 8, 6),
    new THREE.MeshStandardMaterial({ color: [0x1a5c1a, 0x0d4a0d, 0x2a6e2a][Math.floor(Math.random()*3)] })
  );
  bush.position.set(bx, s * 0.5, bz);
  bush.castShadow = true;
  scene.add(bush);
}


// ==============================
// SECTION 7B: GLOWING MUSHROOMS
// ==============================

for (let i = 0; i < MUSHROOM_COUNT; i++) {
  const mx = (Math.random() - 0.5) * WORLD_SIZE * 1.3;
  const mz = (Math.random() - 0.5) * WORLD_SIZE * 1.3;
  const mg = new THREE.Group();
  // Stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6),
    new THREE.MeshStandardMaterial({ color: 0xccccaa })
  );
  stem.position.y = 0.15;
  mg.add(stem);
  // Cap
  const capColor = [0x44ddaa, 0x33bbff, 0xaa66ff][Math.floor(Math.random()*3)];
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI*2, 0, Math.PI/2),
    new THREE.MeshStandardMaterial({ color: capColor, emissive: capColor, emissiveIntensity: 0.6 })
  );
  cap.position.y = 0.33;
  mg.add(cap);
  // Tiny glow light
  const ml = new THREE.PointLight(capColor, 0.3, 4);
  ml.position.y = 0.5;
  mg.add(ml);
  mg.position.set(mx, 0, mz);
  scene.add(mg);
}


// ==============================
// SECTION 8: ROCKS
// ==============================

const rocks = [];

function createRock(x, z) {
  const size = 0.4 + Math.random() * 0.7;
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(size, 0),
    new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.9 })
  );
  rock.position.set(x, size * 0.35, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  scene.add(rock);
  // Moss patch on some rocks
  if (Math.random() > 0.5) {
    const moss = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.5, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0x2a5a22 })
    );
    moss.position.set(x, size * 0.2, z);
    scene.add(moss);
  }
  rocks.push({ x, z, radius: size * 0.8 });
}

for (let i = 0; i < ROCK_COUNT; i++) {
  let rx, rz;
  do {
    rx = (Math.random() - 0.5) * WORLD_SIZE * 1.4;
    rz = (Math.random() - 0.5) * WORLD_SIZE * 1.4;
  } while (Math.sqrt(rx * rx + rz * rz) < 5);
  createRock(rx, rz);
}


// ==============================
// SECTION 8B: FIREFLIES
// ==============================

const fireflies = [];
for (let i = 0; i < FIREFLY_COUNT; i++) {
  const ff = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xaaff44 })
  );
  ff.position.set(
    (Math.random() - 0.5) * WORLD_SIZE * 1.4,
    1 + Math.random() * 3,
    (Math.random() - 0.5) * WORLD_SIZE * 1.4
  );
  ff.userData = {
    baseY: ff.position.y,
    speed: 0.5 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2,
    driftX: (Math.random() - 0.5) * 0.01,
    driftZ: (Math.random() - 0.5) * 0.01,
  };
  scene.add(ff);
  fireflies.push(ff);
}


// ==============================
// SECTION 9: PLAYER (Boy) — with running animation
// ==============================

const player = new THREE.Group();

// Body — green adventure tunic
const body = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 1.2, 0.5),
  new THREE.MeshStandardMaterial({ color: 0x4a7a3a })
);
body.position.y = 1.4;
body.castShadow = true;
player.add(body);

// Belt
const belt = new THREE.Mesh(
  new THREE.BoxGeometry(0.85, 0.15, 0.55),
  new THREE.MeshStandardMaterial({ color: 0x6b3a1e })
);
belt.position.y = 1.0;
player.add(belt);

// Head — skin-colored sphere
const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.35, 12, 12),
  new THREE.MeshStandardMaterial({ color: 0xf5c6a0 })
);
head.position.y = 2.35;
head.castShadow = true;
player.add(head);

// Hair — brown on top
const hair = new THREE.Mesh(
  new THREE.SphereGeometry(0.38, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x5c3a1e })
);
hair.position.y = 2.4;
player.add(hair);

// Backpack — brown box on back
const backpack = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.6, 0.3),
  new THREE.MeshStandardMaterial({ color: 0x7a4a2a })
);
backpack.position.set(0, 1.5, -0.35);
player.add(backpack);

// LEFT LEG — pivoted at hip for swing animation
const legLPivot = new THREE.Group();
legLPivot.position.set(-0.2, 0.8, 0);  // Hip joint
const legLMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.28, 0.8, 0.3),
  new THREE.MeshStandardMaterial({ color: 0x4a3520 })
);
legLMesh.position.y = -0.4;  // Hang below pivot
legLPivot.add(legLMesh);
player.add(legLPivot);

// RIGHT LEG — pivoted at hip
const legRPivot = new THREE.Group();
legRPivot.position.set(0.2, 0.8, 0);
const legRMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.28, 0.8, 0.3),
  new THREE.MeshStandardMaterial({ color: 0x4a3520 })
);
legRMesh.position.y = -0.4;
legRPivot.add(legRMesh);
player.add(legRPivot);

// LEFT ARM — pivoted at shoulder
const armLPivot = new THREE.Group();
armLPivot.position.set(-0.55, 1.8, 0);  // Shoulder joint
const armLMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.7, 0.25),
  new THREE.MeshStandardMaterial({ color: 0x4a7a3a })
);
armLMesh.position.y = -0.35;
armLPivot.add(armLMesh);
player.add(armLPivot);

// RIGHT ARM — pivoted at shoulder
const armRPivot = new THREE.Group();
armRPivot.position.set(0.55, 1.8, 0);
const armRMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.7, 0.25),
  new THREE.MeshStandardMaterial({ color: 0x4a7a3a })
);
armRMesh.position.y = -0.35;
armRPivot.add(armRMesh);
player.add(armRPivot);

player.position.set(0, 0, 0);
scene.add(player);

// Track if player is moving for animation
let playerIsMoving = false;


// ==============================
// SECTION 10: GHOST (Scary Wraith)
// ==============================
// A terrifying supernatural wraith with trailing mist.

const ghost = new THREE.Group();

// Wraith body — dark tattered cloak shape
const ghostBody = new THREE.Mesh(
  new THREE.ConeGeometry(1.2, 3, 12),
  new THREE.MeshStandardMaterial({
    color: 0x1a1a2a,
    transparent: true,
    opacity: 0.7,
    emissive: 0x330022,
    emissiveIntensity: 0.4,
  })
);
ghostBody.position.y = 2;
ghostBody.rotation.x = Math.PI;  // Wide part on top
ghost.add(ghostBody);

// Wraith head — dark hooded shape
const ghostHead = new THREE.Mesh(
  new THREE.SphereGeometry(0.6, 12, 12),
  new THREE.MeshStandardMaterial({
    color: 0x111122,
    transparent: true,
    opacity: 0.8,
    emissive: 0x220011,
    emissiveIntensity: 0.3,
  })
);
ghostHead.position.y = 3.2;
ghost.add(ghostHead);

// Glowing eyes — piercing red
const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
const gEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeGlowMat);
gEyeL.position.set(-0.18, 3.3, 0.48);
ghost.add(gEyeL);
const gEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeGlowMat);
gEyeR.position.set(0.18, 3.3, 0.48);
ghost.add(gEyeR);

// Glowing mouth — eerie slit
const mouth = new THREE.Mesh(
  new THREE.BoxGeometry(0.25, 0.06, 0.1),
  new THREE.MeshBasicMaterial({ color: 0xcc0044 })
);
mouth.position.set(0, 3.0, 0.55);
ghost.add(mouth);

// Clawed hands
const clawMat = new THREE.MeshStandardMaterial({
  color: 0x222233, emissive: 0x110011, emissiveIntensity: 0.3
});
const clawL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), clawMat);
clawL.position.set(-0.9, 2.5, 0.5);
clawL.rotation.z = 0.3;
ghost.add(clawL);
const clawR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), clawMat);
clawR.position.set(0.9, 2.5, 0.5);
clawR.rotation.z = -0.3;
ghost.add(clawR);

// Mist trail wisps — transparent spheres that trail behind
const ghostMist = [];
for (let i = 0; i < 8; i++) {
  const wisp = new THREE.Mesh(
    new THREE.SphereGeometry(0.3 + Math.random() * 0.4, 8, 6),
    new THREE.MeshBasicMaterial({
      color: 0x443366,
      transparent: true,
      opacity: 0.15 + Math.random() * 0.1,
    })
  );
  wisp.position.set(
    (Math.random() - 0.5) * 1.5,
    0.5 + Math.random() * 2,
    -0.5 - Math.random() * 2
  );
  wisp.userData = {
    offsetX: (Math.random() - 0.5) * 0.02,
    offsetY: Math.random() * 0.01,
    phase: Math.random() * Math.PI * 2,
  };
  ghost.add(wisp);
  ghostMist.push(wisp);
}

ghost.position.set(30, 0, 30);
scene.add(ghost);


// ==============================
// SECTION 11: TREASURE CHEST
// ==============================
// A golden box with a lid, placed randomly in the forest.

const treasure = new THREE.Group();

// Chest base — golden box
const chestBase = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 0.9, 1),
  new THREE.MeshStandardMaterial({
    color: 0xdaa520,
    roughness: 0.3,
    metalness: 0.7,
  })
);
chestBase.position.y = 0.45;
chestBase.castShadow = true;
treasure.add(chestBase);

// Chest lid — slightly rounded top
const chestLid = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 0.4, 1.1),
  new THREE.MeshStandardMaterial({
    color: 0xc8961e,
    roughness: 0.3,
    metalness: 0.7,
  })
);
chestLid.position.y = 1.1;
chestLid.castShadow = true;
treasure.add(chestLid);

// Lock — small dark box
const lock = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.3, 0.15),
  new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9 })
);
lock.position.set(0, 0.8, 0.55);
treasure.add(lock);

// Place treasure at a random distant position
function placeTreasure() {
  let tx, tz;
  do {
    tx = (Math.random() - 0.5) * WORLD_SIZE * 1.2;
    tz = (Math.random() - 0.5) * WORLD_SIZE * 1.2;
  } while (Math.sqrt(tx * tx + tz * tz) < 15);  // Not too close to start
  treasure.position.set(tx, 0, tz);
  treasureGlow.position.set(tx, 3, tz);  // Golden glow above chest
}

placeTreasure();
scene.add(treasure);


// ==============================
// SECTION 12: SPOOKY GHOST AREA
// ==============================

const spookyZone = new THREE.Mesh(
  new THREE.CircleGeometry(10, 32),
  new THREE.MeshBasicMaterial({ color: 0x1a0033, transparent: true, opacity: 0.4 })
);
spookyZone.rotation.x = -Math.PI / 2;
spookyZone.position.set(30, 0.02, 30);
scene.add(spookyZone);

// Purple mist pillars
for (let i = 0; i < 7; i++) {
  const a = (i / 7) * Math.PI * 2;
  const p = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.1, 3 + Math.random() * 4, 6),
    new THREE.MeshBasicMaterial({ color: 0x6633aa, transparent: true, opacity: 0.12 })
  );
  p.position.set(30 + Math.cos(a) * 6, 2, 30 + Math.sin(a) * 6);
  scene.add(p);
}
// Spooky glow
const spookyLight = new THREE.PointLight(0x6633aa, 1, 15);
spookyLight.position.set(30, 3, 30);
scene.add(spookyLight);


// ==============================
// SECTION 13: KEYBOARD INPUT
// ==============================

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  // Prevent page scrolling with arrow keys
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) {
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});


// ==============================
// SECTION 14: PLAYER MOVEMENT
// ==============================
// Moves the player based on WASD / Arrow keys.
// Keeps the player inside the world boundaries.
// Checks collision with trees and rocks.

function movePlayer() {
  const prevX = player.position.x;
  const prevZ = player.position.z;

  // Move FORWARD (W or ArrowUp)
  if (keys['w'] || keys['W'] || keys['ArrowUp']) {
    player.position.z -= PLAYER_SPEED;
  }
  // Move BACKWARD (S or ArrowDown)
  if (keys['s'] || keys['S'] || keys['ArrowDown']) {
    player.position.z += PLAYER_SPEED;
  }
  // Move LEFT (A or ArrowLeft)
  if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
    player.position.x -= PLAYER_SPEED;
  }
  // Move RIGHT (D or ArrowRight)
  if (keys['d'] || keys['D'] || keys['ArrowRight']) {
    player.position.x += PLAYER_SPEED;
  }

  // Keep player inside world boundaries
  player.position.x = Math.max(-WORLD_SIZE + 1, Math.min(WORLD_SIZE - 1, player.position.x));
  player.position.z = Math.max(-WORLD_SIZE + 1, Math.min(WORLD_SIZE - 1, player.position.z));

  // Collision with trees — push back if touching
  for (const tree of trees) {
    const dx = player.position.x - tree.x;
    const dz = player.position.z - tree.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < tree.radius) {
      player.position.x = prevX;
      player.position.z = prevZ;
      break;
    }
  }

  // Collision with rocks — push back if touching
  for (const rock of rocks) {
    const dx = player.position.x - rock.x;
    const dz = player.position.z - rock.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < rock.radius) {
      player.position.x = prevX;
      player.position.z = prevZ;
      break;
    }
  }

  // Rotate player to face movement direction
  const movedX = player.position.x - prevX;
  const movedZ = player.position.z - prevZ;
  playerIsMoving = (Math.abs(movedX) > 0.001 || Math.abs(movedZ) > 0.001);
  if (playerIsMoving) {
    player.rotation.y = Math.atan2(movedX, movedZ);
  }
}


// ==============================
// SECTION 15: GHOST AI
// ==============================
// The ghost chases the player automatically.
// It moves towards the player's position each frame.
// ghostSpeed increases with difficulty.

function moveGhost() {
  const dx = player.position.x - ghost.position.x;
  const dz = player.position.z - ghost.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist > 0.5) {
    // Normalize direction and move towards player
    ghost.position.x += (dx / dist) * ghostSpeed;
    ghost.position.z += (dz / dist) * ghostSpeed;
  }

  // Rotate ghost to face the player
  ghost.rotation.y = Math.atan2(dx, dz);

  // Floating animation — bobbing up and down
  ghost.position.y = Math.sin(Date.now() * 0.003) * 0.4;

  // Update ghost's red glow position
  ghostGlow.position.set(ghost.position.x, 2.5, ghost.position.z);
}


// ==============================
// SECTION 16: COLLISION DETECTION
// ==============================
// Simple distance-based collision.
// If two objects are close enough, they're "touching".

function checkCollisions() {
  // --- Player vs Ghost ---
  const gDx = player.position.x - ghost.position.x;
  const gDz = player.position.z - ghost.position.z;
  const ghostDist = Math.sqrt(gDx * gDx + gDz * gDz);

  if (ghostDist < 1.5) {
    endGame('lose');
    return;
  }

  // --- Player vs Treasure ---
  const tDx = player.position.x - treasure.position.x;
  const tDz = player.position.z - treasure.position.z;
  const treasureDist = Math.sqrt(tDx * tDx + tDz * tDz);

  if (treasureDist < 2) {
    endGame('win');
    return;
  }
}


// ==============================
// SECTION 17: CAMERA FOLLOW
// ==============================
// Camera follows the player from behind and above.
// Smooth lerp (linear interpolation) for fluid motion.

function updateCamera() {
  // Target camera position: behind and above the player
  const targetX = player.position.x;
  const targetY = player.position.y + 10;
  const targetZ = player.position.z + 14;

  // Smoothly move camera towards target (lerp factor 0.05)
  camera.position.x += (targetX - camera.position.x) * 0.05;
  camera.position.y += (targetY - camera.position.y) * 0.05;
  camera.position.z += (targetZ - camera.position.z) * 0.05;

  // Always look at the player
  camera.lookAt(player.position.x, 1.5, player.position.z);
}


// ==============================
// SECTION 18: MINIMAP
// ==============================
// A small 2D overhead view in the corner showing positions.

function drawMinimap() {
  const w = minimapCanvas.width;
  const h = minimapCanvas.height;
  const scale = w / (WORLD_SIZE * 2);

  minimapCtx.clearRect(0, 0, w, h);

  // Background
  minimapCtx.fillStyle = 'rgba(0, 20, 0, 0.7)';
  minimapCtx.fillRect(0, 0, w, h);

  // Border
  minimapCtx.strokeStyle = 'rgba(255,255,255,0.15)';
  minimapCtx.strokeRect(0, 0, w, h);

  // Trees (small green dots)
  minimapCtx.fillStyle = '#1a5c1a';
  for (const tree of trees) {
    const mx = (tree.x + WORLD_SIZE) * scale;
    const mz = (tree.z + WORLD_SIZE) * scale;
    minimapCtx.beginPath();
    minimapCtx.arc(mx, mz, 2, 0, Math.PI * 2);
    minimapCtx.fill();
  }

  // Treasure (gold dot)
  minimapCtx.fillStyle = '#facc15';
  const tx = (treasure.position.x + WORLD_SIZE) * scale;
  const tz = (treasure.position.z + WORLD_SIZE) * scale;
  minimapCtx.beginPath();
  minimapCtx.arc(tx, tz, 4, 0, Math.PI * 2);
  minimapCtx.fill();

  // Ghost (red dot)
  minimapCtx.fillStyle = '#ff3366';
  const gx = (ghost.position.x + WORLD_SIZE) * scale;
  const gz = (ghost.position.z + WORLD_SIZE) * scale;
  minimapCtx.beginPath();
  minimapCtx.arc(gx, gz, 3, 0, Math.PI * 2);
  minimapCtx.fill();

  // Player (cyan dot)
  minimapCtx.fillStyle = '#22d3ee';
  const px = (player.position.x + WORLD_SIZE) * scale;
  const pz = (player.position.z + WORLD_SIZE) * scale;
  minimapCtx.beginPath();
  minimapCtx.arc(px, pz, 3.5, 0, Math.PI * 2);
  minimapCtx.fill();
}


// ==============================
// SECTION 19: DIFFICULTY
// ==============================
// Ghost gets faster as score increases.
//   Score 0–100:   Easy   (ghostSpeed = 0.04)
//   Score 110–200: Medium (ghostSpeed = 0.06)
//   Score 210+:    Hard   (ghostSpeed = 0.08)

function updateDifficulty() {
  if (score <= 100) {
    ghostSpeed = GHOST_BASE_SPD;
    difficultyEl.textContent = 'Easy';
    difficultyEl.className = 'easy';
  } else if (score <= 200) {
    ghostSpeed = 0.06;
    difficultyEl.textContent = 'Medium';
    difficultyEl.className = 'medium';
  } else {
    ghostSpeed = 0.08;
    difficultyEl.textContent = 'Hard';
    difficultyEl.className = 'hard';
  }
}


// ==============================
// SECTION 20: END GAME
// ==============================

function endGame(type) {
  if (gameOver) return;
  gameOver = true;

  clearInterval(timerInterval);
  clearInterval(scoreInterval);

  overlay.classList.remove('hidden');

  if (type === 'win') {
    overlayEmoji.textContent = '🎉';
    statusText.textContent   = 'You Win! Treasure found!';
    statusText.className     = 'win';
    statusSub.textContent    = `Score: ${score} | Time: ${time}s — Amazing!`;
  } else {
    overlayEmoji.textContent = '💀';
    statusText.textContent   = 'Game Over! Ghost caught you!';
    statusText.className     = 'lose';
    statusSub.textContent    = `Score: ${score} | Time: ${time}s — Try again!`;
  }
}


// ==============================
// SECTION 21: START / RESTART
// ==============================

function startGame() {
  gameOver = false;
  score = 0;
  time  = 0;
  ghostSpeed = GHOST_BASE_SPD;

  scoreEl.textContent  = score;
  timerEl.textContent  = time;
  difficultyEl.textContent = 'Easy';
  difficultyEl.className = 'easy';
  overlay.classList.add('hidden');

  // Reset positions
  player.position.set(0, 0, 0);
  ghost.position.set(30, 0, 30);
  placeTreasure();

  // Score: +10 every second
  clearInterval(scoreInterval);
  scoreInterval = setInterval(() => {
    if (!gameOver) {
      score += 10;
      scoreEl.textContent = score;
      updateDifficulty();
    }
  }, 1000);

  // Timer
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameOver) {
      time++;
      timerEl.textContent = time;
    }
  }, 1000);
}

// Called by the "Play Again" button
function restartGame() {
  startGame();
}


// ==============================
// SECTION 22: ANIMATION LOOP
// ==============================
// Runs every frame (~60 fps). Updates movement, collisions, camera, and renders.

function animate() {
  requestAnimationFrame(animate);
  const t = Date.now() * 0.001;

  if (!gameOver) {
    movePlayer();
    moveGhost();
    checkCollisions();
    treasure.rotation.y += 0.01;

    // --- BOY RUNNING ANIMATION ---
    // Swing legs and arms when moving
    if (playerIsMoving) {
      const swing = Math.sin(t * 12) * 0.6;  // Fast swing
      legLPivot.rotation.x = swing;
      legRPivot.rotation.x = -swing;
      armLPivot.rotation.x = -swing;  // Arms opposite to legs
      armRPivot.rotation.x = swing;
      // Slight body bob
      body.position.y = 1.4 + Math.abs(Math.sin(t * 12)) * 0.08;
    } else {
      // Idle — gently return to default pose
      legLPivot.rotation.x *= 0.9;
      legRPivot.rotation.x *= 0.9;
      armLPivot.rotation.x *= 0.9;
      armRPivot.rotation.x *= 0.9;
      body.position.y = 1.4;
    }

    // --- GHOST MIST ANIMATION ---
    for (const wisp of ghostMist) {
      const d = wisp.userData;
      wisp.position.x += Math.sin(t * 2 + d.phase) * 0.01;
      wisp.position.y = 0.5 + Math.sin(t * 1.5 + d.phase) * 0.5 + Math.random() * 0.3;
      wisp.material.opacity = 0.1 + Math.sin(t + d.phase) * 0.08;
    }
  }

  // Animate fireflies
  for (const ff of fireflies) {
    const d = ff.userData;
    ff.position.y = d.baseY + Math.sin(t * d.speed + d.phase) * 0.5;
    ff.position.x += d.driftX;
    ff.position.z += d.driftZ;
    if (ff.position.x > WORLD_SIZE) ff.position.x = -WORLD_SIZE;
    if (ff.position.x < -WORLD_SIZE) ff.position.x = WORLD_SIZE;
    if (ff.position.z > WORLD_SIZE) ff.position.z = -WORLD_SIZE;
    if (ff.position.z < -WORLD_SIZE) ff.position.z = WORLD_SIZE;
    ff.material.opacity = 0.5 + Math.sin(t * d.speed * 2 + d.phase) * 0.5;
    ff.material.transparent = true;
  }

  updateCamera();
  drawMinimap();
  renderer.render(scene, camera);
}


// ==============================
// SECTION 23: WINDOW RESIZE
// ==============================

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


// ==============================
// SECTION 24: LAUNCH!
// ==============================

startGame();
animate();
