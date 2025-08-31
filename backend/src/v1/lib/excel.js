import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: format numbers with commas
function formatNumber(num) {
  return typeof num === "number" ? num.toLocaleString("en-IN") : num;
}

export async function htmlToPdf(invoiceData) {
  const templatePath = path.join(__dirname, "template.html");
  let html = fs.readFileSync(templatePath, "utf8");

  // Fix local images
  html = html.replace(/src="\.\/(.*?)"/g, (_, imgPath) => {
    const absolutePath = path.join(__dirname, imgPath);
    return `src="file://${absolutePath}"`;
  });

  // Generate table rows
  const itemsTable = invoiceData.items
    .map(
      (item) => `
      <tr>
        <td class="border border-gray-400 p-1">${item.slNo}</td>
        <td class="border border-gray-400 p-1">${item.description}</td>
        <td class="border border-gray-400 p-1">${item.previousProgress}</td>
        <td class="border border-gray-400 p-1">${formatNumber(
          item.receivedAmount
        )}</td>
        <td class="border border-gray-400 p-1">${item.currentProgress}</td>
        <td class="border border-gray-400 p-1">${formatNumber(
          item.currentAmount
        )}</td>
        <td class="border border-gray-400 p-1">${formatNumber(
          item.currentTax
        )}</td>
      </tr>`
    )
    .join("");

  // Replace placeholders
  const replacements = {
    ...invoiceData,
    itemsTable,
    projectValue: formatNumber(invoiceData.projectValue),
    variationAmount: formatNumber(invoiceData.variationAmount),
    totalTaxAmount: formatNumber(invoiceData.totalTaxAmount),
    totalPOAmount: formatNumber(invoiceData.totalPOAmount),
    // Use whatever is provided in JSON; no fallback
    totalInWords: invoiceData.totalInWords,
  };

  Object.entries(replacements).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, "g"), String(value));
  });

  // Generate PDF
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  // Save PDF
  const pdfPath = path.join(__dirname, `${invoiceData.invoiceReference}.pdf`);
  fs.writeFileSync(pdfPath, pdfBuffer);

  console.log(`PDF saved as ${pdfPath}`);
  return pdfBuffer;
}
