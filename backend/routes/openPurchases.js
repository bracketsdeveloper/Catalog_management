const express = require("express");
const router = express.Router();
const OpenPurchase = require("../models/OpenPurchase");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const User = require("../models/User");         // Added: Import the User model
const sendMail = require("../utils/sendMail");     // Added: Import the sendMail utility

// Helper function to check for alert items and send email if needed.
async function checkAndSendAlertEmail(openPurchase) {
  // Get any items with status Alert
  const alertItems = openPurchase.items.filter(item => item.status === "Alert");

  if (alertItems.length > 0) {
    // Build the alert details in the email body.
    let alertDetails = "";
    alertItems.forEach(item => {
      alertDetails += `Product: ${item.product}\n`;
      if (item.color) alertDetails += `Color: ${item.color}\n`;
      if (item.size) alertDetails += `Size: ${item.size}\n`;
      alertDetails += `Quantity: ${item.quantity}\n\n`;
    });
    const mailBody = `JobSheet Number: ${openPurchase.jobSheetNumber}\nCompany Nmae : ${openPurchase.clientCompanyName}\nCreated By: ${openPurchase.createdBy}\n\nAlert Items:\n${alertDetails}\n🔥🔥🔥`;

    try {
      // Find all Super Admin users.
      const superAdmins = await User.find({ isSuperAdmin: true });
      if (superAdmins.length === 0) {
        console.warn("No SuperAdmin users found, cannot send alert email.");
        return;
      }
      // Loop through each and send the mail.
      for (const admin of superAdmins) {
        await sendMail({
          to: admin.email,
          subject: `AutoMail : Alert🔥 in Purchase ${openPurchase.jobSheetNumber}`,
          text: mailBody, // Optionally you can use html: mailBody if desired.
        });
      }
    } catch (error) {
      console.error("Error sending alert email:", error);
      // Email errors shouldn’t block the main flow.
    }
  }
}

// Create a new open purchase record
router.post("/openPurchases", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { jobSheetNumber, jobSheetCreatedDate, clientCompanyName, eventName, items } = req.body;
    
    // Check required fields
    if (!jobSheetNumber || !jobSheetCreatedDate || !clientCompanyName || !eventName || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required fields or no items provided" });
    }
    
    // Use req.user to set createdBy – using name (or email) if name not available
    const createdBy = req.user && (req.user.name || req.user.email) || "Unknown User";

    // Ensure that within each item, if followUps exist they have updatedBy set.
    const updatedItems = items.map((item) => {
      if (item.followUps && Array.isArray(item.followUps)) {
        item.followUps = item.followUps.map((fu) => {
          // Default to current user's name if updatedBy is missing.
          if (!fu.updatedBy) {
            fu.updatedBy = createdBy;
          }
          return fu;
        });
      }
      return item;
    });

    const newOpenPurchase = new OpenPurchase({
      jobSheetNumber,
      // Convert jobSheetCreatedDate if needed (assumes ISO string)
      jobSheetCreatedDate: new Date(jobSheetCreatedDate),
      clientCompanyName,
      eventName,
      items: updatedItems,
      createdBy
    });

    await newOpenPurchase.save();

    // Check if any item has status "Alert" and send an email if so.
    checkAndSendAlertEmail(newOpenPurchase);

    res.status(201).json({ message: "Open Purchase created", openPurchase: newOpenPurchase });
  } catch (error) {
    console.error("Error creating open purchase:", error);
    res.status(500).json({ message: "Server error creating open purchase" });
  }
});

// GET all open purchases
router.get("/openPurchases", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const openPurchases = await OpenPurchase.find().sort({ createdAt: -1 });
    res.json(openPurchases);
  } catch (error) {
    console.error("Error fetching open purchases:", error);
    res.status(500).json({ message: "Server error fetching open purchases" });
  }
});

// GET open purchase by ID
router.get("/openPurchases/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const openPurchase = await OpenPurchase.findById(req.params.id);
    if (!openPurchase) {
      return res.status(404).json({ message: "Open purchase not found" });
    }
    res.json(openPurchase);
  } catch (error) {
    console.error("Error fetching open purchase:", error);
    res.status(500).json({ message: "Server error fetching open purchase" });
  }
});

// Update an open purchase
router.put("/openPurchases/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updatedOpenPurchase = await OpenPurchase.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedOpenPurchase) {
      return res.status(404).json({ message: "Open purchase not found" });
    }

    // After update, check for alert items as well.
    checkAndSendAlertEmail(updatedOpenPurchase);
    
    res.json({ message: "Open purchase updated", openPurchase: updatedOpenPurchase });
  } catch (error) {
    console.error("Error updating open purchase:", error);
    res.status(500).json({ message: "Server error updating open purchase" });
  }
});

// Delete an open purchase
router.delete("/openPurchases/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const openPurchase = await OpenPurchase.findByIdAndDelete(req.params.id);
    if (!openPurchase) {
      return res.status(404).json({ message: "Open purchase not found" });
    }
    res.json({ message: "Open purchase deleted" });
  } catch (error) {
    console.error("Error deleting open purchase:", error);
    res.status(500).json({ message: "Server error deleting open purchase" });
  }
});

module.exports = router;
