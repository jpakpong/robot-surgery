/**
 * Procedural Web Audio API sound generator for Surgical Robotics Simulation
 * Zero external audio dependencies - generates realistic tones, clicks, and servo hums
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private servoOsc: OscillatorNode | null = null;
  private servoGain: GainNode | null = null;
  private enabled: boolean = true;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (!val && this.servoGain) {
      this.stopServoHum();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /**
   * Play clean surgical console button tap
   */
  public playClick() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio error suppressed safely
    }
  }

  private lastCollisionAlertTime: number = 0;

  /**
   * Urgent medical buzzer sound alert for contacting floor or anatomical barrier
   */
  public playCollisionAlert() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Debounce to at most once every 240ms so repeated pulses form an authentic medical alarm buzzer
    if (now - this.lastCollisionAlertTime < 0.22) return;
    this.lastCollisionAlertTime = now;

    try {
      // Dual-tone urgent alert: 460 Hz -> 320 Hz square/sawtooth pulse
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.setValueAtTime(340, now + 0.07);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.19);
    } catch {
      // Audio error suppressed safely
    }
  }


  /**
   * Step target reached chime (subtle pleasant console notification)
   */
  public playTargetReached() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.09); // A5

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  /**
   * Mission completion fanfare (harmonic chord sequence)
   */
  public playSuccessFanfare() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime + idx * 0.09;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
      });
    } catch {}
  }

  /**
   * Gripper grasp engagement / release sound
   */
  public playGrasp(closing: boolean) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const startFreq = closing ? 350 : 550;
      const endFreq = closing ? 600 : 320;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  /**
   * Subtle robotic actuator servo hum during continuous movement
   */
  public startServoHum() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    if (this.servoOsc && this.servoGain) {
      // Already running, ramp gain up gently
      this.servoGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.servoGain.gain.linearRampToValueAtTime(0.035, this.ctx.currentTime + 0.05);
      return;
    }

    try {
      const now = this.ctx.currentTime;
      this.servoOsc = this.ctx.createOscillator();
      this.servoGain = this.ctx.createGain();

      // Dual harmonic mechanical frequency
      this.servoOsc.type = 'triangle';
      this.servoOsc.frequency.setValueAtTime(140, now);

      this.servoGain.gain.setValueAtTime(0.001, now);
      this.servoGain.gain.linearRampToValueAtTime(0.035, now + 0.05);

      this.servoOsc.connect(this.servoGain);
      this.servoGain.connect(this.ctx.destination);

      this.servoOsc.start(now);
    } catch {}
  }

  public stopServoHum() {
    if (!this.ctx || !this.servoGain || !this.servoOsc) return;

    try {
      const now = this.ctx.currentTime;
      this.servoGain.gain.cancelScheduledValues(now);
      this.servoGain.gain.linearRampToValueAtTime(0.0001, now + 0.06);

      const osc = this.servoOsc;
      const gain = this.servoGain;
      this.servoOsc = null;
      this.servoGain = null;

      setTimeout(() => {
        try {
          osc.stop();
          osc.disconnect();
          gain.disconnect();
        } catch {}
      }, 70);
    } catch {}
  }
}

export const soundManager = new SoundEffectsManager();
