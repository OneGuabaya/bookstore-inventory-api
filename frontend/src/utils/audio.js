class RetroAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('retro_audio_muted') === 'true';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('retro_audio_muted', this.muted);
    return this.muted;
  }

  playTone(freq, type = 'square', duration = 0.08, gainVal = 0.05) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (_) {}
  }

  nav() { this.playTone(440, 'square', 0.05, 0.04); }
  select() {
    this.playTone(587.33, 'square', 0.06, 0.05);
    setTimeout(() => this.playTone(880, 'square', 0.08, 0.05), 60);
  }
  action() {
    this.playTone(523.25, 'triangle', 0.08, 0.06);
    setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.06), 80);
  }
  error() {
    this.playTone(150, 'sawtooth', 0.15, 0.08);
  }
  fxSuccess() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sine', 0.09, 0.05), idx * 70);
    });
  }
}

export const sound = new RetroAudio();