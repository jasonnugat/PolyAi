"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

export default function LecturePlayer({ videoId }: { videoId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timestamp = useSearchParams().get("t");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || timestamp === null || !/^\d+$/.test(timestamp)) return;
    const seconds = Number(timestamp);
    if (!Number.isSafeInteger(seconds)) return;

    // Timestamp navigation belongs to the player, independent of chat loading.
    const seek = () => {
      video.currentTime = seconds;
      video.play().catch(() => {});
      video.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener("loadedmetadata", seek, { once: true });
    return () => video.removeEventListener("loadedmetadata", seek);
  }, [timestamp, videoId]);

  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) return;

      // Preserve typing, cursor movement, and keyboard activation of other controls.
      const target = event.target;
      if (target instanceof Element && target.closest(
        'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="slider"], [role="button"], [role="link"]',
      )) return;

      if (event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        if (event.repeat) return;

        if (video.paused) {
          void video.play().catch(() => {
            // Loading or navigation can interrupt a pending play request.
          });
        } else {
          video.pause();
        }
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (!Number.isFinite(video.duration)) return;

        event.preventDefault();
        event.stopPropagation();
        const offset = event.key === "ArrowRight" ? 5 : -5;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + offset));
      }
    };

    // Intercept native player shortcuts before they can apply a second seek/toggle.
    document.addEventListener("keydown", onKeyDown, true);

    // Next.js preserves hidden pages. Pause on hide/unmount without resetting progress.
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      video.pause();
    };
  }, [videoId]);

  return (
    <video
      ref={videoRef}
      id="lecture-video"
      src={`/videos/${videoId}.mp4`}
      controls
      aria-label={`Lecture ${videoId} video`}
      aria-keyshortcuts="Space ArrowLeft ArrowRight"
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
