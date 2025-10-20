import Phaser from 'phaser';

// Lightweight audio scaffold with graceful fallbacks (no external assets required)
export class AudioManager {
  static _instance = null;

  static get(scene) {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager(scene);
    } else if (scene && !AudioManager._instance.scene) {
      AudioManager._instance.scene = scene;
      AudioManager._instance.sound = scene.sound;
    }
    return AudioManager._instance;
  }

  constructor(scene) {
    this.scene = scene;
    this.sound = scene?.sound || null;

    // Settings
    try {
      const vol = localStorage.getItem('pr_sfx_volume');
      this.masterVolume = vol != null ? Math.max(0, Math.min(1, parseFloat(vol))) : 0.8;
    } catch { this.masterVolume = 0.8; }
    try {
      const m = localStorage.getItem('pr_sfx_mute');
      this.muted = (m === '1');
    } catch { this.muted = false; }

    this.lastPlay = new Map();
    this.minInterval = {
      'gun_fire': 50,
      'impact': 40,
      'ui_click': 60,
      'pickup': 120,
      'extract': 200
    };
  }

  setVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, v || 0));
    try { localStorage.setItem('pr_sfx_volume', String(this.masterVolume)); } catch {}
  }

  getVolume() { return this.masterVolume; }

  setMute(on) {
    this.muted = !!on;
    try { localStorage.setItem('pr_sfx_mute', this.muted ? '1' : '0'); } catch {}
  }

  isMuted() { return this.muted || this.masterVolume <= 0.001; }

  canPlay(key) {
    const now = performance.now();
    const last = this.lastPlay.get(key) || 0;
    const gap = this.minInterval[key] ?? 30;
    if (now - last < gap) return false;
    this.lastPlay.set(key, now);
    return true;
  }

  play(key, opts = {}) {
    if (this.isMuted()) return;
    if (!this.canPlay(key)) return;

    const vol = (opts.volume ?? 1) * this.masterVolume;
    const rate = (opts.rate ?? 1) + (opts.rateRand ? (Math.random() * opts.rateRand * 2 - opts.rateRand) : 0);

    // If a loaded audio buffer exists, use Phaser’s sound manager
    if (this.scene?.cache?.audio?.exists?.(key)) {
      try { this.sound.play(key, { volume: vol, rate }); return; } catch {}
    }

    // Fallback: WebAudio oscillator click/pop
    const ctx = this.sound?.context;
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = (key === 'pickup') ? 'triangle' : (key === 'impact' ? 'square' : 'sine');
      const baseHz = (key === 'gun_fire') ? 1400 : (key === 'impact' ? 480 : (key === 'pickup' ? 1000 : 800));
      const durMs = (key === 'gun_fire') ? 55 : (key === 'impact' ? 70 : (key === 'pickup' ? 110 : 90));
      osc.frequency.setValueAtTime(baseHz * rate, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol * 0.35, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durMs / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durMs / 1000);
    } catch {}
  }

  ensureUnlocked(scene) {
    const s = scene || this.scene;
    if (!s || !s.sound) return;
    if (!s.sound.locked) return; // already unlocked
    const unlock = () => {
      try { s.sound.unlock(); } catch {}
      s.input?.off?.('pointerdown', unlock);
      s.input?.off?.('pointerup', unlock);
    };
    s.input?.once?.('pointerdown', unlock);
    s.input?.once?.('pointerup', unlock);
  }

  // Background music with crossfade
  playMusic(key, { volume = 0.5, loop = true, fade = 300 } = {}) {
    if (!this.scene || !this.sound) return;
    if (this.isMuted()) return;
    const targetVol = volume * this.masterVolume;

    if (this.music && this.music.key === key) {
      // Just adjust volume
      if (this.music.sound) {
        if (fade > 0) {
          const from = this.music.sound.volume;
          const tween = this.scene.tweens.add({
            targets: this.music.sound,
            volume: targetVol,
            duration: fade,
            ease: 'Sine.easeOut'
          });
        } else {
          this.music.sound.setVolume(targetVol);
        }
      }
      return;
    }

    // Prepare new sound if loaded
    let next = null;
    if (this.scene.cache.audio.exists(key)) {
      try {
        next = this.sound.add(key, { loop: !!loop, volume: 0 });
        next.play();
      } catch {
        next = null;
      }
    }

    const prev = this.music?.sound || null;
    if (next) {
      this.music = { key, sound: next };
      if (fade > 0) {
        this.scene.tweens.add({ targets: next, volume: targetVol, duration: fade, ease: 'Sine.easeOut' });
      } else {
        next.setVolume(targetVol);
      }
    } else {
      this.music = { key: null, sound: null };
    }

    if (prev) {
      const stopPrev = () => { try { prev.stop(); prev.destroy(); } catch {} };
      if (fade > 0) {
        this.scene.tweens.add({ targets: prev, volume: 0, duration: fade, ease: 'Sine.easeIn', onComplete: stopPrev });
      } else {
        stopPrev();
      }
    }
  }

  stopMusic(fade = 200) {
    const prev = this.music?.sound;
    if (!prev) return;
    const stopPrev = () => { try { prev.stop(); prev.destroy(); } catch {} };
    if (fade > 0) {
      this.scene?.tweens?.add({ targets: prev, volume: 0, duration: fade, ease: 'Sine.easeIn', onComplete: stopPrev });
    } else {
      stopPrev();
    }
    this.music = { key: null, sound: null };
  }
}

export default AudioManager;
