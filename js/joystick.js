/**
 * THE ENTITY // MONOCHROME SURVIVAL HORROR
 * Dual Control Engine:
 * - Left visible virtual joystick for movement (forward/back/strafe)
 * - Right side screen drag area for camera look/rotation
 * - Desktop keyboard (WASD/Arrows) & Mouse PointerLock integration
 */

class InputController {
  constructor() {
    // Movement vector: -1 to 1 for X (strafe) and Y (forward/backward)
    this.moveVector = { x: 0, y: 0 };
    // Camera rotation delta (pitch and yaw in radians)
    this.lookDelta = { yaw: 0, pitch: 0 };

    this.sprint = false;
    this.interactPressed = false;
    this.flashlightToggleRequested = false;

    // Joystick DOM Elements
    this.joystickZone = document.getElementById('joystick-zone');
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickKnob = document.getElementById('joystick-knob');
    this.lookZone = document.getElementById('look-zone');

    // Action buttons
    this.btnSprint = document.getElementById('btn-action-sprint');
    this.btnFlashlight = document.getElementById('btn-action-flashlight');
    this.btnInteract = document.getElementById('btn-action-interact');

    // Touch tracking state
    this.joystickTouchId = null;
    this.lookTouchId = null;
    this.joystickCenter = { x: 0, y: 0 };
    this.maxJoystickRadius = 45; // Max knob offset in px

    this.lastLookTouch = { x: 0, y: 0 };

    // Desktop keyboard state
    this.keys = {
      KeyW: false, KeyS: false, KeyA: false, KeyD: false,
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
      ShiftLeft: false, ShiftRight: false,
      KeyE: false, Space: false, KeyF: false
    };

    this.isPointerLocked = false;
    this.initListeners();
  }

  initListeners() {
    // -------------------------------------------------------------
    // 1. Visible Left Joystick Touch Handling
    // -------------------------------------------------------------
    const updateJoystickPosition = (clientX, clientY) => {
      const dx = clientX - this.joystickCenter.x;
      const dy = clientY - this.joystickCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let clampedX = dx;
      let clampedY = dy;
      if (dist > this.maxJoystickRadius) {
        clampedX = (dx / dist) * this.maxJoystickRadius;
        clampedY = (dy / dist) * this.maxJoystickRadius;
      }

      this.joystickKnob.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
      // Normalized output: x (-1 to 1), y (-1 is forward, 1 is backward)
      this.moveVector.x = clampedX / this.maxJoystickRadius;
      this.moveVector.y = clampedY / this.maxJoystickRadius;
    };

    const resetJoystick = () => {
      this.joystickTouchId = null;
      this.joystickKnob.style.transform = 'translate(0px, 0px)';
      this.moveVector.x = 0;
      this.moveVector.y = 0;
    };

    // Calculate joystick center on start
    const setJoystickCenter = () => {
      if (this.joystickBase) {
        const rect = this.joystickBase.getBoundingClientRect();
        this.joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      }
    };
    setJoystickCenter();
    window.addEventListener('resize', setJoystickCenter);

    // Joystick Touch events
    if (this.joystickZone) {
      this.joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.joystickTouchId !== null) return;
        setJoystickCenter();
        const touch = e.changedTouches[0];
        this.joystickTouchId = touch.identifier;
        updateJoystickPosition(touch.clientX, touch.clientY);
      }, { passive: false });

      this.joystickZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.joystickTouchId) {
            updateJoystickPosition(touch.clientX, touch.clientY);
            break;
          }
        }
      }, { passive: false });

      const handleTouchEnd = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.joystickTouchId) {
            resetJoystick();
            break;
          }
        }
      };

      this.joystickZone.addEventListener('touchend', handleTouchEnd);
      this.joystickZone.addEventListener('touchcancel', handleTouchEnd);
    }

    // -------------------------------------------------------------
    // 2. Right Side Touch Zone for Camera Look
    // -------------------------------------------------------------
    if (this.lookZone) {
      this.lookZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.lookTouchId !== null) return;
        const touch = e.changedTouches[0];
        this.lookTouchId = touch.identifier;
        this.lastLookTouch = { x: touch.clientX, y: touch.clientY };
      }, { passive: false });

      this.lookZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.lookTouchId) {
            const dx = touch.clientX - this.lastLookTouch.x;
            const dy = touch.clientY - this.lastLookTouch.y;

            // Sensitivity factor for mobile swipe
            const sensitivity = 0.0055;
            this.lookDelta.yaw -= dx * sensitivity;
            this.lookDelta.pitch -= dy * sensitivity;

            this.lastLookTouch = { x: touch.clientX, y: touch.clientY };
            break;
          }
        }
      }, { passive: false });

      const handleLookTouchEnd = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.lookTouchId) {
            this.lookTouchId = null;
            break;
          }
        }
      };

      this.lookZone.addEventListener('touchend', handleLookTouchEnd);
      this.lookZone.addEventListener('touchcancel', handleLookTouchEnd);
    }

    // -------------------------------------------------------------
    // 3. Action Buttons (Mobile)
    // -------------------------------------------------------------
    if (this.btnSprint) {
      const startSprint = (e) => {
        e.preventDefault();
        this.sprint = true;
        this.btnSprint.classList.add('active');
      };
      const endSprint = (e) => {
        e.preventDefault();
        this.sprint = false;
        this.btnSprint.classList.remove('active');
      };
      this.btnSprint.addEventListener('touchstart', startSprint);
      this.btnSprint.addEventListener('touchend', endSprint);
      this.btnSprint.addEventListener('mousedown', startSprint);
      this.btnSprint.addEventListener('mouseup', endSprint);
    }

    if (this.btnFlashlight) {
      this.btnFlashlight.addEventListener('click', (e) => {
        e.preventDefault();
        this.flashlightToggleRequested = true;
      });
      this.btnFlashlight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.flashlightToggleRequested = true;
      });
    }

    if (this.btnInteract) {
      this.btnInteract.addEventListener('click', (e) => {
        e.preventDefault();
        this.interactPressed = true;
      });
      this.btnInteract.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.interactPressed = true;
      });
    }

    // -------------------------------------------------------------
    // 4. Desktop Keyboard & Mouse Fallback
    // -------------------------------------------------------------
    window.addEventListener('keydown', (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = true;
      }
      if (e.code === 'KeyF') {
        this.flashlightToggleRequested = true;
      }
      if (e.code === 'KeyE' || e.code === 'Space') {
        this.interactPressed = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.code)) {
        this.keys[e.code] = false;
      }
    });

    // Pointer Lock for immersive desktop mouse look
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      canvas.addEventListener('click', () => {
        if (!document.pointerLockElement && window.game && window.game.state === 'playing') {
          canvas.requestPointerLock();
        }
      });
    }

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    });

    // Mouse drag support when pointer lock is not active
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    if (this.lookZone) {
      this.lookZone.addEventListener('mousedown', (e) => {
        if (!this.isPointerLocked) {
          isMouseDown = true;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
      });

      window.addEventListener('mouseup', () => {
        isMouseDown = false;
      });

      this.lookZone.addEventListener('mousemove', (e) => {
        if (!this.isPointerLocked && isMouseDown) {
          const dx = e.clientX - lastMouseX;
          const dy = e.clientY - lastMouseY;
          const mouseSensitivity = 0.0035;
          this.lookDelta.yaw -= dx * mouseSensitivity;
          this.lookDelta.pitch -= dy * mouseSensitivity;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }
      });
    }

    document.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked) {
        const mouseSensitivity = 0.0024;
        this.lookDelta.yaw -= e.movementX * mouseSensitivity;
        this.lookDelta.pitch -= e.movementY * mouseSensitivity;
      }
    });
  }

  /**
   * Return combined movement vector from touch joystick and keyboard
   */
  getMovement() {
    let x = this.moveVector.x;
    let y = this.moveVector.y;

    // Add keyboard inputs
    if (this.keys.KeyA || this.keys.ArrowLeft) x -= 1.0;
    if (this.keys.KeyD || this.keys.ArrowRight) x += 1.0;
    if (this.keys.KeyW || this.keys.ArrowUp) y -= 1.0;
    if (this.keys.KeyS || this.keys.ArrowDown) y += 1.0;

    // Clamp length to max 1.0
    const length = Math.sqrt(x * x + y * y);
    if (length > 1.0) {
      x /= length;
      y /= length;
    }

    const isSprinting = this.sprint || this.keys.ShiftLeft || this.keys.ShiftRight;

    return { x, y, isSprinting };
  }

  /**
   * Return camera look delta and reset accumulation
   */
  consumeLookDelta() {
    const delta = { yaw: this.lookDelta.yaw, pitch: this.lookDelta.pitch };
    this.lookDelta.yaw = 0;
    this.lookDelta.pitch = 0;
    return delta;
  }

  checkFlashlightToggle() {
    if (this.flashlightToggleRequested) {
      this.flashlightToggleRequested = false;
      return true;
    }
    return false;
  }

  checkInteract() {
    if (this.interactPressed) {
      this.interactPressed = false;
      return true;
    }
    return false;
  }
}

window.inputController = new InputController();
