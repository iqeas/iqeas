const ExcelJS = require("exceljs");
import ExcelJS from "exceljs";
async function fillExcel() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile("template.xlsx");

  const sheet = workbook.getWorksheet(1);

  // Example: Fill cells
  sheet.getCell("B2").value = "Client Name";
  sheet.getCell("B3").value = "Invoice #123";
  sheet.getCell("B5").value = 1000; // Amount

  await workbook.xlsx.writeFile("filled_invoice.xlsx");
}

fillExcel();
