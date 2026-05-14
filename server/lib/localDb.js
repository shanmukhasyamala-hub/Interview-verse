import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_PATH);
  } catch {
    const initial = {
      users: [],
      profiles: {}, // userId -> { summary, primarySkills, resumePath, resumeUrl, updatedAt }
      interviews: [], // {id,userId,...}
    };
    await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2), "utf8");
  }
}

export async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw);
}

export async function writeDb(next) {
  await ensureDb();
  await fs.writeFile(DB_PATH, JSON.stringify(next, null, 2), "utf8");
}

