/**
 * MONOCHROMEOUS // SURVIVAL HORROR
 * Faithfully recreating the user's sketch:
 * - Blank, smooth, cracked porcelain ovoid head (no facial features)
 * - Charcoal shaded body with winding black organic tendrils
 * - Slender limbs with clawed talons
 * - Floating, orbiting fractured shards breaking away from forearms
 * - Dynamic locomotion, floating shard physics, and eerie horror animations
 */

class Entity {
  constructor(scene, map) {
    this.scene = scene;
    this.map = map;

    // AI States: 'patrol', 'stalk', 'chase', 'kill'
    this.state = 'patrol';
    this.speed = 3.2;
    this.chaseSpeed = 6.6;

    // Position & Orientation
    this.position = new THREE.Vector3(0, 0, 0);
    this.rotationY = 0;
    this.distanceToPlayer = 999;

    // Detection & Aggro
    this.detectRadius = 24;
    this.aggroRadius = 14;
    this.killRadius = 1.6;
    this.hasScreeched = false;

    // Patrol waypoints across the labyrinth
    this.waypoints = [
      { x: 0, z: 0 },
      { x: -30, z: -30 },
      { x: 30, z: -30 },
      { x: 30, z: 30 },
      { x: -30, z: 30 },
      { x: 0, z: 20 },
      { x: 0, z: -20 }
    ];
    this.currentWaypointIndex = 0;

    // Animation & Floating Shard state
    this.animTime = 0;
    this.floatingShards = []; // Array of shard meshes and orbital properties

    // Procedural textures matching the sketch
    this.materials = this.createEntityMaterials();

    // Build the 3D Mesh
    this.mesh = this.createEntityMesh();
    this.scene.add(this.mesh);

    // Initial spawn
    this.teleportTo(0, 0);
  }

  /**
   * Generates procedural pencil-shaded charcoal textures with winding black tendrils
   * and cracked porcelain texture for the blank head.
   */
  createEntityMaterials() {
    // 1. Torso & Limbs: Charcoal Pencil Texture with Winding Black Root Tendrils
    const tendrilCanvas = document.createElement('canvas');
    tendrilCanvas.width = 256;
    tendrilCanvas.height = 256;
    const tctx = tendrilCanvas.getContext('2d');

    // Charcoal gray pencil paper background
    tctx.fillStyle = '#4a4a4a';
    tctx.fillRect(0, 0, 256, 256);

    // Pencil stroke texture
    const imgData = tctx.getImageData(0, 0, 256, 256);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const grain = (Math.random() - 0.5) * 45;
      const val = Math.min(255, Math.max(20, imgData.data[i] + grain));
      imgData.data[i] = val;
      imgData.data[i + 1] = val;
      imgData.data[i + 2] = val;
    }
    tctx.putImageData(imgData, 0, 0);

    // Draw winding, branching organic black tendrils (matching the drawing)
    tctx.strokeStyle = '#050505';
    tctx.lineWidth = 9;
    tctx.lineCap = 'round';
    tctx.lineJoin = 'round';

    const drawWindingTendril = (startX, startY, pathPoints) => {
      tctx.beginPath();
      tctx.moveTo(startX, startY);
      for (const p of pathPoints) {
        tctx.bezierCurveTo(p.cp1x, p.cp1y, p.cp2x, p.cp2y, p.x, p.y);
      }
      tctx.stroke();
    };

    // Branching veins climbing upward
    drawWindingTendril(128, 256, [
      { cp1x: 110, cp1y: 200, cp2x: 145, cp2y: 160, x: 128, y: 120 },
      { cp1x: 115, cp1y: 80, cp2x: 80, cp2y: 40, x: 90, y: 0 }
    ]);
    drawWindingTendril(128, 140, [
      { cp1x: 150, cp1y: 110, cp2x: 180, cp2y: 60, x: 165, y: 0 }
    ]);
    drawWindingTendril(60, 256, [
      { cp1x: 80, cp1y: 180, cp2x: 40, cp2y: 120, x: 60, y: 60 },
      { cp1x: 75, cp1y: 30, cp2x: 50, cp2y: 20, x: 45, y: 0 }
    ]);
    drawWindingTendril(196, 256, [
      { cp1x: 170, cp1y: 180, cp2x: 215, cp2y: 120, x: 195, y: 60 },
      { cp1x: 180, cp1y: 30, cp2x: 210, cp2y: 20, x: 215, y: 0 }
    ]);

    const tendrilTex = new THREE.CanvasTexture(tendrilCanvas);
    tendrilTex.magFilter = THREE.NearestFilter;
    tendrilTex.minFilter = THREE.NearestFilter;

    // 2. Head: Blank, Smooth Pale Porcelain with Fine Cranial Fracture Cracks
    const headCanvas = document.createElement('canvas');
    headCanvas.width = 256;
    headCanvas.height = 256;
    const hctx = headCanvas.getContext('2d');

    // Smooth porcelain gradient
    const grad = hctx.createRadialGradient(110, 90, 10, 128, 128, 120);
    grad.addColorStop(0, '#f0f0f0');
    grad.addColorStop(0.7, '#c2c2c2');
    grad.addColorStop(1, '#808080');
    hctx.fillStyle = grad;
    hctx.fillRect(0, 0, 256, 256);

    // Draw jagged fracture cracks on top and side
    hctx.strokeStyle = '#111111';
    hctx.lineWidth = 2.5;
    hctx.beginPath();
    // Top crack
    hctx.moveTo(128, 10);
    hctx.lineTo(120, 35);
    hctx.lineTo(135, 55);
    hctx.lineTo(118, 80);
    hctx.lineTo(105, 95);
    // Side branch
    hctx.moveTo(120, 35);
    hctx.lineTo(95, 48);
    hctx.lineTo(75, 70);
    // Secondary crack
    hctx.moveTo(135, 55);
    hctx.lineTo(155, 65);
    hctx.lineTo(168, 90);
    hctx.stroke();

    const headTex = new THREE.CanvasTexture(headCanvas);
    headTex.magFilter = THREE.NearestFilter;
    headTex.minFilter = THREE.NearestFilter;

    // Shard material (reflective fractured slate / stone)
    const shardMat = new THREE.MeshLambertMaterial({
      color: 0x999999,
      wireframe: false
    });

    const clawMat = new THREE.MeshLambertMaterial({
      color: 0x1a1a1a
    });

    return {
      body: new THREE.MeshLambertMaterial({ map: tendrilTex, color: 0xffffff }),
      head: new THREE.MeshLambertMaterial({ map: headTex, color: 0xffffff }),
      shard: shardMat,
      claw: clawMat,
      neck: new THREE.MeshLambertMaterial({ color: 0x333333 })
    };
  }

  createEntityMesh() {
    const root = new THREE.Group();

    // -------------------------------------------------------------
    // 1. Torso (Upper chest and lower abdomen)
    // -------------------------------------------------------------
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.y = 2.4;
    root.add(this.torsoGroup);

    // Upper chest: tapered box
    const chestGeo = new THREE.BoxGeometry(0.85, 1.1, 0.45);
    const chestMesh = new THREE.Mesh(chestGeo, this.materials.body);
    chestMesh.position.y = 0.55;
    this.torsoGroup.add(chestMesh);

    // Abdomen / Pelvis
    const pelvisGeo = new THREE.BoxGeometry(0.75, 0.8, 0.4);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, this.materials.body);
    pelvisMesh.position.y = -0.3;
    this.torsoGroup.add(pelvisMesh);

    // -------------------------------------------------------------
    // 2. Neck & Blank Cracked Head
    // -------------------------------------------------------------
    // Thin neck
    const neckGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.45, 8);
    const neckMesh = new THREE.Mesh(neckGeo, this.materials.neck);
    neckMesh.position.y = 1.25;
    this.torsoGroup.add(neckMesh);

    // Head Group: Allows eerie independent tilting and craning
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 1.75;
    this.torsoGroup.add(this.headGroup);

    // Blank, featureless, cracked ovoid head (from sketch)
    const headGeo = new THREE.SphereGeometry(0.42, 14, 14);
    headGeo.scale(0.88, 1.2, 0.95); // Elongated smooth ovoid
    this.headMesh = new THREE.Mesh(headGeo, this.materials.head);
    this.headGroup.add(this.headMesh);

    // -------------------------------------------------------------
    // 3. Arms, Claws, and Floating Fractured Shards
    // -------------------------------------------------------------
    this.leftArm = this.createArticulatedArm(true);
    this.leftArm.position.set(-0.55, 0.95, 0);
    this.torsoGroup.add(this.leftArm);

    this.rightArm = this.createArticulatedArm(false);
    this.rightArm.position.set(0.55, 0.95, 0);
    this.torsoGroup.add(this.rightArm);

    // -------------------------------------------------------------
    // 4. Legs & Tapered Feet
    // -------------------------------------------------------------
    this.leftLeg = this.createArticulatedLeg(true);
    this.leftLeg.position.set(-0.24, -0.65, 0);
    this.torsoGroup.add(this.leftLeg);

    this.rightLeg = this.createArticulatedLeg(false);
    this.rightLeg.position.set(0.24, -0.65, 0);
    this.torsoGroup.add(this.rightLeg);

    // Faint eerie monochrome aura light
    const auraLight = new THREE.PointLight(0xffffff, 0.9, 9);
    auraLight.position.set(0, 1.5, 0.3);
    this.torsoGroup.add(auraLight);

    return root;
  }

  createArticulatedArm(isLeft) {
    const shoulder = new THREE.Group();

    // Upper Arm
    const upperGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.85, 6);
    const upperMesh = new THREE.Mesh(upperGeo, this.materials.body);
    upperMesh.position.y = -0.425;
    shoulder.add(upperMesh);

    // Elbow joint
    const elbow = new THREE.Group();
    elbow.position.y = -0.85;
    shoulder.add(elbow);

    // Forearm
    const forearmGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.85, 6);
    const forearmMesh = new THREE.Mesh(forearmGeo, this.materials.body);
    forearmMesh.position.y = -0.425;
    elbow.add(forearmMesh);

    // Hand & 4 Pointed Claw Talons (matching sketch)
    const hand = new THREE.Group();
    hand.position.y = -0.85;
    elbow.add(hand);

    const palmGeo = new THREE.BoxGeometry(0.12, 0.14, 0.06);
    const palm = new THREE.Mesh(palmGeo, this.materials.claw);
    hand.add(palm);

    // 4 sharp curved claw fingers
    for (let i = 0; i < 4; i++) {
      const clawGeo = new THREE.ConeGeometry(0.024, 0.28, 4);
      const claw = new THREE.Mesh(clawGeo, this.materials.claw);
      const xOffset = (i - 1.5) * 0.038;
      claw.position.set(xOffset, -0.16, 0.02);
      claw.rotation.x = 0.25; // Curved claw hook
      hand.add(claw);
    }

    // -----------------------------------------------------------
    // Floating Fractured Shards (Distinctive feature from drawing)
    // -----------------------------------------------------------
    const numShards = 5;
    for (let i = 0; i < numShards; i++) {
      // Angular splinter/shard geometry
      const shardGeo = new THREE.TetrahedronGeometry(0.08 + Math.random() * 0.06, 0);
      shardGeo.scale(1.0, 2.2, 0.7); // Elongated splinter shard
      const shardMesh = new THREE.Mesh(shardGeo, this.materials.shard);

      // Orbital parameters
      const baseAngle = (i / numShards) * Math.PI * 2;
      const baseRadius = 0.22 + Math.random() * 0.12;
      const baseHeight = -0.15 - (i * 0.12);

      shardMesh.position.set(
        Math.cos(baseAngle) * baseRadius,
        baseHeight,
        Math.sin(baseAngle) * baseRadius
      );
      shardMesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);

      elbow.add(shardMesh);

      // Register for dynamic physics/movement animation
      this.floatingShards.push({
        mesh: shardMesh,
        baseAngle,
        baseRadius,
        baseHeight,
        speed: 1.8 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 4.0
      });
    }

    // Store references for limb animation
    shoulder.userData = { upperMesh, elbow, forearmMesh, hand };
    return shoulder;
  }

  createArticulatedLeg(isLeft) {
    const hip = new THREE.Group();

    // Thigh
    const thighGeo = new THREE.CylinderGeometry(0.12, 0.09, 1.1, 6);
    const thigh = new THREE.Mesh(thighGeo, this.materials.body);
    thigh.position.y = -0.55;
    hip.add(thigh);

    // Knee
    const knee = new THREE.Group();
    knee.position.y = -1.1;
    hip.add(knee);

    // Shin / Calf
    const shinGeo = new THREE.CylinderGeometry(0.09, 0.07, 1.1, 6);
    const shin = new THREE.Mesh(shinGeo, this.materials.body);
    shin.position.y = -0.55;
    knee.add(shin);

    // Foot (matching tapered pencil-sketched shoes/feet)
    const footGeo = new THREE.BoxGeometry(0.14, 0.12, 0.38);
    const foot = new THREE.Mesh(footGeo, this.materials.neck);
    foot.position.set(0, -1.1, 0.1);
    knee.add(foot);

    hip.userData = { knee, thigh, shin, foot };
    return hip;
  }

  teleportTo(x, z) {
    this.position.set(x, 0, z);
    this.mesh.position.set(x, 0, z);
  }

  update(delta, playerPos, isFlashlightOn) {
    if (this.state === 'kill') return;

    this.animTime += delta;

    // Distance to player
    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    this.distanceToPlayer = Math.sqrt(dx * dx + dz * dz);

    // Update global audio proximity (heartbeats & drones)
    if (window.soundEngine) {
      window.soundEngine.updateEntityProximity(this.distanceToPlayer);
    }

    // Update screen glitch effect
    this.updateGlitchHUD(this.distanceToPlayer);

    // -----------------------------------------------------------
    // AI State Transitions
    // -----------------------------------------------------------
    const playerDist = this.distanceToPlayer;

    if (playerDist <= this.killRadius) {
      this.state = 'kill';
      if (window.game) {
        window.game.triggerGameOver();
      }
      return;
    }

    // Flashlight multiplier
    const effectiveDetectRadius = isFlashlightOn ? this.detectRadius * 1.5 : this.detectRadius;
    const effectiveAggroRadius = isFlashlightOn ? this.aggroRadius * 1.4 : this.aggroRadius;

    if (playerDist < effectiveAggroRadius) {
      if (this.state !== 'chase') {
        this.state = 'chase';
        if (!this.hasScreeched && window.soundEngine) {
          window.soundEngine.playEntityScreech();
          this.hasScreeched = true;
          setTimeout(() => { this.hasScreeched = false; }, 4000);
        }
      }
    } else if (playerDist < effectiveDetectRadius) {
      this.state = 'stalk';
    } else {
      this.state = 'patrol';
    }

    // -----------------------------------------------------------
    // AI Movement & Pathing
    // -----------------------------------------------------------
    let targetX = 0;
    let targetZ = 0;
    let currentSpeed = this.speed;

    if (this.state === 'chase') {
      targetX = playerPos.x;
      targetZ = playerPos.z;
      currentSpeed = this.chaseSpeed;
    } else if (this.state === 'stalk') {
      targetX = playerPos.x;
      targetZ = playerPos.z;
      currentSpeed = this.speed * 0.75;
    } else {
      const wp = this.waypoints[this.currentWaypointIndex];
      targetX = wp.x;
      targetZ = wp.z;
      currentSpeed = this.speed;

      const distToWp = Math.hypot(wp.x - this.position.x, wp.z - this.position.z);
      if (distToWp < 3.0) {
        this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
      }
    }

    // Compute velocity
    const toTargetX = targetX - this.position.x;
    const toTargetZ = targetZ - this.position.z;
    const distToTarget = Math.hypot(toTargetX, toTargetZ);

    if (distToTarget > 0.1) {
      const step = currentSpeed * delta;
      let nextX = this.position.x + (toTargetX / distToTarget) * step;
      let nextZ = this.position.z + (toTargetZ / distToTarget) * step;

      const resolved = this.map.resolveCollision(nextX, nextZ, 0.8);
      this.position.x = resolved.x;
      this.position.z = resolved.z;

      this.rotationY = Math.atan2(toTargetX, toTargetZ);
    }

    // Animate character movement, limbs, head craning, and floating shards
    this.animateCharacter(delta, currentSpeed);
  }

  animateCharacter(delta, moveSpeed) {
    const isChasing = this.state === 'chase';
    const isStalking = this.state === 'stalk';

    // -----------------------------------------------------------
    // 1. Floating Shard Dynamics (Oscillation, Orbit, & Vibration)
    // -----------------------------------------------------------
    const shardIntensity = isChasing ? 3.5 : 1.0;
    const radiusMultiplier = isChasing ? 1.45 : 1.0; // Shards flare outward when aggressive

    for (let i = 0; i < this.floatingShards.length; i++) {
      const shard = this.floatingShards[i];

      // Dynamic floating bobbing
      const bob = Math.sin(this.animTime * shard.speed + shard.phase) * (0.04 * shardIntensity);

      // Subtle slow orbital drift
      const currentAngle = shard.baseAngle + this.animTime * 0.6 * (i % 2 === 0 ? 1 : -1);
      const rad = shard.baseRadius * radiusMultiplier;

      // Jitter when chasing
      const jitter = isChasing ? (Math.random() - 0.5) * 0.05 : 0;

      shard.mesh.position.x = Math.cos(currentAngle) * rad + jitter;
      shard.mesh.position.y = shard.baseHeight + bob + jitter;
      shard.mesh.position.z = Math.sin(currentAngle) * rad + jitter;

      shard.mesh.rotation.x += delta * shard.rotSpeed * shardIntensity;
      shard.mesh.rotation.y += delta * shard.rotSpeed * shardIntensity;
    }

    // -----------------------------------------------------------
    // 2. Uncanny Locomotion & Limb Cycles
    // -----------------------------------------------------------
    const walkFrequency = isChasing ? 14 : 6;
    const walkAmp = isChasing ? 0.85 : 0.45;
    const cycle = Math.sin(this.animTime * walkFrequency);

    // Legs: Alternating stride with knee bending
    if (this.leftLeg && this.rightLeg) {
      this.leftLeg.rotation.x = cycle * walkAmp;
      this.rightLeg.rotation.x = -cycle * walkAmp;

      // Knee flex
      this.leftLeg.userData.knee.rotation.x = Math.max(0, -cycle * walkAmp * 0.8);
      this.rightLeg.userData.knee.rotation.x = Math.max(0, cycle * walkAmp * 0.8);
    }

    // Arms: Outstretched claws reaching forward during chase
    if (this.leftArm && this.rightArm) {
      if (isChasing) {
        // Aggressive predatory reach
        this.leftArm.rotation.x = -1.1 + Math.sin(this.animTime * 12) * 0.25;
        this.rightArm.rotation.x = -1.1 - Math.sin(this.animTime * 12) * 0.25;
        this.leftArm.userData.elbow.rotation.x = -0.5;
        this.rightArm.userData.elbow.rotation.x = -0.5;
      } else if (isStalking) {
        // Slow tense twitching stalk
        this.leftArm.rotation.x = -0.3 + Math.sin(this.animTime * 4) * 0.15;
        this.rightArm.rotation.x = -0.3 - Math.sin(this.animTime * 4) * 0.15;
      } else {
        // Eerie passive sway
        this.leftArm.rotation.x = -cycle * walkAmp * 0.7;
        this.rightArm.rotation.x = cycle * walkAmp * 0.7;
      }
    }

    // -----------------------------------------------------------
    // 3. Head Craning & Uncanny Tilting
    // -----------------------------------------------------------
    if (this.headGroup) {
      if (isStalking) {
        // Cocked head looking unnervingly at player
        this.headGroup.rotation.z = 0.35 + Math.sin(this.animTime * 2) * 0.08;
        this.headGroup.rotation.y = Math.sin(this.animTime * 1.5) * 0.2;
      } else if (isChasing) {
        // Violent head twitching
        if (Math.random() < 0.2) {
          this.headGroup.rotation.z = (Math.random() - 0.5) * 0.6;
          this.headGroup.rotation.y = (Math.random() - 0.5) * 0.4;
        }
      } else {
        // Slow ominous craning
        this.headGroup.rotation.z = Math.sin(this.animTime * 0.8) * 0.18;
        this.headGroup.rotation.y = Math.sin(this.animTime * 0.5) * 0.22;
      }
    }

    // -----------------------------------------------------------
    // 4. Torso Lean & Spine undulation
    // -----------------------------------------------------------
    if (this.torsoGroup) {
      // Lean forward aggressively when sprinting
      const targetLean = isChasing ? 0.45 : (isStalking ? 0.2 : 0.05);
      this.torsoGroup.rotation.x = targetLean + Math.sin(this.animTime * walkFrequency * 2) * 0.04;
      this.torsoGroup.rotation.y = Math.sin(this.animTime * walkFrequency) * 0.08;
    }

    // -----------------------------------------------------------
    // 5. Position & PS1 Vertex Jitter
    // -----------------------------------------------------------
    const jitterX = (Math.random() - 0.5) * (isChasing ? 0.15 : 0.03);
    const jitterZ = (Math.random() - 0.5) * (isChasing ? 0.15 : 0.03);

    this.mesh.position.set(
      this.position.x + jitterX,
      this.position.y,
      this.position.z + jitterZ
    );
    this.mesh.rotation.y = this.rotationY;
  }

  updateGlitchHUD(dist) {
    const glitchOverlay = document.getElementById('static-glitch-overlay');
    const threatIndicator = document.getElementById('threat-indicator');

    if (dist < 28) {
      if (threatIndicator) threatIndicator.classList.remove('hidden');
      if (glitchOverlay) {
        const factor = Math.max(0, (28 - dist) / 28);
        glitchOverlay.style.opacity = (factor * 0.75).toFixed(2);
        if (dist < 10) {
          glitchOverlay.classList.add('intense');
        } else {
          glitchOverlay.classList.remove('intense');
        }
      }
    } else {
      if (threatIndicator) threatIndicator.classList.add('hidden');
      if (glitchOverlay) {
        glitchOverlay.style.opacity = '0';
        glitchOverlay.classList.remove('intense');
      }
    }
  }

  reset() {
    this.state = 'patrol';
    this.teleportTo(0, 0);
    this.distanceToPlayer = 999;
    this.hasScreeched = false;
    this.updateGlitchHUD(999);
  }
}

window.Entity = Entity;
