"use client";

import { useLayoutEffect, useRef } from "react";

export default function LecturePlayer({ videoId }: { videoId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useLayoutEffect(() => {
    const video = videoRef.current;

    // Next.js preserves hidden pages. Pause on hide/unmount without resetting progress.
    return () => video?.pause();
  }, [videoId]);

  return (
    <video
      ref={videoRef}
      id="lecture-video"
      src={`/videos/${videoId}.mp4`}
      controls
      aria-label={`Lecture ${videoId} video`}
      className="lecture-video"
    >
      <track
        src={`/videos/${videoId}.vtt`}
        kind="subtitles"
        srcLang="de"
        label="German"
        default
      />
    </video>
  );
}
