// ============================================================
// WORLD.JS — Environment builder for Treasure Escape 3D
// Creates terrain, trees, rocks, mushrooms, fireflies, treasure
// ============================================================

// Settings
const WORLD_SIZE = 50;
const TREE_COUNT = 35;
const ROCK_COUNT = 18;
const BUSH_COUNT = 30;
const FIREFLY_COUNT = 40;
const MUSHROOM_COUNT = 12;

// Storage for collision objects
const trees = [];
const rocks = [];
const fireflies = [];
const ghostMist = [];

// ==============================
// LIGHTING & SKY
// ==============================
function buildLighting(scene) {
  scene.background = new THREE.Color(0x050a18);
  scene.fog = new THREE.FogExp2(0x0a0f2a, 0.013);

  const ambient = new THREE.AmbientLight(0x4466aa, 1.2);
  scene.add(ambient);

  const moon = new THREE.DirectionalLight(0x99aadd, 1.5);
  moon.position.set(30, 50, -20);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 100;
  moon.shadow.camera.left = -40;
  moon.shadow.camera.right = 40;
  moon.shadow.camera.top = 40;
  moon.shadow.camera.bottom = -40;
  scene.add(moon);

  scene.add(new THREE.HemisphereLight(0x223355, 0x0a1a0a, 0.4));

  // Moon sphere
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(4, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xeeeedd })
  );
  moonMesh.position.set(60, 80, -80);
  scene.add(moonMesh);

  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(7, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0x556688, transparent: true, opacity: 0.15 })
  );
  halo.position.copy(moonMesh.position);
  scene.add(halo);

  const moonPtLight = new THREE.PointLight(0x8899bb, 0.8, 200);
  moonPtLight.position.copy(moonMesh.position);
  scene.add(moonPtLight);

  // Stars
  const starGeo = new THREE.BufferGeometry();
  const sv = [];
  for (let i = 0; i < 600; i++) {
    sv.push((Math.random()-0.5)*300, 40+Math.random()*80, (Math.random()-0.5)*300);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3, sizeAttenuation: true })));

  return { ambient, moon };
}

// ==============================
// GROUND
// ==============================
function buildGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD_SIZE*2, WORLD_SIZE*2, 30, 30),
    new THREE.MeshStandardMaterial({ color: 0x1a3d15, roughness: 0.95 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  const patch = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD_SIZE*0.7, 32),
    new THREE.MeshStandardMaterial({ color: 0x264d1f, roughness: 1 })
  );
  patch.rotation.x = -Math.PI/2;
  patch.position.y = 0.02;
  scene.add(patch);

  // Path/trail from center toward edges
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + 0.3;
    const trail = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 30),
      new THREE.MeshStandardMaterial({ color: 0x3d3020, roughness: 1 })
    );
    trail.rotation.x = -Math.PI/2;
    trail.rotation.z = angle;
    trail.position.y = 0.03;
    scene.add(trail);
  }
}

// ==============================
// TREES
// ==============================
function createJungleTree(scene, x, z) {
  const g = new THREE.Group();
  const h = 5 + Math.random()*4;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.55, h, 8),
    new THREE.MeshStandardMaterial({ color: 0x3d2b1f })
  );
  trunk.position.y = h/2;
  trunk.castShadow = true;
  g.add(trunk);

  const cs = 3 + Math.random()*2;
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(cs, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x0d4a0d })
  );
  canopy.position.y = h + cs*0.5;
  canopy.castShadow = true;
  g.add(canopy);

  const c2 = new THREE.Mesh(
    new THREE.SphereGeometry(cs*0.6, 8, 6),
    new THREE.MeshStandardMaterial({ color: 0x1a6622 })
  );
  c2.position.set(cs*0.5, h+cs*0.2, cs*0.3);
  g.add(c2);

  // Hanging vines
  for (let i = 0; i < 3; i++) {
    const vine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.02, 2+Math.random()*2, 4),
      new THREE.MeshStandardMaterial({ color: 0x2a5a22 })
    );
    vine.position.set((Math.random()-0.5)*cs, h+cs*0.2-1, (Math.random()-0.5)*cs);
    g.add(vine);
  }

  g.position.set(x, 0, z);
  scene.add(g);
  trees.push({ x, z, radius: 1.4 });
}

function createPalm(scene, x, z) {
  const g = new THREE.Group();
  const h = 6 + Math.random()*3;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.3, h, 8),
    new THREE.MeshStandardMaterial({ color: 0x5c3a1e })
  );
  trunk.position.y = h/2;
  trunk.castShadow = true;
  g.add(trunk);

  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(
      new THREE.ConeGeometry(2.5, 3, 4),
      new THREE.MeshStandardMaterial({ color: 0x1a7a1a, side: THREE.DoubleSide })
    );
    frond.position.set(0, h+0.5, 0);
    frond.rotation.z = Math.PI/3;
    frond.rotation.y = (i/6)*Math.PI*2;
    g.add(frond);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  trees.push({ x, z, radius: 1.0 });
}

function buildTrees(scene) {
  for (let i = 0; i < TREE_COUNT; i++) {
    let tx, tz;
    do {
      tx = (Math.random()-0.5)*WORLD_SIZE*1.6;
      tz = (Math.random()-0.5)*WORLD_SIZE*1.6;
    } while (Math.sqrt(tx*tx+tz*tz) < 6);
    if (Math.random() > 0.4) createJungleTree(scene, tx, tz);
    else createPalm(scene, tx, tz);
  }

  // Bushes
  for (let i = 0; i < BUSH_COUNT; i++) {
    const bx = (Math.random()-0.5)*WORLD_SIZE*1.5;
    const bz = (Math.random()-0.5)*WORLD_SIZE*1.5;
    if (Math.sqrt(bx*bx+bz*bz) < 4) continue;
    const s = 0.5+Math.random()*0.8;
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(s, 8, 6),
      new THREE.MeshStandardMaterial({ color: [0x1a5c1a,0x0d4a0d,0x2a6e2a][Math.floor(Math.random()*3)] })
    );
    bush.position.set(bx, s*0.5, bz);
    bush.castShadow = true;
    scene.add(bush);
  }
}

// ==============================
// ROCKS
// ==============================
function buildRocks(scene) {
  for (let i = 0; i < ROCK_COUNT; i++) {
    let rx, rz;
    do {
      rx = (Math.random()-0.5)*WORLD_SIZE*1.4;
      rz = (Math.random()-0.5)*WORLD_SIZE*1.4;
    } while (Math.sqrt(rx*rx+rz*rz) < 5);

    const size = 0.4+Math.random()*0.7;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(size, 0),
      new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.9 })
    );
    rock.position.set(rx, size*0.35, rz);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    scene.add(rock);

    if (Math.random() > 0.5) {
      const moss = new THREE.Mesh(
        new THREE.SphereGeometry(size*0.5, 6, 4),
        new THREE.MeshStandardMaterial({ color: 0x2a5a22 })
      );
      moss.position.set(rx, size*0.2, rz);
      scene.add(moss);
    }
    rocks.push({ x: rx, z: rz, radius: size*0.8 });
  }
}

// ==============================
// MUSHROOMS
// ==============================
function buildMushrooms(scene) {
  for (let i = 0; i < MUSHROOM_COUNT; i++) {
    const mx = (Math.random()-0.5)*WORLD_SIZE*1.3;
    const mz = (Math.random()-0.5)*WORLD_SIZE*1.3;
    const mg = new THREE.Group();
    mg.add(new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.3, 6),
      new THREE.MeshStandardMaterial({ color: 0xccccaa })
    ));
    mg.children[0].position.y = 0.15;

    const cc = [0x44ddaa,0x33bbff,0xaa66ff][Math.floor(Math.random()*3)];
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI*2, 0, Math.PI/2),
      new THREE.MeshStandardMaterial({ color: cc, emissive: cc, emissiveIntensity: 0.6 })
    );
    cap.position.y = 0.33;
    mg.add(cap);

    const ml = new THREE.PointLight(cc, 0.3, 4);
    ml.position.y = 0.5;
    mg.add(ml);
    mg.position.set(mx, 0, mz);
    scene.add(mg);
  }
}

// ==============================
// FIREFLIES
// ==============================
function buildFireflies(scene) {
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    const ff = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xaaff44 })
    );
    ff.position.set(
      (Math.random()-0.5)*WORLD_SIZE*1.4,
      1+Math.random()*3,
      (Math.random()-0.5)*WORLD_SIZE*1.4
    );
    ff.userData = {
      baseY: ff.position.y,
      speed: 0.5+Math.random()*1.5,
      phase: Math.random()*Math.PI*2,
      driftX: (Math.random()-0.5)*0.01,
      driftZ: (Math.random()-0.5)*0.01,
    };
    scene.add(ff);
    fireflies.push(ff);
  }
}

// ==============================
// TREASURE CHEST
// ==============================
function buildTreasure(scene) {
  const treasure = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.9, 1),
    new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.3, metalness: 0.7 })
  );
  base.position.y = 0.45;
  base.castShadow = true;
  treasure.add(base);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.4, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xc8961e, roughness: 0.3, metalness: 0.7 })
  );
  lid.position.y = 1.1;
  lid.castShadow = true;
  treasure.add(lid);

  const lock = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.3, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.9 })
  );
  lock.position.set(0, 0.8, 0.55);
  treasure.add(lock);

  // Sparkle particles around treasure
  const sparkles = [];
  for (let i = 0; i < 20; i++) {
    const sp = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.8 })
    );
    sp.userData = {
      angle: (i/20)*Math.PI*2,
      radius: 1.5+Math.random(),
      speed: 0.5+Math.random(),
      yOff: Math.random()*2
    };
    treasure.add(sp);
    sparkles.push(sp);
  }

  // Golden glow
  const glow = new THREE.PointLight(0xffaa00, 2.5, 18);
  glow.position.y = 3;
  treasure.add(glow);

  scene.add(treasure);
  return { treasure, sparkles, glow };
}

// ==============================
// GHOST
// ==============================
function buildGhost(scene) {
  const ghost = new THREE.Group();

  const ghostBody = new THREE.Mesh(
    new THREE.ConeGeometry(1.2, 3, 12),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a2a, transparent: true, opacity: 0.7,
      emissive: 0x330022, emissiveIntensity: 0.4,
    })
  );
  ghostBody.position.y = 2;
  ghostBody.rotation.x = Math.PI;
  ghost.add(ghostBody);

  const ghostHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0x111122, transparent: true, opacity: 0.8,
      emissive: 0x220011, emissiveIntensity: 0.3,
    })
  );
  ghostHead.position.y = 3.2;
  ghost.add(ghostHead);

  // Glowing eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
  const eL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
  eL.position.set(-0.18, 3.3, 0.48);
  ghost.add(eL);
  const eR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
  eR.position.set(0.18, 3.3, 0.48);
  ghost.add(eR);

  // Mouth
  const mouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.06, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xcc0044 })
  );
  mouth.position.set(0, 3.0, 0.55);
  ghost.add(mouth);

  // Claws
  const clawMat = new THREE.MeshStandardMaterial({ color: 0x222233, emissive: 0x110011, emissiveIntensity: 0.3 });
  const cL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), clawMat);
  cL.position.set(-0.9, 2.5, 0.5); cL.rotation.z = 0.3;
  ghost.add(cL);
  const cR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), clawMat);
  cR.position.set(0.9, 2.5, 0.5); cR.rotation.z = -0.3;
  ghost.add(cR);

  // Mist wisps
  for (let i = 0; i < 8; i++) {
    const wisp = new THREE.Mesh(
      new THREE.SphereGeometry(0.3+Math.random()*0.4, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x443366, transparent: true, opacity: 0.15+Math.random()*0.1 })
    );
    wisp.position.set((Math.random()-0.5)*1.5, 0.5+Math.random()*2, -0.5-Math.random()*2);
    wisp.userData = { phase: Math.random()*Math.PI*2 };
    ghost.add(wisp);
    ghostMist.push(wisp);
  }

  // Ghost glow
  const glow = new THREE.PointLight(0xff3366, 1.5, 12);
  ghost.add(glow);
  glow.position.y = 2.5;

  // Aura ring
  const aura = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 2.5, 32),
    new THREE.MeshBasicMaterial({ color: 0x6633aa, transparent: true, opacity: 0.08, side: THREE.DoubleSide })
  );
  aura.rotation.x = -Math.PI/2;
  aura.position.y = 0.1;
  ghost.add(aura);

  ghost.position.set(30, 0, 30);
  scene.add(ghost);
  return { ghost, glow };
}

// ==============================
// SPOOKY ZONE
// ==============================
function buildSpookyZone(scene) {
  const zone = new THREE.Mesh(
    new THREE.CircleGeometry(10, 32),
    new THREE.MeshBasicMaterial({ color: 0x1a0033, transparent: true, opacity: 0.4 })
  );
  zone.rotation.x = -Math.PI/2;
  zone.position.set(30, 0.02, 30);
  scene.add(zone);

  for (let i = 0; i < 7; i++) {
    const a = (i/7)*Math.PI*2;
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.1, 3+Math.random()*4, 6),
      new THREE.MeshBasicMaterial({ color: 0x6633aa, transparent: true, opacity: 0.12 })
    );
    p.position.set(30+Math.cos(a)*6, 2, 30+Math.sin(a)*6);
    scene.add(p);
  }
  scene.add(new THREE.PointLight(0x6633aa, 1, 15));
}

// ==============================
// PLAYER (BOY)
// ==============================
function buildPlayer(scene) {
  const player = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x4a7a3a })
  );
  body.position.y = 1.4;
  body.castShadow = true;
  player.add(body);

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.15, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x6b3a1e })
  );
  belt.position.y = 1.0;
  player.add(belt);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5c6a0 })
  );
  head.position.y = 2.35;
  head.castShadow = true;
  player.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 12, 6, 0, Math.PI*2, 0, Math.PI/2),
    new THREE.MeshStandardMaterial({ color: 0x5c3a1e })
  );
  hair.position.y = 2.4;
  player.add(hair);

  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.6, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x7a4a2a })
  );
  backpack.position.set(0, 1.5, -0.35);
  player.add(backpack);

  // Limb pivots
  const legLPivot = new THREE.Group();
  legLPivot.position.set(-0.2, 0.8, 0);
  legLPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x4a3520 })));
  legLPivot.children[0].position.y = -0.4;
  player.add(legLPivot);

  const legRPivot = new THREE.Group();
  legRPivot.position.set(0.2, 0.8, 0);
  legRPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x4a3520 })));
  legRPivot.children[0].position.y = -0.4;
  player.add(legRPivot);

  const armLPivot = new THREE.Group();
  armLPivot.position.set(-0.55, 1.8, 0);
  armLPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.25), new THREE.MeshStandardMaterial({ color: 0x4a7a3a })));
  armLPivot.children[0].position.y = -0.35;
  player.add(armLPivot);

  const armRPivot = new THREE.Group();
  armRPivot.position.set(0.55, 1.8, 0);
  armRPivot.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.25), new THREE.MeshStandardMaterial({ color: 0x4a7a3a })));
  armRPivot.children[0].position.y = -0.35;
  player.add(armRPivot);

  player.position.set(0, 0, 0);
  scene.add(player);

  return { player, body, legLPivot, legRPivot, armLPivot, armRPivot };
}

// ==============================
// WOODEN BRIDGE
// ==============================
function buildBridge(scene) {
  const bridge = new THREE.Group();
  // Planks
  for (let i = 0; i < 10; i++) {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.1, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.9 })
    );
    plank.position.set(0, 0.05, i*0.55 - 2.5);
    plank.castShadow = true;
    bridge.add(plank);
  }
  // Side rails
  for (let side = -1; side <= 1; side += 2) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.6, 5.5),
      new THREE.MeshStandardMaterial({ color: 0x5c3a1e })
    );
    rail.position.set(side*1.0, 0.35, 0);
    bridge.add(rail);
    // Posts
    for (let p = -2; p <= 2; p++) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e })
      );
      post.position.set(side*1.0, 0.35, p*1.2);
      bridge.add(post);
    }
  }
  bridge.position.set(15, 0, -10);
  bridge.rotation.y = 0.5;
  scene.add(bridge);
}

// ==============================
// BUILD ALL
// ==============================
function buildWorld(scene) {
  buildLighting(scene);
  buildGround(scene);
  buildTrees(scene);
  buildRocks(scene);
  buildMushrooms(scene);
  buildFireflies(scene);
  buildBridge(scene);
  buildSpookyZone(scene);
}
