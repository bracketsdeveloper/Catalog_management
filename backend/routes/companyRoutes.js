const express = require("express");
const router = express.Router();
const Company = require("../models/Company");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// Create a new company
router.post("/companies", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { companyName, companyEmail, clients, companyAddress } = req.body;
    if (!companyName) {
      return res.status(400).json({ message: "Company name is required" });
    }
    const newCompany = new Company({
      companyName,
      companyEmail,
      clients, // Expect an array of objects: [{ name, contactNumber }]
      companyAddress,
    });
    await newCompany.save();
    res.status(201).json({ message: "Company created", company: newCompany });
  } catch (error) {
    console.error("Error creating company:", error);
    res.status(500).json({ message: "Server error creating company" });
  }
});

// Get all companies
router.get("/companies", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({ message: "Server error fetching companies" });
  }
});

// Get a single company by ID
router.get("/companies/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    res.status(500).json({ message: "Server error fetching company" });
  }
});

// Update a company by ID
router.put("/companies/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { companyName, companyEmail, clients, companyAddress } = req.body;
    const updatedData = {
      companyName,
      companyEmail,
      clients,
      companyAddress,
    };
    const updatedCompany = await Company.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );
    if (!updatedCompany) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json({ message: "Company updated", company: updatedCompany });
  } catch (error) {
    console.error("Error updating company:", error);
    res.status(500).json({ message: "Server error updating company" });
  }
});

// Delete a company by ID
router.delete("/companies/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deletedCompany = await Company.findByIdAndDelete(req.params.id);
    if (!deletedCompany) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.json({ message: "Company deleted" });
  } catch (error) {
    console.error("Error deleting company:", error);
    res.status(500).json({ message: "Server error deleting company" });
  }
});

module.exports = router;
