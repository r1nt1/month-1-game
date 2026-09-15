/** Seconds from appearance to alignment; the first moving block is number 1. */
export function travelTime(blockNumber: number): number {
  return Math.max(0.75, 1 - (blockNumber - 1) * 0.01);
}

export function overlap(center: number, target: number, size: number) {
  const low = Math.max(center - size / 2, target - size / 2);
  const high = Math.min(center + size / 2, target + size / 2);
  return { size: Math.max(0, high - low), center: (low + high) / 2 };
}
