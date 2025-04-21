// routes/jobSheetExportPdf.js
const express = require("express");
const os = require("os");
const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { exec } = require("child_process");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const { format } = require("date-fns");
const JobSheet = require("../models/JobSheet");

const router = express.Router();

router.get("/:id/export-pdf", async (req, res) => {
  const tmpRoot = path.join(os.tmpdir(), "jobsheet‑exports");
  const jobId = req.params.id;
  const runId = uuidv4();
  const docxPath = path.join(tmpRoot, `${runId}.docx`);
  const pdfPath = path.join(tmpRoot, `${runId}.pdf`);

  try {
    // 1. Fetch data
    const js = await JobSheet.findById(jobId).lean();
    if (!js) return res.status(404).send("Job sheet not found");

    // 2. Fill DOCX template in memory
    const tpl = await fs.readFile(
      path.join(__dirname, "..", "templates", "jobsheettemplate.docx"),
      "binary"
    );
    const doc = new Docxtemplater(new PizZip(tpl), {
      paragraphLoop: true,
      linebreaks: true,
    });
    doc.render({
      eventName: js.eventName,
      jobSheetNumber: js.jobSheetNumber,
      deliveryDate: format(js.deliveryDate, "dd-MMM-yyyy"),
      clientCompanyName: js.clientCompanyName,
      referenceQuotation: js.referenceQuotation,
      deliveryTime: js.deliveryTime,
      clientName: js.clientName,
      orderDate: format(js.orderDate, "dd-MMM-yyyy"),
      crmIncharge: js.crmIncharge,
      contactNumber: js.contactNumber,
      poNumber: js.poNumber,
      poStatus: js.poStatus,
      deliveryType: js.deliveryType,
      deliveryMode: js.deliveryMode,
      deliveryCharges: js.deliveryCharges,
      deliveryAddress: js.deliveryAddress,
      giftBoxBagsDetails: js.giftBoxBagsDetails,
      packagingInstructions: js.packagingInstructions,
      otherDetails: js.otherDetails,
      items: js.items.map((it, i) => ({ slNo: i + 1, ...it })),
    });
    const docxBuffer = doc.getZip().generate({ type: "nodebuffer" });

    // 3. Ensure temp folder exists
    await fs.mkdir(tmpRoot, { recursive: true });

    // 4. Write DOCX to disk
    await fs.writeFile(docxPath, docxBuffer);

    // 5. Convert to PDF via soffice
    await new Promise((resolve, reject) => {
      const cmd = `soffice --headless --convert-to pdf "${docxPath}" --outdir "${tmpRoot}"`;
      exec(cmd, (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // 6. Read generated PDF
    const pdfBuffer = await fs.readFile(pdfPath);

    // 7. Stream PDF back
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=job-sheet-${js.jobSheetNumber}.pdf`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF export error:", err);
    res.status(500).send("PDF export failed");
  } finally {
    // 8. Cleanup temp files (best‑effort)
    Promise.all([
      fs.unlink(docxPath).catch(() => {}),
      fs.unlink(pdfPath).catch(() => {}),
    ]).then(() => {
      // optionally remove tmpRoot if empty
    });
  }
});

module.exports = router;
