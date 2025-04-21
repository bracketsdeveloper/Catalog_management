const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { format } = require("date-fns");
const convertToPdf = require("docx-pdf");
const JobSheet = require("../models/JobSheet");

const router = express.Router();

// Ensure temp folder exists
const tempDir = path.join(__dirname, "..", "temp");
fs.ensureDirSync(tempDir);

// Helper function to generate DOCX buffer
async function generateDocxBuffer(js) {
  const templatePath = path.join(
    __dirname,
    "..",
    "templates",
    "jobsheettemplate.docx"
  );
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  // Set data using render method (modern API)
  doc.render({
    eventName: js.eventName || "N/A",
    jobSheetNumber: js.jobSheetNumber || "N/A",
    deliveryDate: js.deliveryDate ? format(new Date(js.deliveryDate), "dd-MMM-yyyy") : "N/A",
    clientCompanyName: js.clientCompanyName || "N/A",
    referenceQuotation: js.referenceQuotation || "N/A",
    deliveryTime: js.deliveryTime || "N/A",
    clientName: js.clientName || "N/A",
    orderDate: js.orderDate ? format(new Date(js.orderDate), "dd-MMM-yyyy") : "N/A",
    crmIncharge: js.crmIncharge || "N/A",
    contactNumber: js.contactNumber || "N/A",
    poNumber: js.poNumber || "N/A",
    poStatus: js.poStatus || "N/A",
    deliveryType: js.deliveryType || "N/A",
    deliveryMode: js.deliveryMode || "N/A",
    deliveryCharges: js.deliveryCharges || "N/A",
    deliveryAddress: js.deliveryAddress || "N/A",
    giftBoxBagsDetails: js.giftBoxBagsDetails || "N/A",
    packagingInstructions: js.packagingInstructions || "N/A",
    otherDetails: js.otherDetails || "N/A",
    items: js.items.map((it, i) => ({
      slNo: i + 1,
      product: it.product || "N/A",
      color: it.color || "N/A",
      size: it.size || "N/A",
      quantity: it.quantity || "N/A",
      sourcingFrom: it.sourcingFrom || "N/A",
      brandingType: it.brandingType || "N/A",
      brandingVendor: it.brandingVendor || "N/A",
      remarks: it.remarks || "N/A",
    })),
  });

  return doc.getZip().generate({ type: "nodebuffer" });
}

// DOCX Export
router.get("/:id/export-docx", async (req, res) => {
  try {
    const js = await JobSheet.findById(req.params.id).lean();
    if (!js) return res.status(404).send("Job sheet not found");

    const buffer = await generateDocxBuffer(js);
    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename=job-sheet-${js.jobSheetNumber}.docx`,
    });
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).send("Template rendering failed");
  }
});

// PDF Export
router.get("/:id/export-pdf", async (req, res) => {
  try {
    const js = await JobSheet.findById(req.params.id).lean();
    if (!js) return res.status(404).send("Job sheet not found");

    // Generate DOCX buffer
    const docxBuffer = await generateDocxBuffer(js);

    // Save DOCX to temp folder
    const docxPath = path.join(tempDir, `job-sheet-${js.jobSheetNumber}.docx`);
    await fs.writeFile(docxPath, docxBuffer);

    // Convert DOCX to PDF
    const pdfPath = path.join(tempDir, `job-sheet-${js.jobSheetNumber}.pdf`);
    await new Promise((resolve, reject) => {
      convertToPdf(
        {
          input: docxPath,
          output: pdfPath,
        },
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    // Read PDF file
    const pdfBuffer = await fs.readFile(pdfPath);

    // Clean up temporary files
    await fs.unlink(docxPath).catch((cleanupErr) => {
      console.error("Failed to delete temporary DOCX:", cleanupErr);
    });
    await fs.unlink(pdfPath).catch((cleanupErr) => {
      console.error("Failed to delete temporary PDF:", cleanupErr);
    });

    // Send PDF response
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=job-sheet-${js.jobSheetNumber}.pdf`,
    });
    res.send(pdfBuffer);
  } catch (e) {
    console.error(e);
    // Attempt to clean up temp files on error
    const docxPath = path.join(tempDir, `job-sheet-${js?.jobSheetNumber}.docx`);
    const pdfPath = path.join(tempDir, `job-sheet-${js?.jobSheetNumber}.pdf`);
    await fs.unlink(docxPath).catch(() => {});
    await fs.unlink(pdfPath).catch(() => {});
    res.status(500).send("PDF rendering failed");
  }
});

module.exports = router;