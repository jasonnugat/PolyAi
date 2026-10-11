"use client";

import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { splitVideoTimestamps } from "@/lib/videoTimestamps";

export default function TimestampText({ text, videoId }: { text: string; videoId: string }) {
  const router = useRouter();

  return splitVideoTimestamps(text, videoId).map((part, index) => {
    if (part.type === "text") return part.text;
    const external = part.videoId !== videoId;

    return (
      <button
        key={index}
        type="button"
        className={external ? "timestamp timestamp--external" : "timestamp"}
        aria-label={external
          ? `Open video ${part.videoId} at ${part.time}`
          : `Jump to ${part.time} in the video`}
        onClick={(event) => {
          if (external) {
            router.push(`/video/${part.videoId}?t=${part.seconds}`);
            return;
          }
          // Cached lecture pages may remain mounted: target this button's own player.
          const video = event.currentTarget.closest(".video-page")
            ?.querySelector<HTMLVideoElement>("video.lecture-video");
          if (!video) return;
          video.currentTime = part.seconds;
          video.play().catch(() => {});
          video.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }}
      >
        <Icon name={external ? "arrow-up-right" : "play"} size={12} />
        {external ? ` Video ${part.videoId} · ${part.time}` : ` ${part.time}`}
      </button>
    );
  });
}
