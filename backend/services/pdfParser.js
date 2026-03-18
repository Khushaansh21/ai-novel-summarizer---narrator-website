import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Fast text extraction: read pages concurrently to minimize latency on large PDFs.
export async function extractTextFromPdfBuffer(buffer) {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const pagePromises = [];
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    pagePromises.push(
      (async () => {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        return textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
      })()
    );
  }

  const pageTexts = await Promise.all(pagePromises);
  return pageTexts.join("\n\n");
}