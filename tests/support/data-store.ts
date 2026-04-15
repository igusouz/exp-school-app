import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");

const defaults: Record<string, unknown> = {
  "students.json": { students: [] },
  "classes.json": { classes: [] },
  "notifications.json": { pending: [], dispatchLog: {} },
};

type DataSnapshot = Record<string, string | null>;

export async function backupDataFiles(): Promise<DataSnapshot> {
  await mkdir(dataDir, { recursive: true });
  const snapshot: DataSnapshot = {};

  for (const fileName of Object.keys(defaults)) {
    const filePath = path.join(dataDir, fileName);
    try {
      snapshot[fileName] = await readFile(filePath, "utf-8");
    } catch {
      snapshot[fileName] = null;
    }
  }

  return snapshot;
}

export async function resetDataFiles(): Promise<void> {
  await mkdir(dataDir, { recursive: true });

  for (const [fileName, value] of Object.entries(defaults)) {
    const filePath = path.join(dataDir, fileName);
    await writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
  }
}

export async function restoreDataFiles(snapshot: DataSnapshot): Promise<void> {
  await mkdir(dataDir, { recursive: true });

  for (const [fileName, previous] of Object.entries(snapshot)) {
    const filePath = path.join(dataDir, fileName);
    if (previous === null) {
      const fallback = defaults[fileName];
      await writeFile(filePath, JSON.stringify(fallback, null, 2), "utf-8");
      continue;
    }

    await writeFile(filePath, previous, "utf-8");
  }
}
