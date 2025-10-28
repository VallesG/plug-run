import Phaser from 'phaser';

// Lightweight audio scaffold with graceful fallbacks (no external assets required)
export class AudioManager {
  static _instance = null;

  static get(scene) {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager(scene);
    } else if (scene) {
      // Always adopt the latest active scene so tweens run reliably across transitions
      AudioManager._instance.scene = scene;
      AudioManager._instance.sound = scene.sound;
      // Keep context reference fresh (some platforms swap implementations)
      AudioManager._instance._ctx = AudioManager._instance.sound?.context || AudioManager._instance._ctx || null;
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
    try {
      const mm = localStorage.getItem('pr_music_mute');
      this.musicMuted = (mm === '1');
    } catch { this.musicMuted = false; }

    // Per-group multipliers (default 1.0)
    this._volSfx = 1.0;
    this._volMusic = 1.0;

    // Music state for ducking/crossfades
    this._duck = { token: 0, priority: -1, endAt: 0, mult: 1, timeline: null };
    this._musicVolState = { base: 0 }; // base target before ducking
    this._musicVolTween = null; // track music volume tween to kill it when needed
    this._musicFilter = null; // low-pass filter for adaptive music
    this._filterCutoff = 20000; // current filter cutoff frequency (20kHz = no filtering)

    this.lastPlay = new Map();
    this.minInterval = {
      'gun_fire': 50,
      'impact': 40,
      'ui_click': 60,
      'pickup': 120,
      'extract': 200
    };

    // Optional WebAudio bus graph (used for oscillator fallback + semantics)
    this._ctx = this.sound?.context || null;
    this._hasWebAudio = !!(this._ctx && this._ctx.createGain);
    if (this._hasWebAudio) {
      try {
        this._busMaster = this._ctx.createGain();
        this._busSfx = this._ctx.createGain();
        this._busMusic = this._ctx.createGain();
        this._busMaster.gain.setValueAtTime(1, this._ctx.currentTime);
        this._busSfx.gain.setValueAtTime(1, this._ctx.currentTime);
        this._busMusic.gain.setValueAtTime(1, this._ctx.currentTime);
        this._busSfx.connect(this._busMaster);
        this._busMusic.connect(this._busMaster);
        this._busMaster.connect(this._ctx.destination);
      } catch {
        this._hasWebAudio = false;
      }
    }
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

  // Per-group volume controls
  setSfxVolume(v) { this._volSfx = Math.max(0, Math.min(1, v || 0)); }
  getSfxVolume() { return this._volSfx; }
  setMusicVolume(v) {
    this._volMusic = Math.max(0, Math.min(1, v || 0));
    // Reapply to current music target
    this._applyMusicVolume();
  }
  getMusicVolume() { return this._volMusic; }

  // Music-only mute (does not affect SFX)
  setMusicMute(on) {
    this.musicMuted = !!on;
    try { localStorage.setItem('pr_music_mute', this.musicMuted ? '1' : '0'); } catch {}
    if (this.musicMuted) {
      this.stopMusic(150);
    } else {
      // Unmuting - restart the music if we know which track was playing
      if (this._lastMusicKey) {
        this.playMusic(this._lastMusicKey, this._lastMusicOpts || { volume: 0.3, loop: true, fade: 300 });
      }
    }
  }
  isMusicMuted() { return this.musicMuted; }

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

    // Suggested default headroom per key (used only if no volume provided)
    const defaultVol = (
      key === 'gun_fire' ? 1.0 :
      key === 'impact' ? 1.0 :
      key === 'pickup' ? 0.9 :
      key === 'ouch' ? 0.95 :
      key === 'engine_start' ? 0.85 :
      key === 'engine_idle' ? 0.65 :
      1
    );
    // Final SFX volume: master * (muted?0:1) * per-group * per-sound
    const vol = (opts.volume ?? defaultVol) * this.masterVolume * (this.muted ? 0 : 1) * this._volSfx;
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
      // Route through SFX bus if available
      const finalVol = vol * 0.35;
      gain.gain.linearRampToValueAtTime(finalVol, ctx.currentTime + 0.01);
      if (this._hasWebAudio && this._busSfx) {
        osc.connect(gain).connect(this._busSfx);
      } else {
        osc.connect(gain).connect(ctx.destination);
      }
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durMs / 1000);
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

  // Background music with crossfade (respects master, music bus, ducking)
  playMusic(key, { volume = 0.5, loop = true, fade = 300 } = {}) {
    if (!this.scene || !this.sound) return;

    // Store the last music track and options for resuming after unmute
    this._lastMusicKey = key;
    this._lastMusicOpts = { volume, loop, fade };

    if (this.isMuted() || this.musicMuted) return;
    // Base (pre-duck) target
    const baseTarget = Math.max(0, Math.min(1, volume)) * this.masterVolume * (this.muted ? 0 : 1) * this._volMusic;

    if (this.music && this.music.key === key) {
      // Just adjust base volume target (preserves duck multiplier)
      if (this.music.sound) {
        // Kill existing volume tween before creating new one
        if (this._musicVolTween) {
          try { this._musicVolTween.remove(); } catch {}
          this._musicVolTween = null;
        }
        if (this.scene?.tweens) {
          try { this.scene.tweens.killTweensOf(this._musicVolState); } catch {}
        }

        if (fade > 0) {
          this._musicVolTween = this.scene.tweens.add({
            targets: this._musicVolState,
            base: baseTarget,
            duration: fade,
            ease: 'Sine.easeOut',
            onUpdate: () => this._applyMusicVolume()
          });
        } else {
          this._musicVolState.base = baseTarget;
          this._applyMusicVolume();
        }
      }
      return;
    }

    // Prepare new sound (attempt regardless of exists() to avoid cache edge cases)
    let next = null;
    try {
      next = this.sound.add(key, { loop: !!loop, volume: 0 });
      next.play();

      // Set up low-pass filter for adaptive music (Web Audio API)
      this._setupMusicFilter(next);
    } catch (e) {
      next = null;
      // eslint-disable-next-line no-console
      try { console.info('[Audio] Could not start music for key:', key, e?.message || e); } catch {}
    }

    const prev = this.music?.sound || null;

    // Kill any existing volume tweens before starting new music
    if (this._musicVolTween) {
      try { this._musicVolTween.remove(); } catch {}
      this._musicVolTween = null;
    }
    if (this.scene?.tweens) {
      try { this.scene.tweens.killTweensOf(this._musicVolState); } catch {}
    }
    // Kill duck timeline if active
    if (this._duck?.timeline) {
      try { this._duck.timeline.destroy(); } catch {}
      this._duck.timeline = null;
    }

    if (next) {
      this.music = { key, sound: next };
      // Initialize base target to 0 and tween up to target (duck applied via _applyMusicVolume)
      this._musicVolState.base = 0;
      if (fade > 0 && this.scene?.tweens) {
        this._musicVolTween = this.scene.tweens.add({
          targets: this._musicVolState,
          base: baseTarget,
          duration: fade,
          ease: 'Sine.easeOut',
          onUpdate: () => this._applyMusicVolume(),
          onComplete: () => this._applyMusicVolume()
        });
      } else {
        this._musicVolState.base = baseTarget;
        this._applyMusicVolume();
      }
    } else {
      this.music = { key: null, sound: null };
    }

    if (prev) {
      const stopPrev = () => { try { prev.stop(); prev.destroy(); } catch {} };
      if (fade > 0 && this.scene?.tweens) {
        // Use a volume state object to avoid directly setting properties on the sound
        const volState = { vol: prev.volume };
        this.scene.tweens.add({
          targets: volState,
          vol: 0,
          duration: fade,
          ease: 'Sine.easeIn',
          onUpdate: () => {
            try {
              if (prev && prev.game && !prev.pendingRemove) {
                prev.setVolume(volState.vol);
              }
            } catch {}
          },
          onComplete: stopPrev
        });
      } else {
        stopPrev();
      }
    }
  }

  stopMusic(fade = 200) {
    const prev = this.music?.sound;
    if (!prev) return;

    // Kill any active volume tweens that call _applyMusicVolume
    if (this._musicVolTween) {
      try { this._musicVolTween.remove(); } catch {}
      this._musicVolTween = null;
    }
    if (this.scene?.tweens) {
      try { this.scene.tweens.killTweensOf(this._musicVolState); } catch {}
    }
    // Kill duck timeline if active
    if (this._duck?.timeline) {
      try { this._duck.timeline.destroy(); } catch {}
      this._duck.timeline = null;
    }

    const stopPrev = () => {
      try {
        prev.stop();
        prev.destroy();
      } catch {}
      // Clean up filter
      this._musicFilter = null;
    };
    if (fade > 0 && this.scene?.tweens) {
      // Use a volume state object to avoid directly setting properties on the sound
      const volState = { vol: prev.volume || 0 };
      this.scene.tweens.add({
        targets: volState,
        vol: 0,
        duration: fade,
        ease: 'Sine.easeIn',
        onUpdate: () => {
          try {
            if (prev && prev.game && !prev.pendingRemove) {
              prev.setVolume(volState.vol);
            }
          } catch {}
        },
        onComplete: stopPrev
      });
    } else {
      stopPrev();
    }
    this.music = { key: null, sound: null };
  }

  // Set up low-pass filter for adaptive music (Web Audio API)
  _setupMusicFilter(sound) {
    if (!this._hasWebAudio || !this._ctx) return;

    try {
      // Get the sound's audio node (Phaser exposes this on HTML5 audio sounds)
      const audioNode = sound?.source?.source;
      if (!audioNode) return;

      // Create low-pass filter
      const filter = this._ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(this._filterCutoff, this._ctx.currentTime);
      filter.Q.setValueAtTime(1, this._ctx.currentTime); // Gentle slope

      // Insert filter into signal chain
      // Disconnect from destination, route through filter
      audioNode.disconnect();
      audioNode.connect(filter);
      filter.connect(this._ctx.destination);

      this._musicFilter = filter;
    } catch (e) {
      // Filter setup failed - music will play unfiltered (graceful fallback)
      console.info('[Audio] Could not set up music filter:', e?.message || e);
    }
  }

  // Set low-pass filter cutoff frequency (adaptive music)
  setMusicFilterCutoff(freq, fade = 800) {
    this._filterCutoff = Math.max(20, Math.min(20000, freq));

    if (!this._musicFilter || !this._ctx) return;

    try {
      if (fade > 0) {
        // Smooth ramp to new cutoff frequency
        this._musicFilter.frequency.cancelScheduledValues(this._ctx.currentTime);
        this._musicFilter.frequency.setValueAtTime(
          this._musicFilter.frequency.value,
          this._ctx.currentTime
        );
        this._musicFilter.frequency.linearRampToValueAtTime(
          this._filterCutoff,
          this._ctx.currentTime + (fade / 1000)
        );
      } else {
        this._musicFilter.frequency.setValueAtTime(this._filterCutoff, this._ctx.currentTime);
      }
    } catch {}
  }

  // Internal: recompute and apply final music volume
  _applyMusicVolume() {
    const s = this.music?.sound;
    if (!s) return;

    // Check if sound is still valid (not destroyed)
    try {
      if (!s.game || s.pendingRemove) return;
    } catch {
      return; // Sound is in invalid state
    }

    const duck = this._duck?.mult ?? 1;
    const finalVol = Math.max(0, Math.min(1, (this._musicVolState.base || 0) * duck));
    try { s.setVolume(finalVol); } catch {}
  }

  // Music ducking API (WebAudio present only)
  duckMusic({ to = 0.6, attack = 60, hold = 120, release = 180, priority = 0 } = {}) {
    if (!this._hasWebAudio) return; // safe no-op in HTML5 path
    const now = performance.now();

    // If a higher priority duck is active, ignore lower ones
    if (this._duck.timeline && this._duck.priority > priority) return;

    // If equal/higher arrives, restart sequence from current multiplier and extend window
    const startMult = Math.max(0.0001, this._duck.mult || 1);

    // Cancel existing timeline if any
    try { this._duck.timeline?.stop(); } catch {}

    const token = (this._duck.token || 0) + 1;
    this._duck.token = token;
    this._duck.priority = priority;

    const targetMult = Math.max(0.0001, startMult * Math.max(0, Math.min(1, to)));
    const tl = this.scene?.tweens?.createTimeline();
    if (!tl) return;

    // Attack
    tl.add({
      targets: this._duck,
      mult: targetMult,
      duration: Math.max(0, attack|0),
      ease: 'Sine.easeOut',
      onUpdate: () => this._applyMusicVolume()
    });
    // Hold
    tl.add({
      targets: this._duck,
      mult: targetMult,
      duration: Math.max(0, hold|0),
      ease: 'Linear',
      onUpdate: () => this._applyMusicVolume()
    });
    // Release
    tl.add({
      targets: this._duck,
      mult: 1,
      duration: Math.max(0, release|0),
      ease: 'Sine.easeIn',
      onUpdate: () => this._applyMusicVolume(),
      onComplete: () => {
        if (this._duck.token === token) {
          this._duck.timeline = null;
          this._duck.priority = -1;
          this._duck.mult = 1;
          this._applyMusicVolume();
        }
      }
    });

    const totalMs = Math.max(0, attack|0) + Math.max(0, hold|0) + Math.max(0, release|0);
    this._duck.endAt = now + totalMs;
    this._duck.timeline = tl;
    // Start from current value
    tl.play();
  }

  // Convenience wrappers
  duckForGunshot() { this.duckMusic({ to: 0.75, attack: 20, hold: 100, release: 120, priority: 1 }); }
  duckForImpact() { this.duckMusic({ to: 0.7, attack: 25, hold: 160, release: 180, priority: 2 }); }
  duckForEngineStart() { this.duckMusic({ to: 0.55, attack: 40, hold: 250, release: 250, priority: 3 }); }
  duckForExtract() { this.duckMusic({ to: 0.45, attack: 50, hold: 500, release: 300, priority: 4 }); }

  // Engine SFX helpers (SFX bus); crossfade start into idle
  startEngineLoop(/* pos */) {
    // Trigger start one-shot and duck music briefly
    try { this.play('engine_start', { volume: 0.85, rateRand: 0.01 }); } catch {}
    try { this.duckForEngineStart(); } catch {}

    // If idle already playing, just ensure it's audible
    if (this._engineIdle && this._engineIdle.sound) {
      // Kill existing tween before creating new one
      if (this._engineIdle.tween) {
        try { this._engineIdle.tween.remove(); } catch {}
      }
      if (this._engineIdle.volState && this.scene?.tweens) {
        try { this.scene.tweens.killTweensOf(this._engineIdle.volState); } catch {}
      }

      const finalTarget = 0.65 * this.masterVolume * (this.muted ? 0 : 1) * this._volSfx;
      const idle = this._engineIdle.sound;
      if (!this._engineIdle.volState) {
        this._engineIdle.volState = { vol: idle.volume || 0 };
      }
      try {
        this._engineIdle.tween = this.scene?.tweens?.add({
          targets: this._engineIdle.volState,
          vol: finalTarget,
          duration: 250,
          ease: 'Sine.easeOut',
          onUpdate: () => {
            try {
              if (idle && idle.game && !idle.pendingRemove) {
                idle.setVolume(this._engineIdle.volState.vol);
              }
            } catch {}
          }
        });
      } catch {}
      return;
    }

    // Start idle loop (even if not cached; will no-op safely)
    let idle = null;
    try {
      idle = this.sound.add('engine_idle', { loop: true, volume: 0 });
      idle.play();
    } catch { idle = null; }
    if (!idle) return;

    const finalTarget = 0.65 * this.masterVolume * (this.muted ? 0 : 1) * this._volSfx;
    const volState = { vol: 0 };
    this._engineIdle = { sound: idle, tween: null, volState };
    try {
      this._engineIdle.tween = this.scene?.tweens?.add({
        targets: volState,
        vol: finalTarget,
        duration: 350,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          try {
            if (idle && idle.game && !idle.pendingRemove) {
              idle.setVolume(volState.vol);
            }
          } catch {}
        }
      });
    } catch {}
  }

  stopEngineLoop() {
    const idle = this._engineIdle?.sound;
    if (!idle) return;

    // Kill any running tweens on volume state to prevent "Cannot set properties of null" error
    if (this._engineIdle?.tween) {
      try { this._engineIdle.tween.remove(); } catch {}
      this._engineIdle.tween = null;
    }
    if (this._engineIdle?.volState && this.scene?.tweens) {
      try { this.scene.tweens.killTweensOf(this._engineIdle.volState); } catch {}
    }

    const stopIdle = () => { try { idle.stop(); idle.destroy(); } catch {} this._engineIdle = null; };

    // Use volume state object to safely fade out
    if (this._engineIdle?.volState) {
      const volState = this._engineIdle.volState;
      volState.vol = idle.volume || 0;
      try {
        this.scene?.tweens?.add({
          targets: volState,
          vol: 0,
          duration: 250,
          ease: 'Sine.easeIn',
          onUpdate: () => {
            try {
              if (idle && idle.game && !idle.pendingRemove) {
                idle.setVolume(volState.vol);
              }
            } catch {}
          },
          onComplete: stopIdle
        });
      } catch { stopIdle(); }
    } else {
      stopIdle();
    }
  }
}

export default AudioManager;

// Scene helper: attach convenience SFX + volume controls
export function attachAudio(scene) {
  const audio = AudioManager.get(scene);
  return {
    gun: (/* pos */) => { audio.play('gun_fire', { volume: 0.8, rateRand: 0.06 }); audio.duckForGunshot(); },
    impact: (/* pos */) => { audio.play('impact', { volume: 0.85, rateRand: 0.05 }); audio.duckForImpact(); },
    reward: (/* pos */) => { audio.play('pickup', { volume: 0.7, rateRand: 0.04 }); /* no ducking for crisp UI */ },
    engineStart: (pos) => { audio.startEngineLoop(pos); },
    engineStop: () => { audio.stopEngineLoop(); },
    setSfxVolume: (v) => audio.setSfxVolume(v),
    getSfxVolume: () => audio.getSfxVolume(),
    setMusicVolume: (v) => audio.setMusicVolume(v),
    getMusicVolume: () => audio.getMusicVolume()
  };
}
