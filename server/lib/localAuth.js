import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { readDb, writeDb } from "./localDb.js";

const JWT_SECRET = process.env.JWT_SECRET || "interviewverse-local-dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, displayName: user.displayName },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function createUser({ email, password, displayName }) {
  const db = await readDb();
  const exists = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) throw new Error("Email already exists");

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: nanoid(),
    email,
    displayName: displayName || "Candidate",
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  await writeDb(db);
  return user;
}

export async function authenticate({ email, password }) {
  const db = await readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error("Invalid email or password");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new Error("Invalid email or password");
  return user;
}

export async function getUserById(id) {
  const db = await readDb();
  return db.users.find((u) => u.id === id) || null;
}

