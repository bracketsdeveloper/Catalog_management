const express = require("express");
const router = express.Router();
const Catalog = require("../models/Catalog");
const Product = require("../models/Product");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");

// 1) Get all catalogs
router.get("/catalogs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const catalogs = await Catalog.find()
      .populate("products.productId")
      .exec();
    res.json(catalogs);
  } catch (error) {
    console.error("Error fetching catalogs:", error);
    res.status(500).json({ message: "Server error fetching catalogs" });
  }
});

// 2) Create new catalog
router.post("/catalogs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      products,
      fieldsToDisplay,
      priceRange,
      margin
    } = req.body;

    // `products` is an array of objects: [ { productId, color, size, quantity }, ... ]
    const newCatalog = new Catalog({
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      products: products || [],
      fieldsToDisplay: fieldsToDisplay || [],
      margin,
      priceRange,
      createdBy: req.user ? req.user.email : ""
    });

    await newCatalog.save();
    res.status(201).json({ message: "Catalog created", catalog: newCatalog });
  } catch (error) {
    console.error("Error creating catalog:", error);
    res.status(500).json({ message: "Server error creating catalog" });
  }
});

// 3) Example AI Generate route
router.post("/catalogs/ai-generate", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { fromPrice, toPrice, filters } = req.body;
    const query = {};
    if (filters?.categories?.length) {
      query.category = { $in: filters.categories };
    }
    if (filters?.brands?.length) {
      query.brandName = { $in: filters.brands };
    }
    if (filters?.subCategories?.length) {
      query.subCategory = { $in: filters.subCategories };
    }
    if (filters?.stockLocations?.length) {
      query.stockCurrentlyWith = { $in: filters.stockLocations };
    }

    const allFiltered = await Product.find(query).lean();
    const n = allFiltered.length;
    let bestSubset = [];
    let bestSum = 0;

    function backtrack(index, currentSubset, currentSum) {
      if (currentSum > toPrice) return;
      if (currentSum >= fromPrice && currentSum <= toPrice) {
        bestSubset = [...currentSubset];
        bestSum = currentSum;
      }
      if (index >= n) return;
      backtrack(index + 1, currentSubset, currentSum);
      const product = allFiltered[index];
      const newSum = currentSum + (product.productCost || 0);
      currentSubset.push(product);
      backtrack(index + 1, currentSubset, newSum);
      currentSubset.pop();
    }

    backtrack(0, [], 0);

    res.json(bestSubset);
  } catch (error) {
    console.error("Error AI generating catalog (sum-based):", error);
    res.status(500).json({ message: "Server error AI sum-based generation" });
  }
});

// 4) Get a single catalog
router.get("/catalogs/:id", async (req, res) => {
  try {
    const catalog = await Catalog.findById(req.params.id)
      .populate("products.productId");
    if (!catalog) {
      return res.status(404).json({ message: "Catalog not found" });
    }
    res.json(catalog);
  } catch (error) {
    console.error("Error fetching catalog:", error);
    res.status(500).json({ message: "Server error fetching catalog" });
  }
});

// 5) Delete a catalog
router.delete("/catalogs/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const deletedCatalog = await Catalog.findByIdAndDelete(req.params.id);
    if (!deletedCatalog) {
      return res.status(404).json({ message: "Catalog not found" });
    }
    res.json({ message: "Catalog deleted" });
  } catch (error) {
    console.error("Error deleting catalog:", error);
    res.status(500).json({ message: "Server error deleting catalog" });
  }
});

// 6) Update a catalog
router.put("/catalogs/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      products,
      fieldsToDisplay,
      margin,
      priceRange
    } = req.body;

    const updatedData = {
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      fieldsToDisplay: fieldsToDisplay || [],
      margin,
      priceRange
    };

    if (products) {
      // Expect an array of objects: [ { productId, color, size, quantity }, ... ]
      updatedData.products = products;
    }

    const updatedCatalog = await Catalog.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );
    if (!updatedCatalog) {
      return res.status(404).json({ message: "Catalog not found" });
    }
    res.json({ message: "Catalog updated", catalog: updatedCatalog });
  } catch (error) {
    console.error("Error updating catalog:", error);
    res.status(500).json({ message: "Server error updating catalog" });
  }
});

// 7) Approve a catalog
router.put("/catalogs/:id/approve", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const updatedCatalog = await Catalog.findByIdAndUpdate(
      req.params.id,
      { approveStatus: true },
      { new: true }
    );
    if (!updatedCatalog) {
      return res.status(404).json({ message: "Catalog not found" });
    }
    res.json({ message: "Catalog approved", catalog: updatedCatalog });
  } catch (error) {
    console.error("Error approving catalog:", error);
    res.status(500).json({ message: "Server error approving catalog" });
  }
});

// 8) Update remarks for a catalog
router.put("/catalogs/:id/remarks", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { remarks } = req.body;
    const updatedCatalog = await Catalog.findByIdAndUpdate(
      req.params.id,
      { remarks },
      { new: true }
    );
    if (!updatedCatalog) {
      return res.status(404).json({ message: "Catalog not found" });
    }
    res.json({ message: "Remarks updated", catalog: updatedCatalog });
  } catch (error) {
    console.error("Error updating remarks for catalog:", error);
    res.status(500).json({ message: "Server error updating remarks for catalog" });
  }
});

module.exports = router;
