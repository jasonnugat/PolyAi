import Link from "next/link";
import { Suspense } from "react";
import Chat from "@/components/Chat";
import { getSummary } from "@/lib/db/actions/getsummary";
import Comments from "@/components/Comments";
import { getComments, type Comment } from "@/lib/db/actions/getcomments";
import Icon from "@/components/Icon";
import { getLecture } from "@/lib/db/actions/getlectures";
import { formatDate } from "@/lib/formatDate";
import LecturePlayer from "@/components/LecturePlayer";

type Params = Promise<{ id: string }>;

async function VideoLabel({ params }: { params: Params }) {
  const { id } = await params;
  return <span className="lecture-label">Lecture {id}</span>;
}

async function VideoDetails({ params }: { params: Params }) {
  const { id } = await params;
  const lecture = await getLecture(Number(id)).catch((error) => {
    console.error("Lecture details could not be loaded:", error);
    return null;
  });
  const date = formatDate(lecture?.date);

  return (
    <div className="lecture-details">
      <h1>{lecture?.title || `Lecture ${id}`}</h1>
      {date && <time dateTime={lecture?.date}>{date}</time>}
    </div>
  );
}

async function VideoPlayer({ params }: { params: Params }) {
  const { id } = await params;
  return <LecturePlayer videoId={id} />;
}

async function SummarySection({ params }: { params: Params }) {
  const { id } = await params;
  const summary = await getSummary(Number(id));

  return (
    <section className="panel summary-panel">
      <div className="panel-heading">
        <Icon name="document" />
        <h2 className="panel-title">Summary</h2>
      </div>
      <p className="summary-content">
        {summary || "No summary available yet."}
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
      <section className="panel comments-panel">
        <h2 className="panel-title">Comments</h2>
        <p className="muted">
          Comments could not be loaded.
        </p>
      </section>
    );
  }

  return <Comments key={id} summaryId={summaryId} initialComments={comments} />;
}

export default function VideoPage({ params }: { params: Params }) {
  return (
    <main id="main-content" className="video-page">
      <div className="video-page-heading">
        <Link href="/" className="back-link">
          <Icon name="arrow-left" size={18} />
          All lectures
        </Link>
        <Suspense fallback={<span className="lecture-label">Lecture</span>}>
          <VideoLabel params={params} />
        </Suspense>
      </div>

      <div className="video-layout">
        {/* Linke Spalte: Video + Summary */}
        <div className="video-main">
          <div className="video-overview">
            <Suspense
              fallback={
                <div className="lecture-video skeleton" aria-label="Loading video" />
              }
            >
              <VideoPlayer params={params} />
            </Suspense>
            <Suspense
              fallback={
                <div className="lecture-details">
                  <p className="muted" role="status">Loading lecture details …</p>
                </div>
              }
            >
              <VideoDetails params={params} />
            </Suspense>
          </div>

          <Suspense
            fallback={
              <section className="panel summary-panel">
                <div className="panel-heading">
                  <Icon name="document" />
                  <h2 className="panel-title">Summary</h2>
                </div>
                <p className="muted" role="status">Loading …</p>
              </section>
            }
          >
            <SummarySection params={params} />
          </Suspense>

          <Suspense
            fallback={
              <div className="panel comments-panel skeleton" aria-label="Loading comments" />
            }
          >
            <CommentsSection params={params} />
          </Suspense>
        </div>

        {/* Rechte Spalte: Chat */}
        <Suspense
          fallback={
            <div className="panel chat-panel skeleton" aria-label="Loading chat" />
          }
        >
          <ChatSection params={params} />
        </Suspense>
      </div>
    </main>
  );
}
