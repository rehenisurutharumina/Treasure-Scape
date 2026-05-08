// ============================================
// TREASURE ESCAPE — Complete Game Logic
// A simple 2D browser game: reach the treasure
// before the ghost catches you!
//
// Features:
//   - Arrow keys / WASD movement
//   - Ghost AI that follows the boy
//   - Rectangle collision detection
//   - Wall obstacles (boy blocked, ghost passes through)
//   - Score increases every second
//   - Increasing difficulty (Easy → Medium → Hard)
//   - Restart button (works after Game Over and Win)
//   - Level progression
//
// No external libraries. Opens directly in a browser.
// ============================================


// ==============================
// SECTION 1: DOM REFERENCES
// ==============================
// These grab the HTML elements we need to update during the game.

const gameArea      = document.getElementById('game-area');
const scoreEl       = document.getElementById('score');
const levelEl       = document.getElementById('level');
const timerEl       = document.getElementById('timer');
const difficultyEl  = document.getElementById('difficulty');
const overlay       = document.getElementById('overlay');
const overlayEmoji  = document.getElementById('overlay-emoji');
const statusText    = document.getElementById('status-text');
const statusSub     = document.getElementById('status-sub');


// ==============================
// SECTION 2: GAME SETTINGS
// ==============================
// These values control sizes, speeds, and the game area dimensions.

const PLAYER_SIZE   = 40;   // Width & height of the boy (px)
const GHOST_SIZE    = 40;   // Width & height of the ghost (px)
const TREASURE_SIZE = 36;   // Width & height of the treasure (px)
const PLAYER_SPEED  = 4;    // How fast the boy moves (px per frame)

// We read the actual game area size from CSS so everything stays in sync.
let GAME_WIDTH  = gameArea.clientWidth;
let GAME_HEIGHT = gameArea.clientHeight;


// ==============================
// SECTION 3: GAME STATE VARIABLES
// ==============================
// Variables that track what's happening in the game right now.

let playerX, playerY;       // Boy position (x, y coordinates)
let ghostX, ghostY;         // Ghost position (x, y coordinates)
let treasureX, treasureY;   // Treasure position (x, y coordinates)
let ghostSpeed;             // Ghost speed (changes with difficulty)
let score    = 0;           // Score — increases every second while alive
let level    = 1;           // Current level number
let time     = 0;           // Elapsed time in seconds
let gameOver = false;       // Is the game finished? (true = stopped)
let animationId    = null;  // ID for the game loop (so we can stop it)
let timerInterval  = null;  // ID for the timer interval
let scoreInterval  = null;  // ID for the score interval

// Track which keys are currently pressed (supports multiple keys at once).
const keysPressed = {};


// ==============================
// SECTION 4: CREATE GAME ENTITIES
// ==============================
// We create HTML elements for the boy, ghost, and treasure.
// Each one gets positioned absolutely inside the game area.

/**
 * createEntity — helper to make a game object (div) and add it to the game area.
 * @param {string} emoji - Fallback emoji character (hidden when images load).
 * @param {string} className - CSS class for styling (player, ghost, or treasure).
 * @returns {HTMLElement} - The created DOM element.
 */
function createEntity(emoji, className) {
  const el = document.createElement('div');
  el.classList.add('entity', className);
  el.textContent = emoji;
  gameArea.appendChild(el);
  return el;
}

// Create the three game objects.
// Emoji is fallback text; images load via CSS from the assets/ folder.
const playerEl   = createEntity('🧍', 'player');    // Boy   → assets/boy.png
const ghostEl    = createEntity('👻', 'ghost');      // Ghost → assets/ghost.png
const treasureEl = createEntity('💎', 'treasure');   // Gem   → assets/treasure.png


// ==============================
// SECTION 5: WALL OBSTACLES
// ==============================
// Walls are rectangular blocks placed inside the game area.
// The boy CANNOT pass through walls (he gets pushed back).
// The ghost CAN pass through walls (keeps things simple for beginners).
//
// Each wall is defined by: { x, y, w, h }
//   x = left position (px from left edge)
//   y = top position  (px from top edge)
//   w = width of the wall (px)
//   h = height of the wall (px)

const walls = [
  { x: 150, y: 100, w: 20, h: 150 },   // Wall 1: vertical, left area
  { x: 350, y: 50,  w: 20, h: 200 },   // Wall 2: vertical, center
  { x: 200, y: 300, w: 200, h: 20 },   // Wall 3: horizontal, lower area
  { x: 500, y: 150, w: 20, h: 200 },   // Wall 4: vertical, right area
];

// Create wall DOM elements and place them in the game area.
// Each wall is a styled div with the "wall" CSS class (brown blocks).
const wallElements = [];
walls.forEach((wall) => {
  const el = document.createElement('div');
  el.classList.add('wall');
  el.style.left   = wall.x + 'px';
  el.style.top    = wall.y + 'px';
  el.style.width  = wall.w + 'px';
  el.style.height = wall.h + 'px';
  gameArea.appendChild(el);
  wallElements.push(el);
});


// ==============================
// SECTION 6: HELPER FUNCTIONS
// ==============================

// --- Random position within the game area ---
// Makes sure the entity doesn't go outside the boundaries.
function randomPos(entitySize) {
  const x = Math.random() * (GAME_WIDTH  - entitySize);
  const y = Math.random() * (GAME_HEIGHT - entitySize);
  return { x, y };
}

// --- Check if a position overlaps any wall ---
// Returns true if a rectangle at (x, y) with the given size touches a wall.
function overlapsAnyWall(x, y, size) {
  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i];
    if (
      x < wall.x + wall.w &&
      x + size > wall.x &&
      y < wall.y + wall.h &&
      y + size > wall.y
    ) {
      return true;  // Overlapping a wall!
    }
  }
  return false;
}

// --- Distance between two points ---
// Uses the Pythagorean theorem.
function distance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}


// ==============================
// SECTION 7: PLACE ENTITIES
// ==============================
// Puts the boy, ghost, and treasure at random spots.
// Ensures nothing spawns on a wall or too close to each other.

function placeEntities() {
  // Update dimensions in case window was resized
  GAME_WIDTH  = gameArea.clientWidth;
  GAME_HEIGHT = gameArea.clientHeight;

  // Boy: random position, not on a wall
  let pPos;
  do {
    pPos = randomPos(PLAYER_SIZE);
  } while (overlapsAnyWall(pPos.x, pPos.y, PLAYER_SIZE));
  playerX = pPos.x;
  playerY = pPos.y;

  // Ghost: far from boy, not on a wall
  let gPos;
  do {
    gPos = randomPos(GHOST_SIZE);
  } while (
    distance(gPos.x, gPos.y, playerX, playerY) < 200 ||
    overlapsAnyWall(gPos.x, gPos.y, GHOST_SIZE)
  );
  ghostX = gPos.x;
  ghostY = gPos.y;

  // Treasure: not too close to boy or ghost, not on a wall
  let tPos;
  do {
    tPos = randomPos(TREASURE_SIZE);
  } while (
    distance(tPos.x, tPos.y, playerX, playerY) < 150 ||
    distance(tPos.x, tPos.y, ghostX, ghostY) < 150 ||
    overlapsAnyWall(tPos.x, tPos.y, TREASURE_SIZE)
  );
  treasureX = tPos.x;
  treasureY = tPos.y;
}


// ==============================
// SECTION 8: RENDER
// ==============================
// Moves the HTML elements to match the current game-state coordinates.

function render() {
  playerEl.style.left   = playerX + 'px';
  playerEl.style.top    = playerY + 'px';

  ghostEl.style.left    = ghostX + 'px';
  ghostEl.style.top     = ghostY + 'px';

  treasureEl.style.left = treasureX + 'px';
  treasureEl.style.top  = treasureY + 'px';
}


// ==============================
// SECTION 9: PLAYER MOVEMENT
// ==============================
// Reads keyboard input and moves the boy.
// The boy CANNOT move outside the game area.
// The boy CANNOT pass through walls.

function movePlayer() {
  // Save previous position (to undo if hitting a wall)
  const prevX = playerX;
  const prevY = playerY;

  // Move UP (Arrow Up or W key)
  if (keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['W']) {
    playerY -= PLAYER_SPEED;
  }
  // Move DOWN (Arrow Down or S key)
  if (keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['S']) {
    playerY += PLAYER_SPEED;
  }
  // Move LEFT (Arrow Left or A key)
  if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) {
    playerX -= PLAYER_SPEED;
  }
  // Move RIGHT (Arrow Right or D key)
  if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) {
    playerX += PLAYER_SPEED;
  }

  // Keep boy inside the game area boundaries
  playerX = Math.max(0, Math.min(GAME_WIDTH  - PLAYER_SIZE, playerX));
  playerY = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, playerY));

  // WALL COLLISION: if boy hits a wall, push back to previous position
  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i];
    const hitting = (
      playerX < wall.x + wall.w &&
      playerX + PLAYER_SIZE > wall.x &&
      playerY < wall.y + wall.h &&
      playerY + PLAYER_SIZE > wall.y
    );
    if (hitting) {
      playerX = prevX;
      playerY = prevY;
      break;
    }
  }
}


// ==============================
// SECTION 10: GHOST AI
// ==============================
// Simple path-following AI. The ghost compares its position to the boy's
// and moves towards him one step at a time.
//
// How it works:
//   - If ghost is LEFT of boy  → increase ghostX (move right)
//   - If ghost is RIGHT of boy → decrease ghostX (move left)
//   - If ghost is ABOVE boy    → increase ghostY (move down)
//   - If ghost is BELOW boy    → decrease ghostY (move up)
//
// ghostSpeed is always SLOWER than PLAYER_SPEED so the boy can outrun him.
// The ghost passes through walls (keeps things simple).

function moveGhost() {
  // Horizontal axis
  if (ghostX < playerX) {
    ghostX += ghostSpeed;   // Move right towards boy
  } else if (ghostX > playerX) {
    ghostX -= ghostSpeed;   // Move left towards boy
  }

  // Vertical axis
  if (ghostY < playerY) {
    ghostY += ghostSpeed;   // Move down towards boy
  } else if (ghostY > playerY) {
    ghostY -= ghostSpeed;   // Move up towards boy
  }
}


// ==============================
// SECTION 11: COLLISION DETECTION
// ==============================
// Checks if two rectangles are overlapping (touching).
//
// Each entity is a rectangle with position (x, y) and size (width, height).
// Two rectangles collide if they overlap on BOTH axes:
//   1. Rect1's right edge > Rect2's left edge
//   2. Rect1's left edge  < Rect2's right edge
//   3. Rect1's bottom     > Rect2's top
//   4. Rect1's top        < Rect2's bottom

function checkCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
  return (
    x1 + w1 > x2 &&
    x1 < x2 + w2 &&
    y1 + h1 > y2 &&
    y1 < y2 + h2
  );
}


// ==============================
// SECTION 12: SHOW OVERLAY
// ==============================
// Displays the Game Over or Win screen with the final score message.

function showOverlay(type) {
  overlay.classList.remove('hidden');

  if (type === 'win') {
    overlayEmoji.textContent = '🎉';
    statusText.textContent   = 'You Win! Treasure found!';
    statusText.className     = 'win';
    statusSub.textContent    = `Level ${level} complete! Final Score: ${score} | Time: ${time}s`;
  } else {
    overlayEmoji.textContent = '💀';
    statusText.textContent   = 'Game Over! Ghost caught you!';
    statusText.className     = 'lose';
    statusSub.textContent    = `Final Score: ${score} | Level: ${level} | Time: ${time}s`;
  }
}


// ==============================
// SECTION 13: NEXT LEVEL
// ==============================
// Called when the boy grabs the treasure. Advances to the next level.

function nextLevel() {
  level++;
  levelEl.textContent = level;

  // Brief pause, then continue
  setTimeout(() => {
    overlay.classList.add('hidden');
    placeEntities();
    render();
    gameOver = false;
    gameLoop();
  }, 1500);
}


// ==============================
// SECTION 14: INCREASING DIFFICULTY
// ==============================
// As the score increases, the ghost gets faster.
//
//   Score 0   to 100  →  ghostSpeed = 1    →  Easy   (green)
//   Score 110 to 200  →  ghostSpeed = 1.5  →  Medium (orange)
//   Score 210 and up  →  ghostSpeed = 2    →  Hard   (red)

function updateDifficulty() {
  if (score <= 100) {
    ghostSpeed = 1;
    difficultyEl.textContent = 'Easy';
    difficultyEl.className   = 'easy';
  } else if (score <= 200) {
    ghostSpeed = 1.5;
    difficultyEl.textContent = 'Medium';
    difficultyEl.className   = 'medium';
  } else {
    ghostSpeed = 2;
    difficultyEl.textContent = 'Hard';
    difficultyEl.className   = 'hard';
  }
}


// ==============================
// SECTION 15: MAIN GAME LOOP
// ==============================
// This runs ~60 times per second using requestAnimationFrame().
// It updates positions, checks collisions, and redraws the scene.

function gameLoop() {
  if (gameOver) return;

  // 1. Move the boy based on keyboard input
  movePlayer();

  // 2. Move the ghost towards the boy
  moveGhost();

  // 3. Draw everything at updated positions
  render();

  // 4. COLLISION: Boy vs Ghost → Game Over
  if (checkCollision(
    playerX, playerY, PLAYER_SIZE, PLAYER_SIZE,
    ghostX,  ghostY,  GHOST_SIZE,  GHOST_SIZE
  )) {
    gameOver = true;
    clearInterval(timerInterval);
    clearInterval(scoreInterval);
    showOverlay('lose');
    return;
  }

  // 5. COLLISION: Boy vs Treasure → You Win
  if (checkCollision(
    playerX,   playerY,   PLAYER_SIZE,   PLAYER_SIZE,
    treasureX, treasureY, TREASURE_SIZE, TREASURE_SIZE
  )) {
    gameOver = true;
    clearInterval(timerInterval);
    clearInterval(scoreInterval);
    showOverlay('win');
    nextLevel();
    return;
  }

  // 6. Request the next frame (~60fps loop)
  animationId = requestAnimationFrame(gameLoop);
}


// ==============================
// SECTION 16: START THE GAME
// ==============================
// Initializes all game state and begins the loop.

function startGame() {
  // Reset game state
  gameOver   = false;
  time       = 0;
  ghostSpeed = 1;

  // Reset difficulty display
  difficultyEl.textContent = 'Easy';
  difficultyEl.className   = 'easy';

  timerEl.textContent = time;
  overlay.classList.add('hidden');

  // Place boy, ghost, and treasure at random positions
  placeEntities();
  render();

  // SCORE SYSTEM: +10 points every second while alive
  // Stops when ghost catches boy OR boy finds treasure
  clearInterval(scoreInterval);
  scoreInterval = setInterval(() => {
    if (!gameOver) {
      score += 10;
      scoreEl.textContent = score;
      updateDifficulty();   // Check if difficulty should increase
    }
  }, 1000);

  // TIMER: counts up every second
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (!gameOver) {
      time++;
      timerEl.textContent = time;
    }
  }, 1000);

  // Start the game loop
  gameLoop();
}


// ==============================
// SECTION 17: RESTART THE GAME
// ==============================
// Called when the player clicks "Restart Game" or "Play Again".
// Works after BOTH Game Over and You Win.
//
// What gets reset:
//   1. Boy position    → new random spot
//   2. Ghost position  → new random spot (far from boy)
//   3. Score           → reset to 0
//   4. Game status     → gameOver = false, overlay hidden
//   5. Level & Timer   → reset to 1 and 0

function restartGame() {
  // Stop everything
  cancelAnimationFrame(animationId);
  clearInterval(timerInterval);
  clearInterval(scoreInterval);

  // Reset score and level
  score = 0;
  scoreEl.textContent = score;
  level = 1;
  levelEl.textContent = level;

  // Start fresh
  startGame();
}


// ==============================
// SECTION 18: KEYBOARD INPUT
// ==============================
// Track key presses and releases for smooth movement.
// Supports holding multiple keys (e.g., diagonal movement).

document.addEventListener('keydown', (e) => {
  keysPressed[e.key] = true;

  // Prevent the page from scrolling when arrow keys are pressed
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  keysPressed[e.key] = false;
});


// ==============================
// SECTION 19: WINDOW RESIZE
// ==============================
// Update game area dimensions if the window is resized.

window.addEventListener('resize', () => {
  GAME_WIDTH  = gameArea.clientWidth;
  GAME_HEIGHT = gameArea.clientHeight;
});


// ==============================
// SECTION 20: LAUNCH THE GAME
// ==============================
// Start the game when the page loads!

startGame();
