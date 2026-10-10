// Runder Absenden-Knopf, sitzt rechts in einer Pill-Eingabe
export default function SendButton({
  disabled,
  label,
}: {
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label={label}
      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-foreground text-background transition-[opacity,transform] duration-150 ease-out hover:scale-105 active:scale-95 disabled:opacity-25 disabled:hover:scale-100 focus-ring"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
      </svg>
    </button>
  );
}
