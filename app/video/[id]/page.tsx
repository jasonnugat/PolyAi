import Link from "next/link";
import { Suspense } from "react";
import Chat from "@/components/Chat";
import { getSummary } from "@/lib/db/actions/getsummary";
import Comments from "@/components/Comments";
import { getComments, type Comment } from "@/lib/db/actions/getcomments";

type Params = Promise<{ id: string }>;

async function VideoPlayer({ params }: { params: Params }) {
  const { id } = await params;

  return (
    <video
      id="lecture-video"
      src={`/videos/${id}.mp4`}
      controls
      className="aspect-video w-full rounded-lg border border-gray-300 bg-black"
    >
      <track
        src={`/videos/${id}.vtt`}
        kind="subtitles"
        srcLang="de"
        label="Deutsch"
        default
      />
    </video>
  );
}

async function SummarySection({ params }: { params: Params }) {
  const { id } = await params;
  const summary = await getSummary(Number(id));

  return (
    <section className="min-h-64 rounded-lg border border-gray-300 p-4">
      <h2 className="mb-2 font-semibold">Summary</h2>
      <p className="whitespace-pre-wrap text-gray-700">
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
      <section className="rounded-lg border border-gray-300 p-4">
        <h2 className="mb-2 font-semibold">Kommentare</h2>
        <p className="text-sm text-gray-500">
          Kommentare konnten nicht geladen werden.
        </p>
      </section>
    );
  }

  return <Comments key={id} summaryId={summaryId} initialComments={comments} />;
}

export default function VideoPage({ params }: { params: Params }) {
  return (
    <main className="min-h-screen bg-white p-6 text-gray-900">
      <Link href="/" className="mb-4 inline-block text-2xl hover:text-gray-500">
        ←
      </Link>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Linke Spalte: Video + Summary */}
        <div className="flex flex-col gap-6">
          <Suspense
            fallback={
              <div className="aspect-video w-full rounded-lg border border-gray-300 bg-gray-100" />
            }
          >
            <VideoPlayer params={params} />
          </Suspense>

          <Suspense
            fallback={
              <section className="min-h-64 rounded-lg border border-gray-300 p-4">
                <h2 className="mb-2 font-semibold">Summary</h2>
                <p className="text-gray-500">
                  Hier erscheint die Zusammenfassung des Videos.
                </p>
              </section>
            }
          >
            <SummarySection params={params} />
          <section className="min-h-64 rounded-lg border border-gray-300 p-4">
            <h2 className="mb-2 font-semibold">Summary</h2>
            <p className="text-gray-500">
              Hier erscheint die Zusammenfassung des Videos.
            </p>
          </section>

          <Suspense
            fallback={
              <div className="min-h-48 rounded-lg border border-gray-300" />
            }
          >
            <CommentsSection params={params} />
          </Suspense>
        </div>

        {/* Rechte Spalte: Chat */}
        <Suspense
          fallback={<div className="min-h-96 rounded-lg border border-gray-300" />}
        >
          <ChatSection params={params} />
        </Suspense>
      </div>
    </main>
  );
}