import katex from "katex";
import { splitSummaryMath } from "@/lib/summaryMath";
import TimestampText from "@/components/TimestampText";

// Math stays server-rendered; timestamps and expand/collapse controls are interactive.
export default function SummaryText({ text, videoId }: { text: string | null; videoId: string }) {
  return splitSummaryMath(text || "No summary available yet.").map((part, index) => {
    if (part.type === "text") return <TimestampText key={index} text={part.text} videoId={videoId} />;
    try {
      const html = katex.renderToString(part.tex, {
        displayMode: part.display,
        output: "htmlAndMathml",
        throwOnError: true,
        trust: false,
        strict: "ignore",
        maxSize: 10,
        maxExpand: 1000,
      });
      const Element = part.display ? "div" : "span";
      return (
        <Element
          key={index}
          className={part.display ? "summary-math summary-math--block" : "summary-math"}
          // Only KaTeX output goes into HTML; surrounding text remains escaped by React.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return part.raw;
    }
  });
}
