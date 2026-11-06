
export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_CHARS = 120000;

// Reads PDF text in the browser.
export async function extractPdfText(file) {
  if (!file) {
    throw new Error("Please select a PDF file.");
  }

  if (file.size > MAX_PDF_BYTES) {
    throw new Error("PDF file must be smaller than 10 MB.");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Please upload a valid PDF file.");
  }

  const pdfjs = await import("pdfjs-dist");

  const worker = await import(
    "pdfjs-dist/build/pdf.worker.min.mjs?url"
  );

  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  let pdf;

  try {
    const data = new Uint8Array(await file.arrayBuffer());

    pdf = await pdfjs.getDocument({ data }).promise;
  } catch (err) {
    if (err?.name === "PasswordException") {
      throw new Error("This PDF is password protected.");
    }

    throw new Error("This PDF could not be read. Try a different file.");
  }

  let text = "";

  for (let i = 1; i <= pdf.numPages && text.length < MAX_CHARS; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    text += content.items
      .map((item) => item.str)
      .join(" ") + "\n\n";
  }

  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (text.length < 50) {
    throw new Error(
      "No readable text was found. Scanned or image-only PDFs are not supported."
    );
  }

  const truncated = text.length > MAX_CHARS;

  return {
    text: truncated ? text.slice(0, MAX_CHARS) : text,
    pages: pdf.numPages,
    truncated,
  };
}
