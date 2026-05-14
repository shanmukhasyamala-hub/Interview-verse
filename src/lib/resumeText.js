import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import mammoth from "mammoth/mammoth.browser";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

async function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsArrayBuffer(file);
  });
}

async function readAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsText(file);
  });
}

export async function extractResumeText(file) {
  const name = (file?.name || "").toLowerCase();

  // TXT
  if (name.endsWith(".txt")) {
    const text = await readAsText(file);
    return String(text || "");
  }

  // DOCX
  if (name.endsWith(".docx")) {
    const buf = await readAsArrayBuffer(file);
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return (result?.value || "").trim();
  }

  // PDF
  if (name.endsWith(".pdf")) {
    const buf = await readAsArrayBuffer(file);
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let full = "";
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const strings = content.items.map((it) => it.str).filter(Boolean);
      full += strings.join(" ") + "\n";
    }
    return full.trim();
  }

  // DOC (not supported reliably in browser)
  if (name.endsWith(".doc")) {
    throw new Error("DOC is not supported in the browser. Please upload PDF, DOCX, or TXT.");
  }

  throw new Error("Unsupported file type. Please upload PDF, DOCX, or TXT.");
}

