import { getLectures } from '@/lib/db/actions/getlectures';
import LectureLibrary from "@/components/LectureLibrary";
import { formatDate } from "@/lib/formatDate";

const videos = await getLectures();

export default function Home() {
  return (
    <main id="main-content" className="library-page">
      <div className="library-heading">
        <h1>Your lectures.</h1>
        <p>Watch. Ask. Understand.</p>
      </div>

      <LectureLibrary
        lectures={videos.map(({ id, title, date }) => ({
          id,
          title,
          date,
          displayDate: formatDate(date),
        }))}
      />
    </main>
  );
}
