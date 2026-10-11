"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

type Lecture = {
  id: number | string;
  title: string | null;
  date: string | null;
  displayDate: string;
};

type SortOrder = "newest" | "oldest" | "title";

const titleOrder = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export default function LectureLibrary({ lectures }: { lectures: Lecture[] }) {
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const sortedLectures = [...lectures].sort((a, b) => {
    const idOrder = titleOrder.compare(String(a.id), String(b.id));
    if (sortOrder === "title") {
      return titleOrder.compare(a.title ?? "", b.title ?? "") || idOrder;
    }

    const dateA = Date.parse(a.date ?? "");
    const dateB = Date.parse(b.date ?? "");
    // Keep lectures without a valid date at the end in either direction.
    if (!Number.isFinite(dateA)) return Number.isFinite(dateB) ? 1 : idOrder;
    if (!Number.isFinite(dateB)) return -1;

    return sortOrder === "newest"
      ? dateB - dateA || -idOrder
      : dateA - dateB || idOrder;
  });

  return (
    <>
      <div className="library-toolbar">
        <div className="library-toolbar-heading">
          <h2 className="lecture-count">
            {lectures.length} {lectures.length === 1 ? "lecture" : "lectures"}
          </h2>
        </div>
        <div className="lecture-sort">
          <select
            aria-label="Sort lectures"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
          </select>
          <Icon name="chevron-down" size={14} />
        </div>
      </div>

      <div className="lecture-grid">
        {sortedLectures.map((lecture) => (
          <Link
            key={lecture.id}
            href={`/video/${lecture.id}`}
            className="lecture-card"
          >
            <div className="lecture-card-top">
              <span className="lecture-play"><Icon name="play" size={21} /></span>
              <span className="lecture-number">Lecture {lecture.id}</span>
            </div>
            <h3>{lecture.title}</h3>
            <div className="lecture-card-bottom">
              <span>{lecture.displayDate}</span>
              <Icon name="arrow-up-right" size={18} />
            </div>
          </Link>
        ))}
      </div>
      {lectures.length === 0 && <p className="library-empty muted">No lectures yet.</p>}
    </>
  );
}
