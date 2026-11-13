import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/** Metadata yang ditulis twin/scripts/local_twin.sh ke public/samples/<nama>.json */
export type TwinResult = {
  name: string;
  /** Nama tampilan, misal nama file asli yang diunggah. */
  label?: string;
  video: string;
  frames: number;
  registered: number;
  points: number;
  seconds: number;
  created_at: string;
  files: string[];
  diagnosis?: { summary?: string };
};

const SAMPLES_DIR = path.join(process.cwd(), "public", "samples");

export async function listTwinResults(): Promise<TwinResult[]> {
  let entries: string[];
  try {
    entries = await readdir(SAMPLES_DIR);
  } catch {
    return [];
  }

  const results = await Promise.all(
    entries
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          const data = JSON.parse(await readFile(path.join(SAMPLES_DIR, f), "utf8")) as TwinResult;
          // Hanya tampilkan file yang benar-benar ada.
          data.files = data.files.filter((file) => entries.includes(file));
          return data.files.length > 0 ? data : null;
        } catch {
          return null;
        }
      }),
  );

  return results
    .filter((r): r is TwinResult => r !== null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
