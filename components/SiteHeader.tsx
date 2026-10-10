import Link from "next/link";

// Schmale, halbtransparente Leiste oben auf jeder Seite
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline glass">
      <div className="mx-auto flex h-14 max-w-content items-center justify-between px-6 lg:px-12">
        <Link
          href="/"
          className="rounded-md text-heading tracking-tight transition-opacity duration-150 ease-out hover:opacity-70 focus-ring"
        >
          PolyAi
        </Link>
        <span className="hidden text-caption text-secondary sm:inline">Vorlesungen · Zusammenfassungen · Chat</span>
      </div>
    </header>
  );
}
