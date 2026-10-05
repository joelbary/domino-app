// Serves an uploaded rules document (PDF or image) inline in the browser.
export function fileResponse(file: Buffer | null | undefined, type: string | null | undefined, name: string | null | undefined) {
  if (!file || !type) return new Response("Not found", { status: 404 });
  const safe = (name ?? "rules").replace(/[^\w.\- ]+/g, "_");
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${safe}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300",
    },
  });
}
