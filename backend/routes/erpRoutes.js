const express = require("express");
const axios = require("axios");
const router = express.Router();

const ERP_USER_URL = "http://13.234.106.5:8080/api/resource/User";
const ERP_PO_URL = "http://13.234.106.5:8080/api/resource/Purchase%20Order"; // URL-encoded space
const ERP_API_KEY = "45c1ffb4d99cdeb";
const ERP_API_SECRET = "30c8764c8755790";

// Get ERP users (only "name")
router.get("/erp/users", async (req, res) => {
  try {
    const response = await axios.get(ERP_USER_URL, {
      params: {
        fields: '["name"]'
      },
      headers: {
        Authorization: `token ${ERP_API_KEY}:${ERP_API_SECRET}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching ERP users:", error);
    res.status(500).json({ error: "Failed to fetch ERP users" });
  }
});

// Get single ERP user details (only "name")
router.get("/erp/users/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const response = await axios.get(`${ERP_USER_URL}/${username}`, {
      params: {
        fields: '["name"]'
      },
      headers: {
        Authorization: `token ${ERP_API_KEY}:${ERP_API_SECRET}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching ERP user details:", error);
    res.status(500).json({ error: "Failed to fetch ERP user details" });
  }
});

// Get ERP Purchase Orders (only purchase order number in "name")
router.get("/erp/purchase-orders", async (req, res) => {
  try {
    const response = await axios.get(ERP_PO_URL, {
      params: {
        fields: '["name"]'
      },
      headers: {
        Authorization: `token ${ERP_API_KEY}:${ERP_API_SECRET}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching ERP purchase orders:", error);
    res.status(500).json({ error: "Failed to fetch ERP purchase orders" });
  }
});

// Optional: Get single Purchase Order details (only "name")
router.get("/erp/purchase-orders/:poNumber", async (req, res) => {
  try {
    const { poNumber } = req.params;
    const response = await axios.get(`${ERP_PO_URL}/${poNumber}`, {
      params: {
        fields: '["name"]'
      },
      headers: {
        Authorization: `token ${ERP_API_KEY}:${ERP_API_SECRET}`
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching ERP purchase order details:", error);
    res.status(500).json({ error: "Failed to fetch ERP purchase order details" });
  }
});

module.exports = router;
