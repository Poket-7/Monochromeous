/**
 * THE ENTITY // MONOCHROME SURVIVAL HORROR
 * Core Game Engine, Low-Res Pixel Pipeline, Flashlight, Menus & Game Loop
 */

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.state = 'menu'; // 'menu', 'playing', 'paused', 'gameover', 'victory'

    // Pixelated low-resolution render target dimensions
    this.targetRenderHeight = 270; // Authentic retro PS1 resolution (e.g. 480x270 or 360x270)
    this.renderWidth = 480;
    this.renderHeight = 270;

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Camera & Player Orientation
    this.playerPos = new THREE.Vector3(0, 1.6, 0);
    this.cameraYaw = 0;
    this.cameraPitch = 0;
    this.pitchLimit = Math.PI / 2.2;

    // Flashlight & Lighting
    this.flashlight = null;
    this.flashlightTarget = null;
    this.isFlashlightOn = true;
    this.battery = 100.0;
    this.stamina = 100.0;

    // Footstep audio timing
    this.footstepTimer = 0;

    // World & Entity
    this.map = null;
    this.entity = null;
    this.activatedBeacons = 0;
    this.totalBeacons = 4;
    this.exitUnlocked = false;

    // Game stats
    this.gameStartTime = 0;
    this.elapsedSurvivalTime = 0;

    // Clock
    this.clock = new THREE.Clock();

    this.initThree();
    this.bindUIEvents();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Start render loop
    requestAnimationFrame((t) => this.loop(t));
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Thick atmospheric monochrome fog
    this.scene.fog = new THREE.FogExp2(0x000000, 0.07);

    // Camera
    this.camera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 100);
    this.camera.position.copy(this.playerPos);

    // Renderer (preserve low resolution for pixelated retro aesthetic)
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: false,
        powerPreference: "high-performance"
      });
    } catch (e) {
      console.warn("Retrying WebGLRenderer with standard options:", e);
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas
      });
    }
    this.renderer.toneMapping = THREE.NoToneMapping;

    // Very faint monochrome ambient light
    const ambientLight = new THREE.AmbientLight(0x161616);
    this.scene.add(ambientLight);

    // Player Flashlight (Focused monochrome beam)
    this.flashlight = new THREE.SpotLight(0xffffff, 4.5, 34, Math.PI / 5.2, 0.4, 1.3);
    this.flashlight.position.copy(this.camera.position);
    this.flashlightTarget = new THREE.Object3D();
    this.scene.add(this.flashlightTarget);
    this.flashlight.target = this.flashlightTarget;
    this.scene.add(this.flashlight);

    // Flashlight bulb ambient halo
    this.flashlightGlow = new THREE.PointLight(0xffffff, 0.8, 4);
    this.scene.add(this.flashlightGlow);

    // Build World Map
    this.map = new WorldMap(this.scene);
    this.playerPos.set(this.map.playerSpawn.x, 1.6, this.map.playerSpawn.z);
    this.camera.position.copy(this.playerPos);

    // Spawn Entity
    this.entity = new Entity(this.scene, this.map);
  }

  resizeCanvas() {
    const aspect = window.innerWidth / window.innerHeight;
    this.renderHeight = this.targetRenderHeight;
    this.renderWidth = Math.floor(this.renderHeight * aspect);

    // Render at low internal buffer, CSS stretches it with crisp pixelated rendering
    this.renderer.setSize(this.renderWidth, this.renderHeight, false);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  bindUIEvents() {
    // Fast, reliable tap and click dispatcher for mobile and desktop
    const addTap = (id, handler) => {
      const el = document.getElementById(id);
      if (!el) return;
      let touchStart = 0;
      let startX = 0, startY = 0;
      let moved = false;

      el.addEventListener('touchstart', (e) => {
        touchStart = performance.now();
        moved = false;
        if (e.touches && e.touches.length > 0) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        }
      }, { passive: true });

      el.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length > 0) {
          const dx = Math.abs(e.touches[0].clientX - startX);
          const dy = Math.abs(e.touches[0].clientY - startY);
          if (dx > 15 || dy > 15) {
            moved = true;
          }
        }
      }, { passive: true });

      el.addEventListener('touchend', (e) => {
        if (!moved && (performance.now() - touchStart < 650)) {
          e.preventDefault();
          handler(e);
        }
      });

      el.addEventListener('click', (e) => {
        if (performance.now() - touchStart > 650) {
          handler(e);
        }
      });
    };

    // Main Menu Buttons
    addTap('btn-start', () => {
      try {
        if (window.soundEngine) {
          window.soundEngine.init();
          window.soundEngine.resume();
        }
      } catch (err) {
        console.warn("Audio initialization notice:", err);
      }
      this.startGame();
    });

    addTap('btn-credits', () => {
      document.getElementById('credits-modal').classList.remove('hidden');
    });

    addTap('btn-close-credits', () => {
      document.getElementById('credits-modal').classList.add('hidden');
    });

    addTap('btn-instructions', () => {
      document.getElementById('instructions-modal').classList.remove('hidden');
    });

    addTap('btn-close-instructions', () => {
      document.getElementById('instructions-modal').classList.add('hidden');
    });

    // Pause Controls
    addTap('btn-pause', () => this.pauseGame());

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.state === 'playing') {
          this.pauseGame();
        } else if (this.state === 'paused') {
          this.resumeGame();
        }
      }
    });

    addTap('btn-resume', () => this.resumeGame());
    addTap('btn-restart-pause', () => this.restartGame());
    addTap('btn-credits-pause', () => {
      document.getElementById('credits-modal').classList.remove('hidden');
    });

    addTap('btn-toggle-sound', () => {
      const toggleSoundBtn = document.getElementById('btn-toggle-sound');
      const isUnmuted = window.soundEngine.toggleMute();
      toggleSoundBtn.textContent = isUnmuted ? "AUDIO: ON" : "AUDIO: MUTED";
    });

    addTap('btn-quit', () => this.returnToMenu());

    // Game Over & Victory Buttons
    addTap('btn-retry', () => this.restartGame());
    addTap('btn-gameover-menu', () => this.returnToMenu());
    addTap('btn-play-again', () => this.restartGame());
    addTap('btn-victory-menu', () => this.returnToMenu());
  }

  startGame() {
    this.state = 'playing';
    this.gameStartTime = performance.now();
    this.activatedBeacons = 0;
    this.exitUnlocked = false;
    this.battery = 100.0;
    this.stamina = 100.0;
    this.isFlashlightOn = true;

    // Reset Map Beacons
    this.map.beacons.forEach(b => {
      b.active = false;
      b.spireMesh.material = this.map.materials.beaconOff;
      b.ringMesh.material = this.map.materials.beaconOff;
      if (b.light) {
        this.scene.remove(b.light);
        b.light = null;
      }
    });

    // Reset Exit Gate
    if (this.map.exitGateMesh) {
      this.map.exitGateMesh.material = this.map.materials.exitLocked;
    }
    if (this.map.exitLight) {
      this.map.exitLight.color.setHex(0x444444);
      this.map.exitLight.intensity = 1.5;
    }

    // Reset Player
    this.playerPos.set(this.map.playerSpawn.x, 1.6, this.map.playerSpawn.z);
    this.cameraYaw = 0;
    this.cameraPitch = 0;

    // Reset Entity
    this.entity.reset();

    // UI Updates
    document.getElementById('main-menu').classList.remove('active');
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('touch-controls').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('beacon-counter').textContent = `0 / ${this.totalBeacons}`;
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    document.getElementById('pause-menu').classList.remove('hidden');
    if (document.exitPointerLock) document.exitPointerLock();
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('credits-modal').classList.add('hidden');
  }

  restartGame() {
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    this.startGame();
  }

  returnToMenu() {
    this.state = 'menu';
    document.getElementById('pause-menu').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('victory-screen').classList.add('hidden');
    document.getElementById('credits-modal').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('touch-controls').classList.add('hidden');
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('main-menu').classList.add('active');
    this.entity.reset();
  }

  triggerGameOver() {
    this.state = 'gameover';
    if (window.soundEngine) {
      window.soundEngine.playJumpscare();
    }
    if (document.exitPointerLock) document.exitPointerLock();

    const gameOverScreen = document.getElementById('game-over-screen');
    gameOverScreen.classList.remove('hidden');

    const glitchOverlay = document.getElementById('static-glitch-overlay');
    glitchOverlay.classList.add('intense');
    setTimeout(() => {
      glitchOverlay.classList.remove('intense');
      glitchOverlay.style.opacity = '0';
    }, 2000);
  }

  triggerVictory() {
    this.state = 'victory';
    if (window.soundEngine) {
      window.soundEngine.playBeaconActivation();
    }
    if (document.exitPointerLock) document.exitPointerLock();

    const elapsedSeconds = Math.floor((performance.now() - this.gameStartTime) / 1000);
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = (elapsedSeconds % 60).toString().padStart(2, '0');
    document.getElementById('stat-time').textContent = `${mins}:${secs}`;

    document.getElementById('victory-screen').classList.remove('hidden');
  }

  updatePlayer(delta) {
    const input = window.inputController;

    // 1. Camera Look (Pitch and Yaw)
    const look = input.consumeLookDelta();
    this.cameraYaw += look.yaw;
    this.cameraPitch = Math.max(-this.pitchLimit, Math.min(this.pitchLimit, this.cameraPitch + look.pitch));

    // 2. Flashlight Toggle
    if (input.checkFlashlightToggle()) {
      this.isFlashlightOn = !this.isFlashlightOn;
      window.soundEngine.playFlashlightClick();
    }

    // Battery Drain / Regeneration
    if (this.isFlashlightOn) {
      this.battery = Math.max(0, this.battery - delta * 1.6);
      if (this.battery <= 0) {
        this.isFlashlightOn = false;
      }
    } else {
      this.battery = Math.min(100, this.battery + delta * 2.5);
    }

    // Flashlight flicker effect
    let flickerFactor = 1.0;
    if (this.isFlashlightOn && this.battery < 25 && Math.random() < 0.15) {
      flickerFactor = 0.2;
    }

    this.flashlight.intensity = this.isFlashlightOn ? 4.5 * flickerFactor : 0;
    this.flashlightGlow.intensity = this.isFlashlightOn ? 0.8 * flickerFactor : 0;

    // 3. Movement
    const move = input.getMovement();
    let moveSpeed = 4.2;

    // Sprint mechanics
    if (move.isSprinting && (move.x !== 0 || move.y !== 0) && this.stamina > 5) {
      moveSpeed = 7.6;
      this.stamina = Math.max(0, this.stamina - delta * 22);
    } else {
      this.stamina = Math.min(100, this.stamina + delta * 14);
    }

    // Calculate movement in world space relative to camera yaw
    const forwardX = -Math.sin(this.cameraYaw);
    const forwardZ = -Math.cos(this.cameraYaw);
    const rightX = Math.cos(this.cameraYaw);
    const rightZ = -Math.sin(this.cameraYaw);

    // Invert move.y so dragging joystick UP / pressing W moves forward along camera facing vector
    const forward = -move.y;
    const strafe = move.x;

    const vx = (forwardX * forward + rightX * strafe) * moveSpeed;
    const vz = (forwardZ * forward + rightZ * strafe) * moveSpeed;

    const isMoving = Math.abs(vx) > 0.05 || Math.abs(vz) > 0.05;

    // Footstep audio
    if (isMoving) {
      const stepInterval = move.isSprinting ? 0.32 : 0.52;
      this.footstepTimer += delta;
      if (this.footstepTimer >= stepInterval) {
        window.soundEngine.playFootstep(move.isSprinting);
        this.footstepTimer = 0;
      }
    } else {
      this.footstepTimer = 0;
    }

    // Integrate position with collision resolution
    let targetX = this.playerPos.x + vx * delta;
    let targetZ = this.playerPos.z + vz * delta;

    const resolved = this.map.resolveCollision(targetX, targetZ, 0.65);
    this.playerPos.x = resolved.x;
    this.playerPos.z = resolved.z;

    // Head bobbing when walking
    let bobY = 1.6;
    if (isMoving) {
      bobY += Math.sin(performance.now() * 0.012) * 0.05;
    }
    this.playerPos.y = bobY;

    // Update Camera
    this.camera.position.copy(this.playerPos);

    // Camera rotation using Euler angles
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.cameraPitch;
    euler.y = this.cameraYaw;
    this.camera.quaternion.setFromEuler(euler);

    // Update Flashlight orientation
    this.flashlight.position.copy(this.playerPos);
    this.flashlightGlow.position.copy(this.playerPos);

    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.flashlightTarget.position.copy(this.playerPos).add(dir.multiplyScalar(10));

    // 4. Beacon & Exit Gate Interaction
    this.checkBeaconInteraction(input);
    this.checkExitGate();

    // 5. Update HUD elements
    document.getElementById('battery-bar').style.width = `${this.battery}%`;
    document.getElementById('stamina-bar').style.width = `${this.stamina}%`;
  }

  checkBeaconInteraction(input) {
    let nearestBeacon = null;
    let minDist = 3.6;

    for (let i = 0; i < this.map.beacons.length; i++) {
      const b = this.map.beacons[i];
      if (b.active) continue;
      const d = Math.hypot(b.x - this.playerPos.x, b.z - this.playerPos.z);
      if (d < minDist) {
        minDist = d;
        nearestBeacon = b;
      }
    }

    const prompt = document.getElementById('interaction-prompt');
    const actionInteractBtn = document.getElementById('btn-action-interact');

    if (nearestBeacon) {
      prompt.classList.remove('hidden');
      if (actionInteractBtn) actionInteractBtn.classList.remove('hidden');

      if (input.checkInteract()) {
        if (this.map.activateBeacon(nearestBeacon)) {
          this.activatedBeacons++;
          window.soundEngine.playBeaconActivation();
          document.getElementById('beacon-counter').textContent = `${this.activatedBeacons} / ${this.totalBeacons}`;

          if (this.activatedBeacons >= this.totalBeacons) {
            this.exitUnlocked = true;
            this.map.unlockExit();
            prompt.textContent = "⚡ ALL BEACONS RESTORED! BLAST GATE UNLOCKED ⚡";
            setTimeout(() => {
              prompt.textContent = "[TAP / PRESS E TO ACTIVATE BEACON]";
            }, 3500);
          }
        }
      }
    } else {
      prompt.classList.add('hidden');
      if (actionInteractBtn) actionInteractBtn.classList.add('hidden');
    }
  }

  checkExitGate() {
    if (!this.exitUnlocked) return;
    const gatePos = this.map.exitGatePosition;
    const dist = Math.hypot(gatePos.x - this.playerPos.x, gatePos.z - this.playerPos.z);
    if (dist < 2.5) {
      this.triggerVictory();
    }
  }

  loop() {
    requestAnimationFrame((t) => this.loop(t));

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.state === 'playing') {
      this.updatePlayer(delta);
      this.map.update(delta);
      this.entity.update(delta, this.playerPos, this.isFlashlightOn);
    } else if (this.state === 'menu') {
      // Atmospheric slow rotation for the main menu backdrop
      this.cameraYaw += delta * 0.08;
      const euler = new THREE.Euler(0, this.cameraYaw, 0, 'YXZ');
      this.camera.quaternion.setFromEuler(euler);
      this.map.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate game on load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
