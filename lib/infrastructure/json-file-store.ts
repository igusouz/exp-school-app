import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export class JsonFileStore<T> {
  constructor(
    private readonly absoluteFilePath: string,
    private readonly initialData: T,
  ) {}

  async read(): Promise<T> {
    await this.ensureExists();
    const content = await readFile(this.absoluteFilePath, "utf-8");
    return JSON.parse(content) as T;
  }

  async write(data: T): Promise<void> {
    await this.ensureExists();
    await writeFile(this.absoluteFilePath, JSON.stringify(data, null, 2), "utf-8");
  }

  private async ensureExists(): Promise<void> {
    const dir = path.dirname(this.absoluteFilePath);
    await mkdir(dir, { recursive: true });
    try {
      await readFile(this.absoluteFilePath, "utf-8");
    } catch {
      await writeFile(
        this.absoluteFilePath,
        JSON.stringify(this.initialData, null, 2),
        "utf-8",
      );
    }
  }
}
