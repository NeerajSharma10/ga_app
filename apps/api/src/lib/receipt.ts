import PDFDocument from "pdfkit";
import type { Session, Station, GameType, Customer, User } from "@prisma/client";

type FullSession = Session & {
  station: Station & { gameType: GameType };
  customer: Customer;
  loggedByUser: User;
};

export function buildReceiptPdf(session: FullSession): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A5", margin: 36 });

  doc.fontSize(18).text("Gamer's Academy", { align: "center" });
  doc.fontSize(10).fillColor("#666").text("A-10, 2nd Floor, Shiv Vihar, near Vishal Mega Mart", { align: "center" });
  doc.moveDown(1.5);

  doc.fillColor("#000").fontSize(12).text(`Receipt #${session.id}`);
  doc.fontSize(10).fillColor("#444").text(`Date: ${session.startTime.toLocaleString("en-IN")}`);
  doc.moveDown();

  doc.fillColor("#000").fontSize(11);
  row(doc, "Customer", session.customer.name);
  row(doc, "Mobile", session.customer.phone);
  row(doc, "Game / Station", `${session.station.gameType.name} - ${session.station.label}`);
  row(doc, "Duration", `${session.durationMinutes ?? "-"} min`);
  if (session.extraControllers > 0) row(doc, "Extra controllers", String(session.extraControllers));
  doc.moveDown();

  row(doc, "Base amount", formatInr(session.baseAmount));
  if (session.discountValue) {
    const label = session.discountType === "PERCENT" ? `Discount (${session.discountValue}%)` : "Discount";
    row(doc, label, `- ${formatInr(session.discountValue)}`);
  }
  if (session.customer.isMember) row(doc, "Member discount", "applied");
  doc.moveDown(0.5);
  doc.fontSize(13).text(`Total Paid: ${formatInr(session.totalAmount ?? session.baseAmount)}`, { underline: true });
  doc.fontSize(10).fillColor("#444").text(`Payment: ${session.paymentType ?? "-"}`);
  doc.moveDown();

  doc.fontSize(9).fillColor("#888").text(`Served by ${session.loggedByUser.name}`, { align: "center" });
  doc.text("Thank you for choosing us! Enjoy the game, respect the arena.", { align: "center" });

  doc.end();
  return doc;
}

function row(doc: PDFKit.PDFDocument, label: string, value: string) {
  doc.text(`${label}: ${value}`);
}

function formatInr(value: number | { toString(): string }): string {
  return `₹${Number(value).toFixed(2)}`;
}
