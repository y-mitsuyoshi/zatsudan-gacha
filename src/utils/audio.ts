// Simple Audio Manager using Web Audio API
// Generates retro-style sound effects and simple BGM without external assets

class AudioManager {
  private ctx: AudioContext | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmGain: GainNode | null = null;
  private isBgmPlaying: boolean = false;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Initialize on user interaction usually, but we'll try to init lazily
      // window.AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    }
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    return this.ctx;
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBgm();
    } else {
      // Resume BGM if it was supposed to be playing? 
      // For now, just stop.
    }
    return this.isMuted;
  }

  // --- Sound Effects ---

  public playSe(type: 'roll' | 'move' | 'good' | 'bad' | 'fanfare' | 'click') {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'roll':
        // Rattle sound
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.05);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;

      case 'move':
        // High pitched 'bloop'
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'good':
        // Major Arpeggio
        this.playNote(523.25, now, 0.1, 'triangle'); // C5
        this.playNote(659.25, now + 0.1, 0.1, 'triangle'); // E5
        this.playNote(783.99, now + 0.2, 0.2, 'triangle'); // G5
        this.playNote(1046.50, now + 0.3, 0.4, 'triangle'); // C6
        break;

      case 'bad':
        // Descending slide
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.5);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;

      case 'fanfare':
        // Victory fanfare
        const start = now;
        this.playNote(523.25, start, 0.15, 'square'); // C
        this.playNote(523.25, start + 0.15, 0.15, 'square'); // C
        this.playNote(523.25, start + 0.3, 0.15, 'square'); // C
        this.playNote(659.25, start + 0.45, 0.4, 'square'); // E
        this.playNote(783.99, start + 0.85, 0.4, 'square'); // G
        this.playNote(1046.50, start + 1.25, 0.8, 'square'); // C
        break;
    }
  }

  private playNote(freq: number, time: number, duration: number, type: OscillatorType = 'sine') {
    if (this.isMuted) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.start(time);
    osc.stop(time + duration);
  }

  // --- BGM (Simple Loop) ---

  public playBgm() {
    if (this.isBgmPlaying || this.isMuted) return;
    this.isBgmPlaying = true;
    const ctx = this.getContext();
    if (ctx.state === 'suspended') ctx.resume();

    // Simple bassline loop
    const tempo = 0.5; // seconds per beat
    const notes = [261.63, 293.66, 329.63, 392.00]; // C D E G
    
    // We use a recursive function to schedule notes to create a loop
    // Ideally we would use AudioWorklet or a proper scheduler, but setTimeout is okay for simple stuff
    this.scheduleBgmNote(0);
  }

  private scheduleBgmNote(index: number) {
    if (!this.isBgmPlaying) return;
    
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const noteDuration = 0.4;
    const interval = 0.5;

    // Play a simple happy melody
    // C4, E4, G4, E4...
    const melody = [
        261.63, 329.63, 392.00, 329.63, 
        293.66, 349.23, 440.00, 349.23,
        261.63, 329.63, 392.00, 329.63,
        392.00, 329.63, 293.66, 246.94
    ];
    
    const freq = melody[index % melody.length];
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    
    // Soft envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + noteDuration);
    
    osc.start(now);
    osc.stop(now + noteDuration);
    
    this.bgmOscillators.push(osc); // Keep track to stop if needed (though they stop themselves)

    // Schedule next note
    setTimeout(() => {
        this.scheduleBgmNote(index + 1);
    }, interval * 1000);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    // Oscillators stop automatically in this simple implementation
    // But we could clear timeouts if we stored the timer ID
  }
}

export const audioManager = new AudioManager();
