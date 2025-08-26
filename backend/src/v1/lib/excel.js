import ExcelJS from "exceljs";

// import fs from "fs"  // just for testing

export async function generateInvoiceExcel(invoiceData) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Invoice");

  sheet.addRow(["Payment Application No", invoiceData.paymentApplicationNo]);
  sheet.addRow([
    "Payment Application Date",
    invoiceData.paymentApplicationDate,
  ]);

  sheet.addRow(["Invoice Reference", invoiceData.invoiceReference]);
  sheet.addRow(["Invoice Date", invoiceData.invoiceDate]);
  sheet.addRow(["Client Name", invoiceData.clientName]);
  sheet.addRow(["Client Address", invoiceData.clientAddress]);
  sheet.addRow(["Client Email", invoiceData.clientEmail]);
  sheet.addRow(["Client GSTN", invoiceData.clientGSTN]);
  sheet.addRow(["Project No", invoiceData.projectNo]);
  sheet.addRow(["Project Name", invoiceData.projectName]);
  sheet.addRow(["Project Value", invoiceData.projectValue]);
  sheet.addRow(["Variation Amount", invoiceData.variationAmount]);
  sheet.addRow(["Billing Period", invoiceData.billingPeriod]);
  sheet.addRow(["Total Tax Amount", invoiceData.totalTaxAmount]);
  sheet.addRow(["Total PO Amount", invoiceData.totalPOAmount]);

  sheet.addRow([]);
  sheet.addRow([
    "SL No",
    "Description",
    "Previous Progress",
    "Received Amount",
    "Current Progress",
    "Current Amount",
    "Current Tax",
  ]);

  invoiceData.items.forEach((item) => {
    sheet.addRow([
      item.slNo,
      item.description,
      item.previousProgress,
      item.receivedAmount,
      item.currentProgress,
      item.currentAmount,
      item.currentTax,
    ]);
  });

  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

const invoiceData = {
  paymentApplicationNo: "PA-2025-001",
  paymentApplicationDate: "2025-08-26",
  invoiceReference: "INV-2025-101",
  invoiceDate: "2025-08-26",
  clientName: "Acme Corporation",
  clientAddress: "123 Main Street, Springfield, IL",
  clientEmail: "accounts@acme.com",
  clientGSTN: "27AAACB1234F1Z5",
  projectNo: "PRJ-2025-01",
  projectName: "New Factory Setup",
  projectValue: 5000000,
  variationAmount: 50000,
  billingPeriod: "August 2025",
  totalTaxAmount: 90000,
  totalPOAmount: 5095000,
  items: [
    {
      slNo: 1,
      description: "Civil Works",
      previousProgress: "40%",
      receivedAmount: 2000000,
      currentProgress: "10%",
      currentAmount: 500000,
      currentTax: 90000,
    },
    {
      slNo: 2,
      description: "Electrical Works",
      previousProgress: "30%",
      receivedAmount: 1000000,
      currentProgress: "15%",
      currentAmount: 300000,
      currentTax: 54000,
    },
    {
      slNo: 3,
      description: "Plumbing Works",
      previousProgress: "20%",
      receivedAmount: 400000,
      currentProgress: "5%",
      currentAmount: 100000,
      currentTax: 18000,
    },
  ],
};

// const buffer = await generateInvoiceExcel(invoiceData);
// fs.writeFileSync("invoice.xlsx", buffer);
// console.log("Invoice saved as invoice.xlsx");    // for testing things

/* Example usage (uncomment to test locally)
  invoiceData: {
      paymentApplicationNo: "",
      paymentApplicationDate: "",
      invoiceReference: "",
      invoiceDate: "",
      clientName: "",
      clientAddress: "",
      clientEmail: "",
      clientGSTN: "",
      projectNo: "",
      projectName: "",
      projectValue: "",
      variationAmount: "",
      billingPeriod: "",
      totalTaxAmount: "",
      totalPOAmount: "",
      items: [
        {
          slNo: 1,
          description: "",
          previousProgress: "",
          receivedAmount: "",
          currentProgress: "",
          currentAmount: "",
          currentTax: "",
        },
      ],
    },

*/
