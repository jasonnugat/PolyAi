"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/Icon";

export default function SummaryPanel({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    // Recheck the full text when wrapping or font metrics change.
    const observer = new ResizeObserver(() => {
      if (content.getBoundingClientRect().width === 0) return;
      const lineHeight = Number.parseFloat(getComputedStyle(content).lineHeight);
      setHasOverflow(content.scrollHeight > lineHeight * 6 + 1);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [children]);

  function toggleExpanded() {
    if (expanded && panelRef.current && panelRef.current.getBoundingClientRect().top < 0) {
      panelRef.current.scrollIntoView({ block: "start", behavior: "auto" });
    }
    setExpanded((value) => !value);
  }

  return (
    <section ref={panelRef} className="panel summary-panel" aria-labelledby={`${id}-title`}>
      <div className="panel-heading">
        <Icon name="document" />
        <h2 id={`${id}-title`} className="panel-title">Summary</h2>
      </div>
      <div
        id={`${id}-content`}
        className="summary-preview"
        data-expanded={expanded}
        data-overflow={hasOverflow}
        onFocusCapture={(event) => {
          if (expanded) return;
          const preview = event.currentTarget;
          const bounds = preview.getBoundingClientRect();
          const focused = event.target.getBoundingClientRect();
          // Keyboard navigation must not leave focus on a clipped chapter marker.
          if (preview.scrollTop > 0 || focused.bottom > bounds.bottom || focused.top < bounds.top) {
            setExpanded(true);
            preview.scrollTop = 0;
          }
        }}
      >
        <div ref={contentRef} className="summary-content">
          {children}
        </div>
      </div>
      {hasOverflow && (
        <button
          type="button"
          className="summary-toggle"
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          onClick={toggleExpanded}
        >
          {expanded ? "Show less" : "Show more"}
          <Icon name="chevron-down" size={14} />
        </button>
      )}
    </section>
  );
}
