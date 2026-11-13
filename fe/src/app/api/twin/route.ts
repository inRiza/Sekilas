import type { NextRequest } from "next/server";

import { startTwinJob } from "@/lib/twin-jobs";

const MAX_BYTES = 1_000_000_000;

/** Mulai job Visual Twin lokal dari video yang diunggah (khusus development). */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Pipeline lokal hanya tersedia di mode development." }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("video");
  if (!(file instanceof File) || !file.type.startsWith("video/")) {
    return Response.json({ error: "Kirim file video di field 'video'." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Video lebih dari 1 GB." }, { status: 413 });
  }

  const duration = Number(form.get("duration"));
  const id = await startTwinJob(file, form.get("splat") === "1", Number.isFinite(duration) ? duration : undefined);
  return Response.json({ id }, { status: 202 });
}
