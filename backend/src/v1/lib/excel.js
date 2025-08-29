// import puppeteer from "puppeteer";
// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";

// export async function htmlToPdf(invoiceData, filename) {
//   const __filename = fileURLToPath(import.meta.url);
//   const __dirname = path.dirname(__filename);

//   const templatePath = path.join(__dirname, "template.html");
//   let html = fs.readFileSync(templatePath, "utf8");

//   html = html.replace(/src="\.\//g, `src="file://${__dirname}/`);

//   const itemsHtml = invoiceData.items
//     .map(
//       (item) => `
//       <tr>
//         <td class="border border-gray-400 p-1">${item.slNo}</td>
//         <td class="border border-gray-400 p-1">${item.description}</td>
//         <td class="border border-gray-400 p-1">${item.previousProgress}</td>
//         <td class="border border-gray-400 p-1">${item.receivedAmount}</td>
//         <td class="border border-gray-400 p-1">${item.currentProgress}</td>
//         <td class="border border-gray-400 p-1">${item.currentAmount}</td>
//         <td class="border border-gray-400 p-1">${item.currentTax}</td>
//       </tr>`
//     )
//     .join("");

//   const replacements = {
//     ...invoiceData,
//     itemsTable: itemsHtml,
//     totalInWords: invoiceData.totalInWords || "XXXX Indian Rupees Only",
//   };

//   Object.entries(replacements).forEach(([key, value]) => {
//     html = html.replace(new RegExp(`{{${key}}}`, "g"), value);
//   });

//   const browser = await puppeteer.launch();
//   const page = await browser.newPage();
//   await page.setContent(html, { waitUntil: "networkidle0" });

//   await page.pdf({
//     path: path.join(__dirname, "output.pdf"),
//     format: "A4",
//     printBackground: true,
//   });

//   await browser.close();

//   console.log(`✅ PDF generated with images: ${filename}`);
// }


import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

export async function htmlToPdf(invoiceData) {

  const templatePath = path.join(__dirname, "template.html");
  let html = fs.readFileSync(templatePath, "utf8");

  const itemsHtml = invoiceData.items
    .map(
      (item) => `
      <tr>
        <td class="border border-gray-400 p-1">${item.slNo}</td>
        <td class="border border-gray-400 p-1">${item.description}</td>
        <td class="border border-gray-400 p-1">${item.previousProgress}</td>
        <td class="border border-gray-400 p-1">${item.receivedAmount}</td>
        <td class="border border-gray-400 p-1">${item.currentProgress}</td>
        <td class="border border-gray-400 p-1">${item.currentAmount}</td>
        <td class="border border-gray-400 p-1">${item.currentTax}</td>
      </tr>`
    )
    .join("");

  const replacements = {
    ...invoiceData,
    itemsTable: itemsHtml,
    totalInWords: invoiceData.totalInWords || "XXXX Indian Rupees Only",
  };

  Object.entries(replacements).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, "g"), value);
  });

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return pdfBuffer; 
}
