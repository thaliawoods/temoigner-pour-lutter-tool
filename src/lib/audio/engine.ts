export class AudioEngine {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loopingSource: AudioBufferSourceNode | null = null;

  ensure() {
    if (this.ctx) return;

    type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };
    const Ctx = window.AudioContext || (window as WebkitWindow).webkitAudioContext;
    if (!Ctx) throw new Error("AudioContext non supporté");

    this.ctx = new Ctx();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = 0.9;
    this.gain.connect(this.ctx.destination);
  }

  async loadBuffer(id: string, url: string) {
    this.ensure();
    if (!this.ctx) return;
    if (this.buffers.has(id)) return;

    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    const buf = await this.ctx.decodeAudioData(arr);
    this.buffers.set(id, buf);
  }

  playOneShot(id: string) {
    if (!this.ctx || !this.gain) return;
    const buf = this.buffers.get(id);
    if (!buf) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gain);
    src.start();
  }

  startLoop(id: string) {
    if (!this.ctx || !this.gain) return;
    const buf = this.buffers.get(id);
    if (!buf) return;

    this.stopLoop();

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.gain);
    src.start();
    this.loopingSource = src;
  }

  stopLoop() {
    try {
      this.loopingSource?.stop();
    } catch {}
    this.loopingSource = null;
  }

  silenceHard() {
    this.stopLoop();
  }
}
