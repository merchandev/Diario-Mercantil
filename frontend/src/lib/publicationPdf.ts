import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
GlobalWorkerOptions.workerSrc = workerUrl
export async function countPublicationPdf(file: File): Promise<number> {
  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  try { return (await task.promise).numPages } finally { await task.destroy() }
}
export function openPublicationPdf(data: Uint8Array) { return getDocument({ data }) }
