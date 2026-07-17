/**
 * Performance timing utility for measuring and logging step durations.
 */
export interface TimingStep {
  name: string;
  start: number;
  end?: number;
  durationMs?: number;
}

export class PerformanceTimer {
  private steps: TimingStep[] = [];
  private startTime: number;

  constructor(private label: string) {
    this.startTime = performance.now();
  }

  step(name: string): void {
    const now = performance.now();
    if (this.steps.length > 0) {
      const last = this.steps[this.steps.length - 1];
      if (!last.end) {
        last.end = now;
        last.durationMs = now - last.start;
      }
    }
    this.steps.push({ name, start: now });
  }

  end(): { totalMs: number; steps: TimingStep[] } {
    const now = performance.now();
    if (this.steps.length > 0) {
      const last = this.steps[this.steps.length - 1];
      if (!last.end) {
        last.end = now;
        last.durationMs = now - last.start;
      }
    }
    return {
      totalMs: now - this.startTime,
      steps: this.steps,
    };
  }

  log(): void {
    const result = this.end();
    console.log(`⏱️  [${this.label}] Total: ${result.totalMs.toFixed(2)}ms`);
    for (const step of result.steps) {
      console.log(`   - ${step.name}: ${(step.durationMs || 0).toFixed(2)}ms`);
    }
  }
}

export async function timeAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  console.log(`⏱️  [${label}] ${durationMs.toFixed(2)}ms`);
  return { result, durationMs };
}
