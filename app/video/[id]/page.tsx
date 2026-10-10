import Link from "next/link";
import { Suspense } from "react";

type Params = Promise<{ id: string }>;

// Liest die ID aus der URL. Läuft in einer <Suspense>-Grenze,
// damit der Rest der Seite sofort angezeigt werden kann.
async function VideoPlayer({ params }: { params: Params }) {
  const { id } = await params;

  return (
    <video
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

export default function VideoPage({ params }: { params: Params }) {
  return (
    <main className="min-h-screen bg-white p-6 text-gray-900">
      {/* Zurück-Pfeil */}
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

          <section className="min-h-64 rounded-lg border border-gray-300 p-4">
            <h2 className="mb-2 font-semibold">Summary</h2>
            <p className="text-gray-500">
              Hier erscheint die Zusammenfassung des Videos.
            </p>
          </section>
        </div>

        {/* Rechte Spalte: Chat */}
        <aside className="flex min-h-96 flex-col rounded-lg border border-gray-300 p-4">
          <div className="flex flex-1 flex-col justify-end gap-3">
            <div className="max-w-[80%] self-end rounded-2xl bg-gray-200 px-4 py-2">
              Worum geht es im Video?
            </div>
            <div className="max-w-[80%] self-start rounded-2xl border border-gray-300 px-4 py-2">
              Das Video erklärt …
            </div>
          </div>

          <input
            type="text"
            placeholder="Frage stellen …"
            className="mt-4 w-full rounded-full border border-gray-300 px-4 py-2 outline-none focus:border-gray-500"
          />
        </aside>
      </div>
    </main>
  );
}
