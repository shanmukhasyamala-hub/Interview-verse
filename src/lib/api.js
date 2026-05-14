import { AUTH_MODE, API_BASE } from "../config";

const LOCAL_TOKEN_KEY = "iv_token";

export function setLocalToken(token) {
  if (token) localStorage.setItem(LOCAL_TOKEN_KEY, token);
  else localStorage.removeItem(LOCAL_TOKEN_KEY);
}

export function getLocalToken() {
  return localStorage.getItem(LOCAL_TOKEN_KEY);
}

async function authHeader() {
  if (AUTH_MODE === "local") {
    const token = getLocalToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Firebase mode (optional)
  const { auth } = await import("./firebase.js");
  const user = auth?.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function apiPost(path, body) {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiGet(path) {
  const headers = {
    ...(await authHeader()),
  };
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPatch(path, body) {
  const headers = {
    "Content-Type": "application/json",
    ...(await authHeader()),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiUploadAudio(path, blob, extraFields = {}) {
  const headers = await authHeader();
  const fd = new FormData();
  fd.append("audio", blob, "answer.webm");
  Object.entries(extraFields).forEach(([k, v]) => fd.append(k, String(v)));

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiUploadFile(path, fieldName, file, extraFields = {}) {
  const headers = await authHeader();
  const fd = new FormData();
  fd.append(fieldName, file, file.name);
  Object.entries(extraFields).forEach(([k, v]) => fd.append(k, String(v)));

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
