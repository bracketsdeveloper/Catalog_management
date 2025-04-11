const express = require("express");
const router = express.Router();
const ProductionJobsheet = require("../models/ProductionJobsheet");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const User = require("../models/User");         // Import User model for looking up super admins
const sendMail = require("../utils/sendMail");     // Import sendMail utility

// Utility function to update followUps with createdBy (if missing)
function populateFollowUps(items, userName) {
  if (items && Array.isArray(items)) {
    return items.map((item) => {
      if (item.followUps && Array.isArray(item.followUps)) {
        item.followUps = item.followUps.map((fu) => ({
          ...fu,
          createdBy: fu.createdBy || userName,
        }));
      }
      return item;
    });
  }
  return items;
}

// Helper function to check for alert items and send an email if needed.
async function checkAndSendAlertEmail(jobsheet) {
  // Filter items with status "Alert"
  const alertItems = jobsheet.items.filter((item) => item.status === "Alert");

  if (alertItems.length > 0) {
    // Build the alert details for the email body
    let alertDetails = "";
    alertItems.forEach((item) => {
      alertDetails += `Product: ${item.productName}\n`;
      alertDetails += `Expected In Hand: ${item.expectedInHand}\n`;
      alertDetails += `Status: ${item.status}\n`;
      if (item.brandingType) alertDetails += `Branding Type: ${item.brandingType}\n`;
      if (item.brandingVendor) alertDetails += `Branding Vendor: ${item.brandingVendor}\n`;
      if (item.remarks) alertDetails += `Remarks: ${item.remarks}\n`;
      alertDetails += `\n`;
    });
    const mailBody = `JobSheet Number: ${jobsheet.jobSheetNumber}\nCompany Nmae : ${jobsheet.clientCompanyName}\nCreated By: ${jobsheet.createdBy}\n\nAlert Items:\n${alertDetails}\n🔥🔥🔥`;

    try {
      // Lookup all super admin users (isSuperAdmin set to true)
      const superAdmins = await User.find({ isSuperAdmin: true });
      if (superAdmins.length === 0) {
        console.warn("No SuperAdmin users found. Alert email will not be sent.");
        return;
      }
      // Send an alert email to each super admin
      for (const admin of superAdmins) {
        await sendMail({
          to: admin.email,
          subject: `AutoMail : Alert🔥 in Production ${jobsheet.jobSheetNumber}`,
          text: mailBody,
          // Optionally add an HTML version with an html property if desired
        });
      }
    } catch (error) {
      console.error("Error sending alert email:", error);
      // Email errors shouldn't block the main flow.
    }
  }
}

// Create a new Production Jobsheet
router.post("/productionjobsheets", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const currentUser = req.user ? (req.user.email || req.user.name) : "Unknown User";
    // Populate createdBy for each follow-up in items if not provided.
    req.body.items = populateFollowUps(req.body.items, currentUser);

    const newProdJobsheet = new ProductionJobsheet({ ...req.body, createdBy: currentUser });
    await newProdJobsheet.save();

    // Check if any item has status "Alert" and send an email to super admins.
    checkAndSendAlertEmail(newProdJobsheet);

    res.status(201).json({ message: "Production Jobsheet created", productionJobsheet: newProdJobsheet });
  } catch (error) {
    console.error("Error creating production jobsheet:", error);
    res.status(500).json({ message: "Server error creating production jobsheet", error: error.message });
  }
});

// Get all Production Jobsheets
router.get("/productionjobsheets", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const jobsheets = await ProductionJobsheet.find().sort({ createdAt: -1 });
    res.json(jobsheets);
  } catch (error) {
    console.error("Error fetching production jobsheets:", error);
    res.status(500).json({ message: "Server error fetching production jobsheets" });
  }
});

// Get a single Production Jobsheet by ID
router.get("/productionjobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const jobsheet = await ProductionJobsheet.findById(req.params.id);
    if (!jobsheet) {
      return res.status(404).json({ message: "Production jobsheet not found" });
    }
    res.json(jobsheet);
  } catch (error) {
    console.error("Error fetching production jobsheet:", error);
    res.status(500).json({ message: "Server error fetching production jobsheet" });
  }
});

// Update Production Jobsheet
router.put("/productionjobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const currentUser = req.user ? (req.user.email || req.user.name) : "Unknown User";
    // Ensure that every follow-up has createdBy populated
    req.body.items = populateFollowUps(req.body.items, currentUser);

    const updatedJobsheet = await ProductionJobsheet.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedJobsheet) {
      return res.status(404).json({ message: "Production jobsheet not found" });
    }

    // After update, check for alert items and send an email if necessary.
    checkAndSendAlertEmail(updatedJobsheet);

    res.json({ message: "Production jobsheet updated", productionJobsheet: updatedJobsheet });
  } catch (error) {
    console.error("Error updating production jobsheet:", error);
    res.status(500).json({ message: "Server error updating production jobsheet", error: error.message });
  }
});

// Delete Production Jobsheet
router.delete("/productionjobsheets/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deletedJobsheet = await ProductionJobsheet.findByIdAndDelete(req.params.id);
    if (!deletedJobsheet) {
      return res.status(404).json({ message: "Production jobsheet not found" });
    }
    res.json({ message: "Production jobsheet deleted" });
  } catch (error) {
    console.error("Error deleting production jobsheet:", error);
    res.status(500).json({ message: "Server error deleting production jobsheet" });
  }
});

module.exports = router;
