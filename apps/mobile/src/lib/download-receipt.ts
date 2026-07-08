import { downloadFile } from "./download-file";

export async function downloadAndShareReceipt(sessionId: number) {
  await downloadFile(`/sessions/${sessionId}/receipt.pdf`, `receipt-${sessionId}.pdf`, "application/pdf");
}
