import { useEffect, useState, type RefObject } from "react";
import type { Class } from "@/types/turma";
import { meetings, WEEK_DAYS, type GradeEntry } from "@/utils/gradePlanner";
import { buildGradeTimeline, formatGradeTime } from "@/utils/gradeTimeline";
const colors = [
  "#B9ADF2",
  "#9DD6D9",
  "#E8BF96",
  "#E6AFCA",
  "#B2C1E8",
  "#B1D2AD",
];
export default function GradeCalendar({
  semester,
  selection,
  calendarRef,
}: {
  semester: string;
  selection: { entry: GradeEntry; item: Class }[];
  calendarRef: RefObject<HTMLElement | null>;
}) {
  const rawEvents = selection.flatMap(({ entry, item }, index) =>
    meetings(item).map((m) => ({ ...m, entry, item, index })),
  );

  // Calcula eventos com layout de colunas para matérias com horários coincidentes
  const events = WEEK_DAYS.flatMap((_, dayIndex) => {
    const dayEvents = rawEvents
      .filter((e) => e.day === dayIndex)
      .sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    const clusters: Array<typeof dayEvents> = [];
    let currentCluster: typeof dayEvents = [];
    let clusterEnd = -1;

    for (const ev of dayEvents) {
      if (!currentCluster.length) {
        currentCluster.push(ev);
        clusterEnd = ev.end;
      } else {
        if (ev.start < clusterEnd) {
          currentCluster.push(ev);
          clusterEnd = Math.max(clusterEnd, ev.end);
        } else {
          clusters.push(currentCluster);
          currentCluster = [ev];
          clusterEnd = ev.end;
        }
      }
    }
    if (currentCluster.length) {
      clusters.push(currentCluster);
    }

    const layoutResult: Array<typeof dayEvents[number] & { colIndex: number; totalCols: number; isConflict: boolean }> = [];
    for (const cluster of clusters) {
      const cols: number[] = [];
      const isConflict = cluster.length > 1;
      for (const ev of cluster) {
        let placed = false;
        for (let c = 0; c < cols.length; c++) {
          if (ev.start >= cols[c]) {
            cols[c] = ev.end;
            layoutResult.push({ ...ev, colIndex: c, totalCols: cluster.length, isConflict });
            placed = true;
            break;
          }
        }
        if (!placed) {
          layoutResult.push({ ...ev, colIndex: cols.length, totalCols: cluster.length, isConflict });
          cols.push(ev.end);
        }
      }
      // Ajusta o total de colunas reais do cluster
      const realTotalCols = cols.length;
      for (let i = layoutResult.length - cluster.length; i < layoutResult.length; i++) {
        layoutResult[i].totalCols = realTotalCols;
      }
    }

    return layoutResult;
  });

  const [contentHeights, setContentHeights] = useState<Record<string, number>>({});
  const eventKey = (event: typeof events[number]) => `${event.entry.code}-${event.day}-${event.start}-${event.end}`;
  useEffect(() => {
    const root = calendarRef.current;
    if (!root) return;
    const measure = () => {
      const next: Record<string, number> = {};
      root.querySelectorAll<HTMLElement>("[data-grade-content]").forEach(content => {
        next[content.dataset.gradeContent!] = Math.ceil(content.getBoundingClientRect().height) + 16;
      });
      setContentHeights(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const observer = new ResizeObserver(measure);
    root.querySelectorAll("[data-grade-content]").forEach(content => observer.observe(content));
    measure();
    return () => observer.disconnect();
  }, [selection, calendarRef]);
  const timeline = buildGradeTimeline(events.map(event => ({...event, minHeight:contentHeights[eventKey(event)] || 140})));
  return (
    <section
      ref={calendarRef}
      className="grade-calendar overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] p-5">
        <div>
          <h2 className="text-lg font-bold">Minha grade</h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Planejamento semanal · {selection.length} turmas
          </p>
        </div>
        <span className="rounded-lg bg-[var(--primary-soft)] px-3 py-2 text-sm font-bold text-[var(--primary-text)]">
          {semester || "Semestre"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[840px]">
          <div className="grid grid-cols-[64px_repeat(6,minmax(0,1fr))] border-b border-[var(--border-subtle)]">
            <div />
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className="p-3 text-center text-xs font-bold text-[var(--text-muted)]"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="relative" style={{ height: timeline.height }}>
            {timeline.blocks.map((block) => (
              <div
                key={block.start}
                className="absolute w-full border-t border-[var(--border-subtle)]"
                style={{ top: block.top, height: block.height }}
              >
                <div className="relative h-full w-16 text-center text-[10px] text-[var(--text-muted)]">
                  <span className="absolute inset-x-0 top-1">
                    {formatGradeTime(block.start)}
                  </span>
                  <span className="absolute inset-x-0 bottom-1">
                    {formatGradeTime(block.end)}
                  </span>
                </div>
              </div>
            ))}
            <div className="absolute inset-y-0 left-16 right-0 grid grid-cols-6">
              {WEEK_DAYS.map((day, dayIndex) => (
                <div
                  key={day}
                  className="relative border-l border-[var(--border-subtle)]"
                >
                  {events
                    .filter((e) => e.day === dayIndex)
                    .map((event, index) => {
                      const totalCols = event.totalCols || 1;
                      const colIndex = event.colIndex || 0;
                      const widthPct = 100 / totalCols;
                      const leftPct = colIndex * widthPct;

                      return (
                        <div
                          data-grade-event
                          key={`${event.entry.code}-${index}`}
                          className={`absolute flex flex-col items-center justify-center gap-1 overflow-hidden border px-1 py-1 text-center text-[10px] text-[#20202B] ${
                            event.isConflict
                              ? "border-2 border-red-600 ring-2 ring-red-400/50 shadow-md z-10"
                              : "border-black/20"
                          }`}
                          style={{
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            top: timeline.position(event.start),
                            height:
                              timeline.position(event.end) -
                              timeline.position(event.start),
                            backgroundColor: colors[event.index % colors.length],
                          }}
                          title={`${event.entry.name} · ${event.entry.code} · ${event.item.codigoTurma} · ${event.item.professor} · ${event.item.horarios} · ${event.item.local}${
                            event.isConflict ? " (AVISO: Choque de horário com outra matéria!)" : ""
                          }`}
                        >
                          <div data-grade-content={eventKey(event)} className="flex w-full shrink-0 flex-col items-center gap-1 break-words">
                            {event.isConflict && (
                              <span className="rounded bg-red-600 px-1 py-0.2 text-[8px] font-extrabold uppercase tracking-wider text-white">
                                Choque
                              </span>
                            )}
                            <strong className="w-full leading-tight">
                              {event.entry.name}
                            </strong>
                            <span className="w-full font-semibold">
                              {event.entry.code} · {event.item.codigoTurma}
                            </span>
                            <span className="w-full text-[9px]" title={event.item.professor}>{event.item.professor}</span>
                            {event.end - event.start >= 90 && (
                              <>
                                <span className="text-[9px]">
                                  {formatGradeTime(event.start)}–
                                  {formatGradeTime(event.end)}
                                </span>
                                <span className="w-full text-[9px] opacity-90">
                                  {event.item.local}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
