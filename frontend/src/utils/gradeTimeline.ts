import { SIGAA_TIME_SLOTS as slots } from "@/types/turma";
const minutes = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};
export const formatGradeTime = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const pairs = [
  [slots.M["1"], slots.M["2"]],
  [slots.M["3"], slots.M["4"]],
  [slots.M["5"], slots.T["1"]],
  [slots.T["2"], slots.T["3"]],
  [slots.T["4"], slots.T["5"]],
  [slots.T["6"], slots.T["6"]],
  [slots.N["1"], slots.N["2"]],
  [slots.N["3"], slots.N["4"]],
];
export function buildGradeTimeline(events: { start: number; end: number; minHeight?: number }[]) {
  const ranges = pairs.map(([a, b]) => ({
    start: minutes(a.start),
    end: minutes(b.end),
  }));
  if (events.length) {
    const start = Math.min(...events.map((e) => e.start));
    const end = Math.max(...events.map((e) => e.end));
    if (start < ranges[0].start)
      ranges.unshift({ start, end: ranges[0].start });
    if (end > ranges.at(-1)!.end)
      ranges.push({ start: ranges.at(-1)!.end, end });
  }
  const heights = ranges.map(range => range.end - range.start < 90 ? 64 : 96);
  for (const event of events) {
    const fractions = ranges.map(range => Math.max(0, Math.min(event.end, range.end) - Math.max(event.start, range.start)) / (range.end - range.start));
    const available = fractions.reduce((sum, fraction, index) => sum + fraction * heights[index], 0);
    if (available > 0 && event.minHeight && event.minHeight > available) {
      const scale = event.minHeight / available;
      fractions.forEach((fraction, index) => { if (fraction > 0) heights[index] *= scale; });
    }
  }
  let top = 0;
  const blocks = ranges.map((range, index) => {
    const height = heights[index];
    const block = { ...range, top, height };
    top += height;
    return block;
  });
  const position = (minute: number) => {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (minute <= b.end)
        return b.top + ((minute - b.start) / (b.end - b.start)) * b.height;
      const next = blocks[i + 1];
      if (next && minute < next.start)
        return (
          b.top + b.height
        );
    }
    return top;
  };
  return { blocks, height: top, position };
}
