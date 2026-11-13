import type { NextRequest } from "next/server";

import { isValidJobId, readTwinJob } from "@/lib/twin-jobs";

/** Status job Visual Twin lokal (khusus development). */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/twin/[id]">) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Pipeline lokal hanya tersedia di mode development." }, { status: 404 });
  }
  const { id } = await ctx.params;
  if (!isValidJobId(id)) return Response.json({ error: "id tidak valid" }, { status: 400 });

  const job = await readTwinJob(id);
  if (!job) return Response.json({ error: "job tidak ditemukan" }, { status: 404 });
  return Response.json(job, { headers: { "Cache-Control": "no-store" } });
}
