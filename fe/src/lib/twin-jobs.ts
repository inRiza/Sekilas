/**
 * Job Visual Twin mode lokal (khusus development): menjalankan twin/scripts/local_twin.sh
 * sebagai proses latar belakang dan membaca progresnya dari log.
 * Produksi nanti memakai antrean worker di be/ + twin/ (PRD 4.2).
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const TWIN_ROOT = path.resolve(process.cwd(), "..", "twin");
const SAMPLES_DIR = path.join(process.cwd(), "public", "samples");

export { LOCAL_STAGES } from "./twin-stages";

export type TwinJobStatus = {
  id: string;
  status: "running" | "done" | "failed";
  stage: number;
  withSplat: boolean;
  message?: string;
  result?: { ply: string; splat?: string; registered: number; frames: number; diagnosis?: string };
};

type JobFile = { id: string; started_at: string; with_splat: boolean; fps: number; exit_code?: number | null };

/**
 * Frame per detik dari durasi: targetkan sekitar 150 frame. Video jalan kaki butuh frame
 * rapat agar frame berurutan masih saling tumpang tindih (uji: 2 fps -> 15%, 5 fps -> 69%).
 */
export function fpsForDuration(durationS?: number) {
  if (!durationS || !Number.isFinite(durationS) || durationS <= 0) return 3;
  return Math.min(5, Math.max(2, Math.round(150 / durationS)));
}

const ID_PATTERN = /^[a-z0-9-]{3,64}$/;

export function isValidJobId(id: string) {
  return ID_PATTERN.test(id);
}

function jobDir(id: string) {
  return path.join(TWIN_ROOT, "work", id);
}

export async function startTwinJob(file: File, withSplat: boolean, durationS?: number): Promise<string> {
  const id = `upload-${Date.now().toString(36)}`;
  const uploads = path.join(TWIN_ROOT, "testdata", "uploads");
  const dir = jobDir(id);
  await mkdir(uploads, { recursive: true });
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".mp4";
  const videoPath = path.join(uploads, `${id}${ext}`);
  await writeFile(videoPath, Buffer.from(await file.arrayBuffer()));

  const fps = fpsForDuration(durationS);
  const job: JobFile = { id, started_at: new Date().toISOString(), with_splat: withSplat, fps };
  await writeFile(path.join(dir, "job.json"), JSON.stringify(job));

  const args = [path.join(TWIN_ROOT, "scripts", "local_twin.sh"), videoPath, id, "--fps", String(fps), "--label", file.name];
  if (withSplat) args.push("--splat", "--steps", "2000");

  const log = createWriteStream(path.join(dir, "job.log"));
  const child = spawn("bash", args, { cwd: TWIN_ROOT, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.on("close", (code) => {
    void writeFile(path.join(dir, "job.json"), JSON.stringify({ ...job, exit_code: code }));
  });
  return id;
}

function stageFromLog(log: string, withSplat: boolean): number {
  if (/\] Selesai/.test(log)) return withSplat ? 5 : 4;
  if (/\] 4\/4 Gaussian splat/.test(log)) return 5;
  if (/\] 3\/4 Ekspor/.test(log)) return 4;
  if (/pencocokan selesai/.test(log)) return 3;
  if (/fitur selesai/.test(log)) return 2;
  if (/\] 2\/4 /.test(log)) return 1;
  return 0;
}

export async function readTwinJob(id: string): Promise<TwinJobStatus | null> {
  const dir = jobDir(id);
  let job: JobFile;
  try {
    job = JSON.parse(await readFile(path.join(dir, "job.json"), "utf8")) as JobFile;
  } catch {
    return null;
  }
  const log = await readFile(path.join(dir, "job.log"), "utf8").catch(() => "");
  const stage = stageFromLog(log, job.with_splat);

  if (job.exit_code === undefined || job.exit_code === null) {
    return { id, status: "running", stage, withSplat: job.with_splat };
  }
  if (job.exit_code !== 0) {
    const lastLines = log.trim().split("\n").slice(-3).join(" ");
    return { id, status: "failed", stage, withSplat: job.with_splat, message: lastLines };
  }

  const meta = JSON.parse(await readFile(path.join(SAMPLES_DIR, `${id}.json`), "utf8")) as {
    files: string[];
    registered: number;
    frames: number;
    diagnosis?: { summary?: string };
  };
  const splat = meta.files.find((f) => f.endsWith(".splat"));
  return {
    id,
    status: "done",
    stage,
    withSplat: job.with_splat,
    result: {
      ply: `/samples/${id}.ply`,
      splat: splat ? `/samples/${splat}` : undefined,
      registered: meta.registered,
      frames: meta.frames,
      diagnosis: meta.diagnosis?.summary,
    },
  };
}
