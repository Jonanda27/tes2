class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  private bgmAudio: HTMLAudioElement | null = null;
  public bgmEnabled: boolean = true;
  public isBgmPlaying: boolean = false;
  public bgmVolume: number = 0.35;
  private bgmListeners: Set<(playing: boolean) => void> = new Set();

  public initBgm(src: string = '/bgm.mp3'): void {
    if (typeof window === 'undefined') return;
    if (this.bgmAudio) return;

    try {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = this.bgmVolume;
      audio.preload = 'auto';

      audio.addEventListener('play', () => {
        this.isBgmPlaying = true;
        this.notifyBgmListeners();
      });

      audio.addEventListener('pause', () => {
        this.isBgmPlaying = false;
        this.notifyBgmListeners();
      });

      this.bgmAudio = audio;

      const saved = localStorage.getItem('poker_bgm_enabled');
      if (saved === 'false') {
        this.bgmEnabled = false;
      }
    } catch {
      // ignore
    }
  }

  public async playBgm(): Promise<void> {
    if (!this.bgmAudio) {
      this.initBgm();
    }
    if (!this.bgmAudio || !this.bgmEnabled) return;

    try {
      this.bgmAudio.volume = this.bgmVolume;
      await this.bgmAudio.play();
      this.isBgmPlaying = true;
      this.notifyBgmListeners();
    } catch {
      // Autoplay blocked until interaction
    }
  }

  public pauseBgm(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.isBgmPlaying = false;
      this.notifyBgmListeners();
    }
  }

  public toggleBgm(): boolean {
    if (!this.bgmAudio) {
      this.initBgm();
    }
    if (this.isBgmPlaying) {
      this.bgmEnabled = false;
      localStorage.setItem('poker_bgm_enabled', 'false');
      this.pauseBgm();
      return false;
    } else {
      this.bgmEnabled = true;
      localStorage.setItem('poker_bgm_enabled', 'true');
      this.playBgm();
      return true;
    }
  }

  public setBgmVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.bgmVolume;
    }
  }

  public onBgmChange(cb: (playing: boolean) => void): () => void {
    this.bgmListeners.add(cb);
    cb(this.isBgmPlaying);
    return () => this.bgmListeners.delete(cb);
  }

  private notifyBgmListeners(): void {
    for (const cb of this.bgmListeners) {
      cb(this.isBgmPlaying);
    }
  }

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public playCardDeal(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  public playChipSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.04, 0.09].forEach((delay, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400 + index * 400, now + delay);
      osc.frequency.exponentialRampToValueAtTime(1800, now + delay + 0.04);

      gain.gain.setValueAtTime(0.2, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.05);
    });
  }

  public playChipClick(): void {
    this.playChipSound();
  }

  public playFold(): void {
    this.playCheckSound();
  }

  public playCheckSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.12].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now + delay);
      osc.frequency.exponentialRampToValueAtTime(60, now + delay + 0.06);

      gain.gain.setValueAtTime(0.35, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.06);
    });
  }

  public playTurnChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.25, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  }

  public playWinFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // C, E, G, C(high) fanfare
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);

      gain.gain.setValueAtTime(0.3, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.5);
    });
  }

  public playPotSplash(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Cascading coin shower frequencies simulating heaps of chips raked in
    const freqs = [1850, 2200, 2600, 2900, 2400, 2800, 3100, 3500];
    freqs.forEach((freq, idx) => {
      const delay = idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, now + delay + 0.07);

      gain.gain.setValueAtTime(0.22, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.08);
    });
  }

  public playChatPop(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(550, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.07);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playFootstep(): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80 + Math.random() * 30, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.05);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playEnterTable(): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;

    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.18, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.4);
    });
  }

  public playRouletteSpin(): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;

    // Simulate ball whirling around wooden rim with accelerating/pulsing clicks
    const clicks = 24;
    for (let i = 0; i < clicks; i++) {
      const timeOffset = Math.pow(i / clicks, 1.4) * 2.8;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900 + Math.random() * 400, now + timeOffset);
      osc.frequency.exponentialRampToValueAtTime(250, now + timeOffset + 0.025);

      const vol = 0.12 * (1 - i / (clicks * 1.3));
      gain.gain.setValueAtTime(vol, now + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + 0.025);
    }
  }

  public playRouletteBallDrop(): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;

    // Ball bouncing across brass fret dividers into final pocket
    const bounces = [0, 0.09, 0.16, 0.22, 0.27, 0.31];
    bounces.forEach((bTime, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400 - idx * 120 + Math.random() * 80, now + bTime);
      osc.frequency.exponentialRampToValueAtTime(300, now + bTime + 0.04);

      const vol = 0.22 * (1 - idx * 0.14);
      gain.gain.setValueAtTime(vol, now + bTime);
      gain.gain.exponentialRampToValueAtTime(0.001, now + bTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + bTime);
      osc.stop(now + bTime + 0.04);
    });
  }

  public playSlotLever(): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;

    // Heavy mechanical latch click + spring snap
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playSlotReelSpin(): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;

    // Continuous whirring reel clicks
    for (let i = 0; i < 18; i++) {
      const t = i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450 + (i % 3) * 60, now + t);
      osc.frequency.exponentialRampToValueAtTime(180, now + t + 0.02);

      gain.gain.setValueAtTime(0.08, now + t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t);
      osc.stop(now + t + 0.02);
    }
  }

  public playSlotReelStop(): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;

    // Solid mechanical reel lock
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.09);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playSlotJackpot(): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;

    // Retro electronic bells & triumphant arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);

      gain.gain.setValueAtTime(0.24, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.35);
    });
  }

  public playRocketAscend(multiplier: number = 1.0): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    const baseFreq = Math.min(1200, 150 + multiplier * 80);
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.linearRampToValueAtTime(baseFreq + 40, now + 0.12);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playRocketCrash(): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.65);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  public playCashOut(): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;

    [1046.50, 1567.98, 2093.00].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.25, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.3);
    });
  }

  public playBlackjackWin(): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;

    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.22, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  }

  public playBust(): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.35);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }
}

export const soundEffects = new SoundEngine();
