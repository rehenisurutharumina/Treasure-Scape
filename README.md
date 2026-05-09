# Treasure Escape


## Description
Treasure Escape is a simple 2D/3D browser adventure game where a boy runs through a lush fantasy jungle treasure environment. The goal is to reach the treasure chest while avoiding a realistic, terrifying ghost that is constantly following you.

## Live Demo / Running URLs
http://localhost:8000
http://localhost:8000/3d/



## Game Story
In the heart of a lush fantasy jungle lies an ancient treasure land, guarding unimaginable riches. A brave young boy embarks on an adventure to claim the ultimate prize—the legendary Treasure Chest. However, the treasure is cursed, guarded by a realistic and terrifying ghost that relentlessly chases any intruder. The boy must navigate through the jungle, outrun the ghost, and secure the treasure to survive and win the game.

## Features
- Dynamic chase mechanics with a ghost constantly tracking the player.
- Lush fantasy jungle treasure environment.
- Supports both a 2D version and an immersive 3D version.
- Score calculation based on survival time or game progress.
- Win/Loss conditions based on interacting with the treasure or getting caught.

## Gameplay Rules
1. The player must reach the treasure chest to win.
2. The ghost automatically follows the boy throughout the game.
3. If the ghost catches (touches) the boy, the game shows "Game Over".
4. If the boy successfully reaches the treasure chest, the game shows "You Win".
5. The score is calculated based on survival time or progress.

## Controls
- **Movement:** Use the Arrow Keys or W, A, S, D to move the boy around the environment.
- **Goal:** Navigate towards the treasure chest and keep moving away from the ghost!

## Technology Stack
- HTML
- CSS
- JavaScript
- Three.js (if the game is 3D)
- *No Unity used*

## Folder Structure

```text
TreasureEscape/
│
├── index.html
├── style.css
├── game.js
│
├── assets/
│   ├── images/
│   │   ├── boy.png
│   │   ├── ghost.png
│   │   ├── treasure.png
│   │   └── background.png
│   │
│   ├── sounds/
│   │   ├── game-over.mp3
│   │   ├── win.mp3
│   │   └── background-music.mp3
│
└── README.md
```

## Setup and Run Instructions
1. Download or clone this repository to your local machine.
2. Navigate to the project folder.
3. Open `index.html` in any modern web browser (like Chrome, Firefox, or Edge).
4. Enjoy the game! 

*(Alternatively, you can run a local web server to view the game, such as `python -m http.server` and visit `http://localhost:8000`)*

## Screenshots
![Gameplay Screenshot 1](assets/images/placeholder-screenshot1.png)
*Description: The boy running through the fantasy jungle.*

![Gameplay Screenshot 2](assets/images/placeholder-screenshot2.png)
*Description: Being chased by the ghost.*

## Future Improvements
- Add multiple levels with increasing difficulty.
- Implement power-ups (like speed boosts or temporary shields).
- Add more obstacle types to the jungle environment.
- Enhance sound effects and background music.
- Add mobile touch controls.



