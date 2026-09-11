/**
 * THE ENTITY // MONOCHROME SURVIVAL HORROR
 * Procedural Web Audio System (No external audio files needed)
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // Heartbeat state
    this.heartbeatInterval = null;
    this.heartbeatRateMs = 2000;
    this.lastHeartbeatTime = 0;

    // Drone audio nodes
    this.ambientDroneGain = null;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.isInitialized = true;
      this.startAmbientDrone();
    } catch (e) {
      console.warn("Web Audio API not supported or blocked", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.ambientDroneGain && this.ctx) {
      this.ambientDroneGain.gain.setValueAtTime(this.isMuted ? 0 : 0.18, this.ctx.currentTime);
    }
    return !this.isMuted;
  }

  /**
   * Continuous eerie low-frequency drone & wind noise
   */
  startAmbientDrone() {
    if (!this.ctx || this.isMuted) return;

    // Drone Master Gain
    this.ambientDroneGain = this.ctx.createGain();
    this.ambientDroneGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.ambientDroneGain.connect(this.ctx.destination);

    // Deep sub-bass oscillator 1 (45Hz)
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sawtooth';
    this.droneOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Low-pass filter for the rumble
    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(110, this.ctx.currentTime);

    this.droneOsc1.connect(filter1);
    filter1.connect(this.ambientDroneGain);
    this.droneOsc1.start();

    // Secondary detuned sub-bass oscillator 2 (43Hz - creates binaural beat)
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'sine';
    this.droneOsc2.frequency.setValueAtTime(43, this.ctx.currentTime);
    this.droneOsc2.connect(filter1);
    this.droneOsc2.start();

    // Wind noise generator
    this.createWindNoise(this.ambientDroneGain);
  }

  createWindNoise(destination) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(250, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(2.0, this.ctx.currentTime);

    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    whiteNoise.connect(bandpass);
    bandpass.connect(windGain);
    windGain.connect(destination);
    whiteNoise.start();
  }

  /**
   * Footstep sound effect (concrete step thud)
   */
  playFootstep(isSprinting = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    const baseFreq = isSprinting ? 75 : 60;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);

    const vol = isSprinting ? 0.22 : 0.12;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Heartbeat pulse, accelerated when Entity is close
   * @param {number} distance To entity
   */
  updateEntityProximity(distance) {
    if (!this.ctx || this.isMuted) return;

    // Threshold: 32 meters
    if (distance > 32) {
      this.heartbeatRateMs = 0; // Off
      return;
    }

    // Interpolate heartbeat interval: 32m -> 1800ms, 4m -> 320ms (terrifying speed)
    const factor = Math.max(0, Math.min(1, (distance - 4) / 28));
    this.heartbeatRateMs = 320 + factor * 1480;

    const now = performance.now();
    if (now - this.lastHeartbeatTime >= this.heartbeatRateMs) {
      this.playSingleHeartbeat(1 - factor);
      this.lastHeartbeatTime = now;
    }
  }

  playSingleHeartbeat(intensity = 0.5) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // First thump (Lub)
    this.triggerHeartPulse(now, 55, 0.2 + intensity * 0.35);
    // Second thump (Dub) slightly quieter and delayed
    this.triggerHeartPulse(now + 0.14, 45, 0.14 + intensity * 0.25);
  }

  triggerHeartPulse(time, freq, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(28, time + 0.1);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.13);
  }

  /**
   * Disturbing metallic screech / radio static when Entity is aggressive or spots player
   */
  playEntityScreech() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Frequency modulated carrier for screech
    const carrier = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const mainGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    carrier.type = 'sawtooth';
    carrier.frequency.setValueAtTime(650, now);
    carrier.frequency.exponentialRampToValueAtTime(280, now + 0.6);

    mod.type = 'square';
    mod.frequency.setValueAtTime(80, now);
    mod.frequency.linearRampToValueAtTime(220, now + 0.6);

    modGain.gain.setValueAtTime(300, now);
    mod.connect(modGain);
    modGain.connect(carrier.frequency);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.Q.setValueAtTime(3, now);

    mainGain.gain.setValueAtTime(0.35, now);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    carrier.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(this.ctx.destination);

    carrier.start(now);
    mod.start(now);
    carrier.stop(now + 0.7);
    mod.stop(now + 0.7);
  }

  /**
   * Jumpscare sound on death
   */
  playJumpscare() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Loud sudden burst of shaped white noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 1.2);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

    // Deep terrifying sub drop
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sawtooth';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + 1.0);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 1.1);

    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);

    noise.start(now);
    subOsc.start(now);
    subOsc.stop(now + 1.2);
  }

  /**
   * Beacon activation chord
   */
  playBeaconActivation() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const frequencies = [440, 554.37, 659.25, 880]; // A major eerie chord
    frequencies.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.18, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + 2.0);
    });
  }

  /**
   * Flashlight click toggle
   */
  playFlashlightClick() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }
}

// Global singleton
window.soundEngine = new SoundEngine();
