import Link from "next/link";
import { getLectures } from '@/lib/db/actions/getlectures';

const videos = await getLectures();

export default function Home() {
  return (
    <main className="min-h-screen bg-white px-8 py-12 text-gray-900">
      <h1 className="mb-12 text-center text-5xl font-bold tracking-tight">
        PolyAi
      </h1>

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((vid) => (
          <Link
            key={vid.id}
            href={`/video/${vid.id}`}
            className="flex aspect-video items-center justify-center rounded-lg border border-gray-300 bg-gray-50 text-gray-500 transition hover:border-gray-500 hover:bg-gray-100"
          >
            {vid.title}<br />
            {vid.date}
          </Link>
        ))}
      </div>
    </main>
  );
}
