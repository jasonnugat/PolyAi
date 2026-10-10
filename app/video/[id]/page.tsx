import Link from "next/link";
import { Suspense } from "react";
import Chat from "@/components/Chat";
import Comments from "@/components/Comments";
import { getSummary } from "@/lib/db/actions/getsummary";
import { getLecture } from "@/lib/db/actions/getlecture";
import { getComments, type Comment } from "@/lib/db/actions/getcomments";
import { formatDate, toDateTime } from "@/lib/format";

type Params = Promise<{ id: string }>;

async function VideoPlayer({ params }: { params: Params }) {
  const { id } = await params;

  return (
    <div className="overflow-hidden rounded-panel bg-black shadow-player ring-1 ring-hairline">
      <video
        id="lecture-video"
        src={`/videos/${id}.mp4`}
        controls
        className="aspect-video w-full focus-ring"
      >
        <track
          src={`/videos/${id}.vtt`}
          kind="subtitles"
          srcLang="de"
          label="Deutsch"
          default
        />
      </video>
    </div>
  );
}

async function SummarySection({ params }: { params: Params }) {
  const { id } = await params;
  const summary = await getSummary(Number(id));

  return (
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="text-title">
        Zusammenfassung
      </h2>
      <p
        className={
          summary
            ? "mt-5 max-w-[65ch] whitespace-pre-wrap text-body text-foreground/90"
            : "mt-5 max-w-[65ch] text-body text-secondary"
        }
      >
        {summary || "Keine Zusammenfassung vorhanden."}
      </p>
    </section>
  );
}

async function ChatSection({ params }: { params: Params }) {
  const { id } = await params;
  return <Chat videoId={id} />;
}

// Lädt die Kommentare der Summary serverseitig aus Supabase
// (die Video-ID aus der URL entspricht der summary-ID)
async function CommentsSection({ params }: { params: Params }) {
  const { id } = await params;
  const summaryId = Number(id);

  let comments: Comment[] = [];
  try {
    if (Number.isInteger(summaryId)) {
      comments = await getComments(summaryId);
    }
  } catch (error) {
    console.error("Kommentare konnten nicht geladen werden:", error);
    return (
      <section className="border-t border-hairline pt-10">
        <h2 className="text-title">Kommentare</h2>
        <p className="mt-4 text-small text-secondary">
          Kommentare konnten nicht geladen werden.
        </p>
      </section>
    );
  }

  return (
    <div className="border-t border-hairline pt-10">
      <Comments key={id} summaryId={summaryId} initialComments={comments} />
    </div>
  );
}

// Titel der Seite: braucht die ID aus den params, deshalb eigener Suspense-Block
// (params ausserhalb von Suspense würde das Prerendering der Route blockieren)
async function LectureTitle({ params }: { params: Params }) {
  const { id } = await params;
  const lecture = Number.isInteger(Number(id))
    ? await getLecture(Number(id)).catch(() => null)
    : null;
  const dateTime = toDateTime(lecture?.date);

  return (
    <div>
      <p className="flex flex-wrap items-center gap-x-2 text-small font-medium text-secondary">
        <span>Vorlesung {id}</span>
        {dateTime && (
          <>
            <span aria-hidden="true">·</span>
            <time dateTime={dateTime}>{formatDate(lecture?.date)}</time>
          </>
        )}
      </p>
      <h1 className="mt-1.5 text-headline">
        {lecture?.title || `Vorlesung ${id}`}
      </h1>
    </div>
  );
}

export default function VideoPage({ params }: { params: Params }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-content px-6 pt-8 pb-16 lg:px-12 lg:pt-10 lg:pb-24">
        <Link
          href="/"
          className="inline-flex items-center gap-1 rounded-md text-small font-medium text-secondary transition-colors duration-150 ease-out hover:text-foreground focus-ring"
        >
          <span aria-hidden="true">←</span> Alle Vorlesungen
        </Link>

        <header className="mt-5">
          <Suspense
            fallback={
              <div aria-hidden="true" className="flex flex-col gap-2">
                <div className="h-4 w-32 rounded-card bg-raised animate-skeleton" />
                <div className="h-8 w-80 max-w-full rounded-card bg-raised animate-skeleton" />
              </div>
            }
          >
            <LectureTitle params={params} />
          </Suspense>
        </header>

        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)] lg:items-start lg:gap-10">
          {/* Linke Spalte: Video + Zusammenfassung + Kommentare */}
          <div className="flex min-w-0 flex-col gap-12">
            <Suspense
              fallback={
                <div
                  aria-hidden="true"
                  className="aspect-video w-full rounded-panel bg-raised animate-skeleton"
                />
              }
            >
              <VideoPlayer params={params} />
            </Suspense>

            <Suspense
              fallback={
                <section aria-hidden="true">
                  <h2 className="text-title">Zusammenfassung</h2>
                  <div className="mt-5 flex max-w-[65ch] flex-col gap-3">
                    <div className="h-4 w-full rounded-card bg-raised animate-skeleton" />
                    <div className="h-4 w-full rounded-card bg-raised animate-skeleton" />
                    <div className="h-4 w-2/3 rounded-card bg-raised animate-skeleton" />
                  </div>
                </section>
              }
            >
              <SummarySection params={params} />
            </Suspense>

            <Suspense
              fallback={
                <div aria-hidden="true" className="border-t border-hairline pt-10">
                  <div className="h-48 rounded-card bg-raised animate-skeleton" />
                </div>
              }
            >
              <CommentsSection params={params} />
            </Suspense>
          </div>

          {/* Rechte Spalte: Chat */}
          <Suspense
            fallback={
              <div
                aria-hidden="true"
                className="h-[32rem] rounded-panel bg-raised animate-skeleton lg:sticky lg:top-20 lg:h-[calc(100vh-6.5rem)] lg:self-start"
              />
            }
          >
            <ChatSection params={params} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
