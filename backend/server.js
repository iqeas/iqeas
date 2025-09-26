import app from "./src/v1/app.js";
import dotenv from "dotenv";
dotenv.config();

const port = process.env.PORT;
const base_url = process.env.API_BASE_URL;

app.get("/", (req, res) => {
  res.json({ active: "true", status: "200" });
});

app.listen(port, () => {
  console.log(`\x1b[34m[+] Server running on ${port} ==> ${base_url}\x1b[0m`);
});

// import { htmlToPdf } from "./src/v1/lib/excel.js";
// import fs from "fs";

// const invoiceData = {
//   paymentApplicationNo: "PA-2025-001",
//   paymentApplicationDate: "2025-08-26",
//   invoiceReference: "INV-2025-101",
//   invoiceDate: "2025-08-26",
//   clientName: "Acme Corporation",
//   clientAddress: "123 Main Street, Springfield, IL",
//   clientEmail: "accounts@acme.com",
//   clientGSTN: "27AAACB1234F1Z5",
//   projectNo: "PRJ-2025-01",
//   projectName: "New Factory Setup",
//   projectValue: 5000000,
//   variationAmount: 50000,
//   billingPeriod: "August 2025",
//   totalTaxAmount: 90000,
//   totalPOAmount: 5095000,
//   totalInWords: "Fifty Lakh Ninety Five Thousand Only", // ← Add this field
//   items: [
//     {
//       slNo: 1,
//       description: "Civil Works",
//       previousProgress: "40%",
//       receivedAmount: 2000000,
//       currentProgress: "10%",
//       currentAmount: 500000,
//       currentTax: 90000,
//     },
//     {
//       slNo: 2,
//       description: "Electrical Works",
//       previousProgress: "30%",
//       receivedAmount: 1000000,
//       currentProgress: "15%",
//       currentAmount: 300000,
//       currentTax: 54000,
//     },
//     {
//       slNo: 3,
//       description: "Plumbing Works",
//       previousProgress: "20%",
//       receivedAmount: 400000,
//       currentProgress: "5%",
//       currentAmount: 100000,
//       currentTax: 18000,
//     },
//   ],
// };

// async function saveInvoice() {
//   const pdfBuffer = await htmlToPdf(invoiceData);

//   // Save PDF to file
//   fs.writeFileSync("invoice.pdf", pdfBuffer);
//   console.log("PDF saved as invoice.pdf");
// }

// saveInvoice();
