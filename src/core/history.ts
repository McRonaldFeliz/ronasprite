import { PixelImage } from './image';

interface Snapshot {
  cel: PixelImage;
  before: Uint32Array;
  after: Uint32Array;
}

/**
 * Desfazer/refazer simples baseado em "fotos" das células alteradas.
 * Uso: begin(células) antes de editar, commit() depois.
 */
export class History {
  private undoStack: Snapshot[][] = [];
  private redoStack: Snapshot[][] = [];
  private pending: { cel: PixelImage; before: Uint32Array }[] | null = null;

  begin(cels: PixelImage[]): void {
    this.pending = cels.map((cel) => ({ cel, before: cel.data.slice() }));
  }

  commit(): void {
    if (!this.pending) return;
    const step = this.pending
      .map((p) => ({ ...p, after: p.cel.data.slice() }))
      .filter((s) => s.before.some((v, i) => v !== s.after[i]));
    this.pending = null;
    if (step.length) {
      this.undoStack.push(step);
      this.redoStack = [];
    }
  }

  undo(): boolean {
    const step = this.undoStack.pop();
    if (!step) return false;
    for (const s of step) s.cel.data.set(s.before);
    this.redoStack.push(step);
    return true;
  }

  redo(): boolean {
    const step = this.redoStack.pop();
    if (!step) return false;
    for (const s of step) s.cel.data.set(s.after);
    this.undoStack.push(step);
    return true;
  }
}
