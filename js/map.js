/**
 * THE ENTITY // MONOCHROME SURVIVAL HORROR
 * Labyrinth Map & Procedural Monochrome Textures
 */

class WorldMap {
  constructor(scene) {
    this.scene = scene;
    this.tileSize = 6; // Size of each grid block in Three.js units
    this.wallHeight = 5.5;

    // 0: Empty path, 1: Solid Concrete Wall, 2: Pillar, 3: Beacon Spawn, 4: Exit Gate, 5: Player Spawn
    this.grid = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,5,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,3,1],
      [1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1],
      [1,0,1,0,0,0,0,3,1,0,0,0,1,0,0,0,0,0,1,0,1],
      [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1],
      [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
      [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
      [1,0,0,0,1,0,0,0,1,2,0,2,1,0,0,0,1,0,0,0,1],
      [1,1,1,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,1,1,1],
      [1,0,0,0,0,0,1,0,1,2,0,2,1,0,1,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
      [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
      [1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,1,0,0,0,1,3,0,0,0,0,1,0,1],
      [1,0,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,0,1],
      [1,3,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,4,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];

    this.gridRows = this.grid.length;
    this.gridCols = this.grid[0].length;

    this.playerSpawn = { x: 0, z: 0 };
    this.exitGatePosition = { x: 0, z: 0 };
    this.exitGateMesh = null;
    this.beacons = []; // { mesh, ringMesh, active, x, z }
    this.wallBoxes = []; // Array of bounding boxes for collision

    this.materials = this.createMonochromeMaterials();
    this.buildMap();
  }

  /**
   * Procedural stark monochrome retro textures using HTML5 Canvas
   */
  createMonochromeMaterials() {
    // 1. Grungy monochrome concrete / brick wall texture
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 128;
    wallCanvas.height = 128;
    const wctx = wallCanvas.getContext('2d');
    wctx.fillStyle = '#161616';
    wctx.fillRect(0, 0, 128, 128);

    // Brick mortar lines
    wctx.strokeStyle = '#050505';
    wctx.lineWidth = 2;
    for (let y = 0; y < 128; y += 16) {
      wctx.beginPath();
      wctx.moveTo(0, y);
      wctx.lineTo(128, y);
      wctx.stroke();

      const offset = (y / 16) % 2 === 0 ? 0 : 16;
      for (let x = offset; x < 128; x += 32) {
        wctx.beginPath();
        wctx.moveTo(x, y);
        wctx.lineTo(x, y + 16);
        wctx.stroke();
      }
    }

    // High contrast monochrome noise & grit
    const imgData = wctx.getImageData(0, 0, 128, 128);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 60;
      const val = Math.min(255, Math.max(0, imgData.data[i] + noise));
      imgData.data[i] = val;
      imgData.data[i + 1] = val;
      imgData.data[i + 2] = val;
    }
    wctx.putImageData(imgData, 0, 0);

    const wallTex = new THREE.CanvasTexture(wallCanvas);
    wallTex.magFilter = THREE.NearestFilter;
    wallTex.minFilter = THREE.NearestFilter;
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;

    // 2. Grimy tiled floor texture
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 128;
    floorCanvas.height = 128;
    const fctx = floorCanvas.getContext('2d');
    fctx.fillStyle = '#0a0a0a';
    fctx.fillRect(0, 0, 128, 128);

    // Tiles
    fctx.strokeStyle = '#222222';
    fctx.lineWidth = 2;
    fctx.strokeRect(2, 2, 60, 60);
    fctx.strokeRect(66, 2, 60, 60);
    fctx.strokeRect(2, 66, 60, 60);
    fctx.strokeRect(66, 66, 60, 60);

    const fData = fctx.getImageData(0, 0, 128, 128);
    for (let i = 0; i < fData.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 35;
      const val = Math.min(255, Math.max(0, fData.data[i] + n));
      fData.data[i] = val;
      fData.data[i + 1] = val;
      fData.data[i + 2] = val;
    }
    fctx.putImageData(fData, 0, 0);

    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.magFilter = THREE.NearestFilter;
    floorTex.minFilter = THREE.NearestFilter;
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(16, 16);

    return {
      wall: new THREE.MeshLambertMaterial({ map: wallTex, color: 0x999999 }),
      floor: new THREE.MeshLambertMaterial({ map: floorTex, color: 0x777777 }),
      ceiling: new THREE.MeshLambertMaterial({ color: 0x111111 }),
      beaconOff: new THREE.MeshLambertMaterial({ color: 0x444444, wireframe: true }),
      beaconOn: new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false }),
      exitLocked: new THREE.MeshLambertMaterial({ color: 0x222222 }),
      exitUnlocked: new THREE.MeshBasicMaterial({ color: 0xffffff })
    };
  }

  buildMap() {
    const halfWidth = (this.gridCols * this.tileSize) / 2;
    const halfDepth = (this.gridRows * this.tileSize) / 2;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(this.gridCols * this.tileSize, this.gridRows * this.tileSize);
    const floorMesh = new THREE.Mesh(floorGeo, this.materials.floor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, 0);
    this.scene.add(floorMesh);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(this.gridCols * this.tileSize, this.gridRows * this.tileSize);
    const ceilMesh = new THREE.Mesh(ceilGeo, this.materials.ceiling);
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.set(0, this.wallHeight, 0);
    this.scene.add(ceilMesh);

    // Wall & Pillar Geometry
    const wallGeo = new THREE.BoxGeometry(this.tileSize, this.wallHeight, this.tileSize);
    const pillarGeo = new THREE.CylinderGeometry(this.tileSize * 0.35, this.tileSize * 0.35, this.wallHeight, 8);

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const type = this.grid[r][c];
        const worldX = c * this.tileSize - halfWidth + this.tileSize / 2;
        const worldZ = r * this.tileSize - halfDepth + this.tileSize / 2;

        if (type === 1) {
          // Solid Wall block
          const wall = new THREE.Mesh(wallGeo, this.materials.wall);
          wall.position.set(worldX, this.wallHeight / 2, worldZ);
          this.scene.add(wall);

          // Add bounding box for collision
          const half = this.tileSize / 2;
          this.wallBoxes.push({
            minX: worldX - half,
            maxX: worldX + half,
            minZ: worldZ - half,
            maxZ: worldZ + half
          });
        } else if (type === 2) {
          // Pillar
          const pillar = new THREE.Mesh(pillarGeo, this.materials.wall);
          pillar.position.set(worldX, this.wallHeight / 2, worldZ);
          this.scene.add(pillar);

          const rad = this.tileSize * 0.35;
          this.wallBoxes.push({
            minX: worldX - rad,
            maxX: worldX + rad,
            minZ: worldZ - rad,
            maxZ: worldZ + rad
          });
        } else if (type === 3) {
          // Beacon Spawn
          this.createBeacon(worldX, worldZ, this.beacons.length);
        } else if (type === 4) {
          // Exit Blast Gate
          this.exitGatePosition = { x: worldX, z: worldZ };
          const gateGeo = new THREE.BoxGeometry(this.tileSize * 0.9, this.wallHeight * 0.85, 0.6);
          this.exitGateMesh = new THREE.Mesh(gateGeo, this.materials.exitLocked);
          this.exitGateMesh.position.set(worldX, this.wallHeight * 0.425, worldZ);
          this.scene.add(this.exitGateMesh);

          // Light indicator above gate
          const exitLight = new THREE.PointLight(0x444444, 1.5, 12);
          exitLight.position.set(worldX, this.wallHeight - 0.8, worldZ);
          this.scene.add(exitLight);
          this.exitLight = exitLight;
        } else if (type === 5) {
          // Player Spawn
          this.playerSpawn = { x: worldX, z: worldZ };
        }
      }
    }
  }

  createBeacon(x, z, id) {
    const group = new THREE.Group();

    // Pedestal
    const baseGeo = new THREE.CylinderGeometry(0.8, 1.1, 1.2, 6);
    const baseMesh = new THREE.Mesh(baseGeo, this.materials.wall);
    baseMesh.position.y = 0.6;
    group.add(baseMesh);

    // Floating rotating crystal spire
    const spireGeo = new THREE.OctahedronGeometry(0.6, 0);
    const spireMesh = new THREE.Mesh(spireGeo, this.materials.beaconOff);
    spireMesh.position.y = 1.8;
    group.add(spireMesh);

    // Glowing halo ring
    const ringGeo = new THREE.TorusGeometry(0.9, 0.05, 4, 16);
    const ringMesh = new THREE.Mesh(ringGeo, this.materials.beaconOff);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 1.8;
    group.add(ringMesh);

    group.position.set(x, 0, z);
    this.scene.add(group);

    this.beacons.push({
      id,
      x,
      z,
      group,
      spireMesh,
      ringMesh,
      active: false,
      light: null
    });
  }

  /**
   * Activate a beacon
   */
  activateBeacon(beacon) {
    if (beacon.active) return false;
    beacon.active = true;
    beacon.spireMesh.material = this.materials.beaconOn;
    beacon.ringMesh.material = this.materials.beaconOn;

    // Add radiant stark monochrome point light
    const pLight = new THREE.PointLight(0xffffff, 2.5, 18);
    pLight.position.set(beacon.x, 2.2, beacon.z);
    this.scene.add(pLight);
    beacon.light = pLight;

    return true;
  }

  unlockExit() {
    if (this.exitGateMesh) {
      this.exitGateMesh.material = this.materials.exitUnlocked;
      if (this.exitLight) {
        this.exitLight.color.setHex(0xffffff);
        this.exitLight.intensity = 4.0;
        this.exitLight.distance = 25;
      }
    }
  }

  /**
   * Fast circle-AABB sliding collision check
   */
  resolveCollision(posX, posZ, radius = 0.6) {
    let resolvedX = posX;
    let resolvedZ = posZ;

    for (let i = 0; i < this.wallBoxes.length; i++) {
      const b = this.wallBoxes[i];
      // Closest point on box to circle center
      const closestX = Math.max(b.minX, Math.min(resolvedX, b.maxX));
      const closestZ = Math.max(b.minZ, Math.min(resolvedZ, b.maxZ));

      const distX = resolvedX - closestX;
      const distZ = resolvedZ - closestZ;
      const distSq = distX * distX + distZ * distZ;

      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const overlap = radius - dist;
          resolvedX += (distX / dist) * overlap;
          resolvedZ += (distZ / dist) * overlap;
        } else {
          // Inside block center: push away
          resolvedX += radius;
        }
      }
    }

    return { x: resolvedX, z: resolvedZ };
  }

  /**
   * Animate beacon float & spin
   */
  update(delta) {
    const time = performance.now() * 0.0015;
    for (let i = 0; i < this.beacons.length; i++) {
      const b = this.beacons[i];
      b.spireMesh.rotation.y += delta * 1.5;
      b.ringMesh.rotation.z += delta * 1.2;
      b.spireMesh.position.y = 1.8 + Math.sin(time * 2 + i) * 0.15;
    }
  }
}

window.WorldMap = WorldMap;
