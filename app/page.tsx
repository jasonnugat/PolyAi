import Link from "next/link";
import { getLectures } from "@/lib/db/actions/getlectures";
import { loadDuration } from "@/lib/transcript";
import { formatDate, formatDuration, toDateTime } from "@/lib/format";

const lectures = await getLectures();

// Chronologisch: älteste Vorlesung zuerst, ohne Datum ans Ende
const videos = [...lectures].sort((a, b) => {
  const da = a.date ? new Date(a.date).getTime() : Infinity;
  const db = b.date ? new Date(b.date).getTime() : Infinity;
  return da - db || a.id - b.id;
});

const durations = new Map(
  await Promise.all(
    videos.map(async (vid) => [vid.id, await loadDuration(String(vid.id))] as const)
  )
);

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-content px-6 pt-14 pb-10 lg:px-12 lg:pt-20 lg:pb-14">
        <p className="text-small font-medium text-secondary">
          {videos.length === 1 ? "1 Vorlesung" : `${videos.length} Vorlesungen`}
        </p>
        <h1 className="mt-2 text-display">Vorlesungen</h1>
        <p className="mt-4 max-w-[46ch] text-body text-secondary">
          Aufzeichnungen mit Zusammenfassung, Untertiteln und einem Chat, der
          direkt an die passende Stelle im Video springt.
        </p>
      </section>

      <section
        className="mx-auto max-w-content px-6 pb-24 lg:px-12"
        aria-label="Vorlesungen"
      >
        {videos.length === 0 ? (
          <p className="text-body text-secondary">Noch keine Vorlesungen.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((vid) => {
              const dateTime = toDateTime(vid.date);
              const duration = durations.get(vid.id);

              return (
                <li key={vid.id}>
                  <Link
                    href={`/video/${vid.id}`}
                    className="group block rounded-card focus-ring"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-card bg-raised ring-1 ring-inset ring-hairline transition-[transform,box-shadow] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-lift">
                      <span className="absolute left-4 top-3.5 text-caption font-medium text-secondary">
                        Vorlesung {vid.id}
                      </span>
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center font-semibold leading-none tracking-tighter text-foreground/[0.07] transition-colors duration-200 ease-out group-hover:text-foreground/[0.14]"
                        style={{ fontSize: "clamp(4.5rem, 24cqw, 7rem)" }}
                      >
                        {String(vid.id).padStart(2, "0")}
                      </span>
                      {duration != null && (
                        <span className="absolute bottom-3 right-3 rounded-full bg-background/85 px-2.5 py-1 text-caption font-medium tabular-nums text-foreground ring-1 ring-hairline backdrop-blur">
                          {formatDuration(duration)}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-4 text-heading leading-snug">{vid.title}</h2>
                    <p className="mt-1 text-small text-secondary">
                      {dateTime ? (
                        <time dateTime={dateTime}>{formatDate(vid.date)}</time>
                      ) : (
                        formatDate(vid.date)
                      )}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
