// Simple Sound Manager using Web Audio API
// This avoids needing external audio files.

export class SoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private bgmOscillators: OscillatorNode[] = [];
    private isMuted: boolean = false;
    private isBgmPlaying: boolean = false;

    constructor() {
        try {
            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.value = 0.3; // Master volume
                this.masterGain.connect(this.ctx.destination);
            }
        } catch (e) {
            console.error("Web Audio API not supported or failed to init", e);
        }
    }

    public resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public playShoot() {
        if (!this.ctx || this.isMuted || !this.masterGain) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'square';
        osc.frequency.setValueAtTime(880, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    public playExplosion() {
        if (!this.ctx || this.isMuted || !this.masterGain) return;
        this.resume();

        const duration = 0.3;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + duration);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    public playPowerUp() {
        if (!this.ctx || this.isMuted || !this.masterGain) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + 0.1);
        osc.frequency.linearRampToValueAtTime(1760, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    public playDamage() {
        if (!this.ctx || this.isMuted || !this.masterGain) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    public playBGM() {
        if (!this.ctx || this.isMuted || !this.masterGain || this.isBgmPlaying) return;
        this.resume();
        this.isBgmPlaying = true;

        // Simple bass line loop
        this.playNoteLoop();
    }

    public stopBGM() {
        this.isBgmPlaying = false;
        this.bgmOscillators.forEach(osc => {
            try { osc.stop(); } catch (e) {}
        });
        this.bgmOscillators = [];
    }

    private playNoteLoop() {
        if (!this.ctx || !this.isBgmPlaying || !this.masterGain) return;

        // 120 BPM = 0.5s per beat
        const now = this.ctx.currentTime;
        const beat = 0.25; // 16th notesish

        const notes = [110, 110, 130, 110, 146, 110, 130, 110]; // Simple riff

        notes.forEach((freq, index) => {
             const osc = this.ctx!.createOscillator();
             const gain = this.ctx!.createGain();

             osc.connect(gain);
             gain.connect(this.masterGain!);

             osc.type = 'square';
             osc.frequency.value = freq;

             const startTime = now + (index * beat);
             const duration = 0.1;

             gain.gain.setValueAtTime(0.1, startTime);
             gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

             osc.start(startTime);
             osc.stop(startTime + duration);
        });

        setTimeout(() => {
            if (this.isBgmPlaying) this.playNoteLoop();
        }, notes.length * beat * 1000);
    }
}

export const soundManager = new SoundManager();
