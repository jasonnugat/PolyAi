import { loadTranscript } from "@/lib/transcript";

// Zum Testen im Browser: http://localhost:3000/api/transcript/1
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const transcript = await loadTranscript(id);
    return new Response(transcript, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return new Response("Transkript nicht gefunden", { status: 404 });
  }
}
