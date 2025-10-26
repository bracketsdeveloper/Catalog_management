const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs-extra");
const axios = require("axios");
const imghash = require("imghash");
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const Product = require("../models/Product");
const User = require("../models/User");
const Log = require("../models/Log");
const Vendor = require("../models/Vendor");

// ------------------------------
// UTILITY FUNCTIONS
// ------------------------------

async function createLog(action, field, oldValue, newValue, performedBy, ip) {
  try {
    await Log.create({
      action,
      field,
      oldValue,
      newValue,
      performedBy,
      performedAt: new Date(),
      ipAddress: ip,
    });
  } catch (err) {
    console.error("Error creating log:", err);
  }
}

function getFieldDifferences(oldDoc, newDoc) {
  const changes = [];
  for (const key of Object.keys(newDoc)) {
    const oldVal = oldDoc[key] == null ? "" : String(oldDoc[key]);
    const newVal = newDoc[key] == null ? "" : String(newDoc[key]);
    if (oldVal !== newVal) {
      changes.push({
        field: key,
        oldValue: oldDoc[key],
        newValue: newDoc[key],
      });
    }
  }
  return changes;
}

async function computeImageHash(source, bitLength = 8) {
  try {
    let buffer;
    if (/^https?:\/\//i.test(source)) {
      const response = await axios.get(source, { responseType: "arraybuffer" });
      buffer = Buffer.from(response.data, "binary");
    } else if (Buffer.isBuffer(source)) {
      buffer = source;
    } else {
      throw new Error("Invalid source: must be a URL or Buffer");
    }

    if (buffer.length < 100) {
      throw new Error("Image file is too small or corrupted");
    }

    const hash = await imghash.hash(buffer, bitLength);
    if (!hash) {
      throw new Error("Hash computation returned no result");
    }
    return hash;
  } catch (error) {
    console.error("Error computing hash for source:", error.message);
    return null;
  }
}

async function computeAllHashes(imageUrls) {
  const hashes = [];
  for (const url of imageUrls || []) {
    const hash = await computeImageHash(url);
    if (hash) hashes.push(hash);
  }
  return hashes;
}

// ------------------------------
// USER ENDPOINTS
// ------------------------------

router.get("/users", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const users = await User.find({}, "name dateOfBirth address phone email role");
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

router.get("/products/filter-options", async (req, res) => {
  try {
    const products = await Product.find({});
    const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
    const subCategories = [...new Set(products.map((p) => p.subCategory).filter(Boolean))].sort();
    const brands = [...new Set(products.map((p) => p.brandName).filter(Boolean))].sort();
    const priceRanges = [...new Set(products.map((p) => p.priceRange).filter(Boolean))].sort(
      (a, b) => a - b
    );
    const variationHinges = [...new Set(products.map((p) => p.variationHinge).filter(Boolean))].sort();

    res.status(200).json({ categories, subCategories, brands, priceRanges, variationHinges });
  } catch (error) {
    res.status(500).json({ error: "Error fetching filter options" });
  }
});

router.put("/users/:id/role", authenticate, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!["GENERAL", "ADMIN"].includes(role)) {
    return res.status(400).json({ message: "Invalid role specified" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true, runValidators: true }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: "Role updated successfully", user });
  } catch (err) {
    console.error("Error updating user role:", err);
    res.status(500).json({ message: "Server error while updating role" });
  }
});

// ------------------------------
// VENDOR ENDPOINT FOR SUGGESTIONS
// ------------------------------

router.get("/vendors/suggestions", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { query = "" } = req.query;
    const vendors = await Vendor.find({
      deleted: false,
      $or: [
        { vendorCompany: { $regex: query, $options: "i" } },
        { vendorName:    { $regex: query, $options: "i" } },
      ],
    })
      .select("vendorCompany vendorName _id")
      .limit(10)
      .lean();
    res.status(200).json(vendors);
  } catch (err) {
    console.error("Error fetching vendor suggestions:", err);
    res.status(500).json({ message: "Server error fetching vendor suggestions" });
  }
});

// ------------------------------
// PRODUCT ENDPOINTS
// ------------------------------

router.get("/products", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search,
      categories,
      subCategories,
      brands,
      priceRanges,
      variationHinges,
    } = req.query;

    const query = {};

    if (search) {
      const searchTerms = search.split(",").map((term) => term.trim().toLowerCase());
      query.$or = searchTerms.flatMap((term) => [
        { productTag: { $regex: term, $options: "i" } },
        { productId: { $regex: term, $options: "i" } },
        { variantId: { $regex: term, $options: "i" } },
        { category: { $regex: term, $options: "i" } },
        { subCategory: { $regex: term, $options: "i" } },
        { variationHinge: { $regex: term, $options: "i" } },
        { name: { $regex: term, $options: "i" } },
        { brandName: { $regex: term, $options: "i" } },
        { productDetails: { $regex: term, $options: "i" } },
        { priceRange: { $regex: term, $options: "i" } },
        { MRP_Currency: { $regex: term, $options: "i" } },
        { MRP_Unit: { $regex: term, $options: "i" } },
        { deliveryTime: { $regex: term, $options: "i" } },
        { size: { $regex: term, $options: "i" } },
        { color: { $regex: term, $options: "i" } },
        { material: { $regex: term, $options: "i" } },
        { weight: { $regex: term, $options: "i" } },
        { hsnCode: { $regex: term, $options: "i" } },
        { productCost_Currency: { $regex: term, $options: "i" } },
        { productCost_Unit: { $regex: term, $options: "i" } },
        { images: { $elemMatch: { $regex: term, $options: "i" } } },
      ]);
    }

    if (categories)
      query.category = { $in: categories.split(",").map((v) => new RegExp(`^${v}$`, "i")) };
    if (subCategories)
      query.subCategory = { $in: subCategories.split(",").map((v) => new RegExp(`^${v}$`, "i")) };
    if (brands)
      query.brandName = { $in: brands.split(",").map((v) => new RegExp(`^${v}$`, "i")) };
    if (priceRanges)
      query.priceRange = { $in: priceRanges.split(",").map((v) => new RegExp(`^${v}$`, "i")) };
    if (variationHinges)
      query.variationHinge = {
        $in: variationHinges.split(",").map((v) => new RegExp(`^${v}$`, "i")),
      };

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .populate("preferredVendors", "vendorCompany vendorName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    const totalProducts = await Product.countDocuments(query);

    res.status(200).json({
      products,
      currentPage: pageNum,
      totalPages: Math.ceil(totalProducts / limitNum),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error fetching products" });
  }
});

router.get(
  "/products/filters",
  authenticate,
  authorizeAdmin,
  async (req, res) => {
    try {
      const {
        categories,
        subCategories,
        brands,
        priceRanges,
        variationHinges,
      } = req.query;

      const match = {};
      if (categories) {
        match.category = {
          $in: categories.split(",").map((v) => new RegExp(`^${v.trim()}$`, "i")),
        };
      }
      if (subCategories) {
        match.subCategory = {
          $in: subCategories.split(",").map((v) => new RegExp(`^${v.trim()}$`, "i")),
        };
      }
      if (brands) {
        match.brandName = {
          $in: brands.split(",").map((v) => new RegExp(`^${v.trim()}$`, "i")),
        };
      }
      if (priceRanges) {
        match.priceRange = {
          $in: priceRanges.split(",").map((v) => new RegExp(`^${v.trim()}$`, "i")),
        };
      }
      if (variationHinges) {
        match.variationHinge = {
          $in: variationHinges.split(",").map((v) => new RegExp(`^${v.trim()}$`, "i")),
        };
      }

      const buildAggregation = (field, excludeField) => {
        const filteredMatch = { ...match };
        if (excludeField) {
          delete filteredMatch[excludeField];
        }
        return [
          ...(Object.keys(filteredMatch).length ? [{ $match: filteredMatch }] : []),
          { $match: { [field]: { $nin: [null, ""] } } },
          { $project: { name: { $toLower: { $trim: { input: `$${field}` } } } } },
          { $group: { _id: "$name", count: { $sum: 1 } } },
          { $project: { name: "$_id", count: 1, _id: 0 } },
          { $sort: { name: 1 } },
        ];
      };

      const buildPriceRangeAggregation = () => {
        const filteredMatch = { ...match };
        delete filteredMatch.priceRange;
        return [
          ...(Object.keys(filteredMatch).length ? [{ $match: filteredMatch }] : []),
          { $match: { priceRange: { $nin: [null, ""] } } },
          {
            $project: {
              name: { $trim: { input: "$priceRange" } },
              start: {
                $convert: {
                  input: {
                    $arrayElemAt: [
                      { $split: [{ $trim: { input: "$priceRange" } }, "-"] },
                      0,
                    ],
                  },
                  to: "int",
                  onError: Number.MAX_SAFE_INTEGER,
                  onNull: Number.MAX_SAFE_INTEGER,
                },
              },
            },
          },
          { $group: { _id: "$name", count: { $sum: 1 }, start: { $first: "$start" } } },
          { $project: { name: "$_id", count: 1, _id: 0 } },
          { $sort: { start: 1 } },
        ];
      };

      const [
        categoriesAgg,
        subCategoriesAgg,
        brandsAgg,
        priceRangesAgg,
        variationHingesAgg,
      ] = await Promise.all([
        Product.aggregate(buildAggregation("category", "category")),
        Product.aggregate(buildAggregation("subCategory", "subCategory")),
        Product.aggregate(buildAggregation("brandName", "brandName")),
        Product.aggregate(buildPriceRangeAggregation()),
        Product.aggregate(buildAggregation("variationHinge", "variationHinge")),
      ]);

      res.status(200).json({
        categories: categoriesAgg,
        subCategories: subCategoriesAgg,
        brands: brandsAgg,
        priceRanges: priceRangesAgg,
        variationHinges: variationHingesAgg,
      });
    } catch (err) {
      console.error("Error fetching filter options:", err);
      res.status(500).json({ message: "Server error fetching filter options" });
    }
  }
);

router.post("/products", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { images = [], preferredVendors = [] } = req.body;

    if (!req.body.productTag || !req.body.productId || !req.body.category || !req.body.name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Validate vendor IDs
    if (preferredVendors.length > 0) {
      const validVendors = await Vendor.find({ _id: { $in: preferredVendors }, deleted: false });
      if (validVendors.length !== preferredVendors.length) {
        return res.status(400).json({
          success: false,
          message: "One or more vendor IDs are invalid or deleted",
        });
      }
    }

    const imageHashes = images.length > 0 ? await computeAllHashes(images) : [];

    const newProduct = new Product({
      productTag: req.body.productTag,
      productId: req.body.productId,
      variantId: req.body.variantId || "",
      category: req.body.category,
      subCategory: req.body.subCategory || "",
      variationHinge: req.body.variationHinge || "",
      name: req.body.name,
      brandName: req.body.brandName || "",
      images: images.filter((img) => typeof img === "string" && img.trim() !== ""),
      imageHashes,
      productDetails: req.body.productDetails || "",
      qty: Number(req.body.qty) || 0,
      MRP_Currency: req.body.MRP_Currency || "",
      MRP: Number(req.body.MRP) || 0,
      MRP_Unit: req.body.MRP_Unit || "",
      deliveryTime: req.body.deliveryTime || "",
      size: req.body.size || "",
      color: req.body.color || "",
      material: req.body.material || "",
      priceRange: req.body.priceRange || "",
      weight: req.body.weight || "",
      hsnCode: req.body.hsnCode || "",
      productCost_Currency: req.body.productCost_Currency || "",
      productCost: Number(req.body.productCost) || 0,
      productCost_Unit: req.body.productCost_Unit || "",
      productGST: Number(req.body.productGST) || 0,
      preferredVendors,
    });

    await newProduct.save();

    await createLog(
      "create",
      null,
      null,
      newProduct,
      req.user ? req.user._id : null,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Product ID must be unique",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Server error creating product",
        error: error.message,
      });
    }
  }
});

router.put("/products/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { images = [], preferredVendors = [] } = req.body;

    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Validate vendor IDs
    if (preferredVendors.length > 0) {
      const validVendors = await Vendor.find({ _id: { $in: preferredVendors }, deleted: false });
      if (validVendors.length !== preferredVendors.length) {
        return res.status(400).json({
          success: false,
          message: "One or more vendor IDs are invalid or deleted",
        });
      }
    }

    const imageHashes =
      JSON.stringify(images) !== JSON.stringify(existingProduct.images)
        ? await computeAllHashes(images)
        : existingProduct.imageHashes;

    const updatedData = {
      productTag: req.body.productTag || existingProduct.productTag,
      productId: req.body.productId || existingProduct.productId,
      variantId: req.body.variantId || existingProduct.variantId,
      category: req.body.category || existingProduct.category,
      subCategory: req.body.subCategory || existingProduct.subCategory,
      variationHinge: req.body.variationHinge || existingProduct.variationHinge,
      name: req.body.name || existingProduct.name,
      brandName: req.body.brandName || existingProduct.brandName,
      images: images.filter((img) => typeof img === "string" && img.trim() !== ""),
      imageHashes,
      productDetails: req.body.productDetails || existingProduct.productDetails,
      qty: req.body.qty != null ? Number(req.body.qty) : existingProduct.qty,
      MRP_Currency: req.body.MRP_Currency || existingProduct.MRP_Currency,
      MRP: req.body.MRP != null ? Number(req.body.MRP) : existingProduct.MRP,
      MRP_Unit: req.body.MRP_Unit || existingProduct.MRP_Unit,
      deliveryTime: req.body.deliveryTime || existingProduct.deliveryTime,
      size: req.body.size || existingProduct.size,
      color: req.body.color || existingProduct.color,
      material: req.body.material || existingProduct.material,
      priceRange: req.body.priceRange || existingProduct.priceRange,
      weight: req.body.weight || existingProduct.weight,
      hsnCode: req.body.hsnCode || existingProduct.hsnCode,
      productCost_Currency:
        req.body.productCost_Currency || existingProduct.productCost_Currency,
      productCost:
        req.body.productCost != null
          ? Number(req.body.productCost)
          : existingProduct.productCost,
      productCost_Unit: req.body.productCost_Unit || existingProduct.productCost_Unit,
      productGST:
        req.body.productGST != null
          ? Number(req.body.productGST)
          : existingProduct.productGST,
      preferredVendors,
    };

    const fieldDiffs = getFieldDifferences(existingProduct.toObject(), updatedData);

    const updatedProduct = await Product.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    }).populate("preferredVendors", "vendorCompany vendorName");

    for (const diff of fieldDiffs) {
      await createLog(
        "update",
        diff.field,
        diff.oldValue,
        diff.newValue,
        req.user ? req.user._id : null,
        req.ip
      );
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating product",
      error: error.message,
    });
  }
});

router.delete("/products/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    await Product.findByIdAndDelete(req.params.id);

    await createLog(
      "delete",
      null,
      existingProduct,
      null,
      req.user ? req.user._id : null,
      req.ip
    );

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server error deleting product" });
  }
});

router.post("/products/bulk", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const productsData = req.body.map((p) => ({
      productTag: p.productTag,
      productId: p.productId,
      variantId: p.variantId || "",
      category: p.category,
      subCategory: p.subCategory || "",
      variationHinge: p.variationHinge || "",
      name: p.name,
      brandName: p.brandName || "",
      images: p.images || [],
      productDetails: p.productDetails || "",
      qty: Number(p.qty) || 0,
      MRP_Currency: p.MRP_Currency || "",
      MRP: Number(p.MRP) || 0,
      MRP_Unit: p.MRP_Unit || "",
      deliveryTime: p.deliveryTime || "",
      size: p.size || "",
      color: p.color || "",
      material: p.material || "",
      priceRange: p.priceRange || "",
      weight: p.weight || "",
      hsnCode: p.hsnCode || "",
      productCost_Currency: p.productCost_Currency || "",
      productCost: Number(p.productCost) || 0,
      productCost_Unit: p.productCost_Unit || "",
      productGST: Number(p.productGST) || 0,
      preferredVendors: p.preferredVendors || [],
    }));

    // Validate vendor IDs
    for (const prodData of productsData) {
      if (prodData.preferredVendors.length > 0) {
        const validVendors = await Vendor.find({ _id: { $in: prodData.preferredVendors }, deleted: false });
        if (validVendors.length !== prodData.preferredVendors.length) {
          return res.status(400).json({
            success: false,
            message: "One or more vendor IDs are invalid or deleted in bulk upload",
          });
        }
      }
      prodData.imageHashes = await computeAllHashes(prodData.images);
    }

    const insertedProducts = await Product.insertMany(productsData);

    for (const prod of insertedProducts) {
      await createLog(
        "create",
        null,
        null,
        prod,
        req.user ? req.user._id : null,
        req.ip
      );
    }

    res.status(201).json({ message: "Products created successfully" });
  } catch (error) {
    console.error("Error bulk uploading products:", error);
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Duplicate product ID detected",
      });
    } else {
      res.status(500).json({ message: "Server error during bulk upload" });
    }
  }
});

router.get("/products/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const full = req.query.full === "true";
    let product;
    if (full) {
      product = await Product.findById(req.params.id)
        .populate("preferredVendors", "vendorCompany vendorName")
        .lean();
    } else {
      product = await Product.findById(req.params.id)
        .select("name productDetails brandName category subCategory images productCost productGST preferredVendors")
        .populate("preferredVendors", "vendorCompany vendorName")
        .lean();
    }
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Server error fetching product" });
  }
});

// Multer configuration for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, or GIF images are allowed"));
    }
    cb(null, true);
  },
});

router.post("/products/advanced-search", authenticate, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const imageFile = req.file;

    let hash;
    try {
      hash = await computeImageHash(imageFile.buffer, 8);
    } catch (hashError) {
      console.error("Error computing image hash:", hashError.message);
      return res.status(500).json({ message: "Failed to compute image hash" });
    }

    if (!hash) {
      return res.status(500).json({ message: "Image hash computation returned no result" });
    }

    const products = await Product.find({
      imageHashes: { $in: [hash] },
    })
      .populate("preferredVendors", "vendorCompany vendorName")
      .lean();

    await createLog(
      "image_search",
      "imageHashes",
      null,
      hash,
      req.user ? req.user._id : null,
      req.ip
    );

    if (products.length === 0) {
      return res.status(200).json({
        message: "No products found matching the uploaded image",
        products: [],
      });
    }

    res.status(200).json({
      message: "Products found",
      products,
    });
  } catch (error) {
    console.error("Error in advanced search:", error.message);
    res.status(500).json({ message: "Server error during advanced search", error: error.message });
  }
});

module.exports = router;
