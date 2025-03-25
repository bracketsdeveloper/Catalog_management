// routes/syncRoutes.js
const express = require("express");
const router = express.Router();
// Comment out authentication for testing:
// const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const syncSheetdbData = require("../utils/syncSheetdb");

router.get("/sync-sheetdb", async (req, res) => {
  const result = await syncSheetdbData();
  if (result.success) {
    res.status(200).json({ message: "SheetDB sync complete", newProducts: result.newProductsCount });
  } else {
    res.status(500).json({ message: "Sync failed", error: result.error });
  }
});

module.exports = router;
