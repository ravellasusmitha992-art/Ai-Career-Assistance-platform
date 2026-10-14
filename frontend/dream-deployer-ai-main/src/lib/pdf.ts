
 // Browser-only PDF text extraction
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");

  const workerUrl = (
    await import("pdfjs-dist/build/pdf.worker.min.mjs?url")
  ).default;

  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
  }).promise;

  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    pages.push(pageText);
  }

  return pages.join("\n").trim();
}
