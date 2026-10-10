import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="Poly Lectures home">
          <BrandMark />
          <span>Poly Lectures</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
