const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs-extra");
const axios = require("axios");
const imghash = require("imghash");
const mongoose = require("mongoose"); // ADDED THIS LINE
const { authenticate, authorizeAdmin } = require("../middleware/authenticate");
const Product = require("../models/Product");
const User = require("../models/User");
const Log = require("../models/Log");
const Vendor = require("../models/Vendor");

// ------------------------------
// UTILITY FUNCTIONS
// ------------------------------

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && 
         (new mongoose.Types.ObjectId(id)).toString() === id;
}

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

/**
 * Generate product ID based on category, subCategory, brandName, and product name
 * Format: [CAT(2-3)][SUBCAT(2-3)][BRAND(2-3)][NAME(2-3)][111+]
 */
async function generateProductId(category, subCategory, brandName, productName) {
  try {
    // Helper to get exactly 2 character code (fixed length for consistency)
    function getCode(str) {
      if (!str) return 'XX';
      
      const cleaned = str.toString().trim().toUpperCase();
      const words = cleaned.split(/\s+/);
      
      if (words.length === 1) {
        // Single word: use first 2 letters
        return cleaned.substring(0, 2).padEnd(2, 'X');
      } else {
        // Multiple words: use first letter of first 2 words
        return words.slice(0, 2).map(w => w.charAt(0)).join('').padEnd(2, 'X');
      }
    }
    
    const catCode = getCode(category);
    const subCatCode = getCode(subCategory);
    const brandCode = getCode(brandName);
    const nameCode = getCode(productName);
    
    const prefix = `${catCode}${subCatCode}${brandCode}${nameCode}`;
    
    // Find all products with this exact prefix using regex
    // Escape any special regex characters in prefix
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingProducts = await Product.find(
      { productId: { $regex: `^${escapedPrefix}\\d+$` } },
      'productId'
    ).lean();
    
    let nextNumber = 111;
    
    if (existingProducts.length > 0) {
      // Extract numbers from the end of each product ID
      const existingNumbers = existingProducts
        .map(p => {
          // Use regex to extract trailing digits
          const match = p.productId.match(/(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
      
      if (existingNumbers.length > 0) {
        nextNumber = Math.max(...existingNumbers) + 1;
      }
    }
    
    // Ensure minimum of 111
    nextNumber = Math.max(nextNumber, 111);
    
    let productId = `${prefix}${nextNumber}`;
    
    // Final uniqueness check (handles race conditions)
    let attempts = 0;
    while (attempts < 10) {
      const exists = await Product.findOne({ productId }).lean();
      if (!exists) {
        return productId;
      }
      // Increment and try again
      nextNumber++;
      productId = `${prefix}${nextNumber}`;
      attempts++;
    }
    
    // Fallback: use timestamp for guaranteed uniqueness
    return `${prefix}${Date.now().toString().slice(-8)}`;
    
  } catch (error) {
    console.error("Error generating product ID:", error);
    // Fallback: timestamp-based ID
    return `PID${Date.now()}`;
  }
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

router.get("/products/filters", authenticate, authorizeAdmin, async (req, res) => {
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

    const buildRelationships = async () => {
      const relationships = {
        categories: {},
        subCategories: {},
        brands: {},
        priceRanges: {},
        variationHinges: {}
      };

      const categorySubCategoryMap = await Product.aggregate([
        { $match: { category: { $nin: [null, ""] }, subCategory: { $nin: [null, ""] } } },
        { $group: { 
          _id: { $toLower: { $trim: { input: "$category" } } }, 
          subCategories: { $addToSet: { $toLower: { $trim: { input: "$subCategory" } } } }
        }},
        { $project: { category: "$_id", subCategories: 1, _id: 0 } }
      ]);

      categorySubCategoryMap.forEach(item => {
        relationships.categories[item.category] = item.subCategories;
      });

      const categoryHingeMap = await Product.aggregate([
        { $match: { category: { $nin: [null, ""] }, variationHinge: { $nin: [null, ""] } } },
        { $group: { 
          _id: { $toLower: { $trim: { input: "$category" } } }, 
          hinges: { $addToSet: { $toLower: { $trim: { input: "$variationHinge" } } } }
        }},
        { $project: { category: "$_id", hinges: 1, _id: 0 } }
      ]);

      categoryHingeMap.forEach(item => {
        relationships.categories[item.category] = [
          ...(relationships.categories[item.category] || []),
          ...item.hinges
        ];
      });

      const subCategoryHingeMap = await Product.aggregate([
        { $match: { subCategory: { $nin: [null, ""] }, variationHinge: { $nin: [null, ""] } } },
        { $group: { 
          _id: { $toLower: { $trim: { input: "$subCategory" } } }, 
          hinges: { $addToSet: { $toLower: { $trim: { input: "$variationHinge" } } } }
        }},
        { $project: { subCategory: "$_id", hinges: 1, _id: 0 } }
      ]);

      subCategoryHingeMap.forEach(item => {
        relationships.subCategories[item.subCategory] = item.hinges;
      });

      return relationships;
    };

    const [
      categoriesAgg,
      subCategoriesAgg,
      brandsAgg,
      priceRangesAgg,
      variationHingesAgg,
      relationships
    ] = await Promise.all([
      Product.aggregate(buildAggregation("category", "category")),
      Product.aggregate(buildAggregation("subCategory", "subCategory")),
      Product.aggregate(buildAggregation("brandName", "brandName")),
      Product.aggregate(buildPriceRangeAggregation()),
      Product.aggregate(buildAggregation("variationHinge", "variationHinge")),
      buildRelationships()
    ]);

    res.status(200).json({
      categories: categoriesAgg,
      subCategories: subCategoriesAgg,
      brands: brandsAgg,
      priceRanges: priceRangesAgg,
      variationHinges: variationHingesAgg,
      relationships,
    });
  } catch (err) {
    console.error("Error fetching filter options:", err);
    res.status(500).json({ message: "Server error fetching filter options" });
  }
});

router.post("/products", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { images = [], preferredVendors = [], ...restBody } = req.body;

    if (!restBody.productTag || !restBody.category || !restBody.name) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (productTag, category, name)",
      });
    }

    // Generate product ID automatically
    const productId = await generateProductId(
      restBody.category,
      restBody.subCategory || "",
      restBody.brandName || "",
      restBody.name
    );

    const existingProduct = await Product.findOne({ productId: productId });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: `Generated product ID "${productId}" already exists`,
      });
    }

    // Validate vendor IDs
    if (preferredVendors.length > 0) {
      const validVendorIds = preferredVendors.filter(id => isValidObjectId(id));
      if (validVendorIds.length !== preferredVendors.length) {
        return res.status(400).json({
          success: false,
          message: "Invalid vendor ID format detected",
        });
      }
      
      const validVendors = await Vendor.find({ _id: { $in: validVendorIds }, deleted: false });
      if (validVendors.length !== validVendorIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more vendor IDs are invalid or deleted",
        });
      }
    }

    const imageHashes = images.length > 0 ? await computeAllHashes(images) : [];

    // Create log entry for creation - Ensure we have req.user._id
    const creationLog = {
      action: "create",
      field: null,
      oldValue: null,
      newValue: null,
      performedBy: req.user._id || req.user.id, // Handle both formats
      performedAt: new Date(),
      ipAddress: req.ip,
    };

    const newProduct = new Product({
      productId,
      productTag: restBody.productTag,
      variantId: restBody.variantId || "",
      category: restBody.category,
      subCategory: restBody.subCategory || "",
      variationHinge: restBody.variationHinge || "",
      name: restBody.name,
      brandName: restBody.brandName || "",
      images: images.filter((img) => typeof img === "string" && img.trim() !== ""),
      imageHashes,
      productDetails: restBody.productDetails || "",
      qty: Number(restBody.qty) || 0,
      MRP_Currency: restBody.MRP_Currency || "",
      MRP: Number(restBody.MRP) || 0,
      MRP_Unit: restBody.MRP_Unit || "",
      deliveryTime: restBody.deliveryTime || "",
      size: restBody.size || "",
      color: restBody.color || "",
      material: restBody.material || "",
      priceRange: restBody.priceRange || "",
      weight: restBody.weight || "",
      hsnCode: restBody.hsnCode || "",
      productCost_Currency: restBody.productCost_Currency || "",
      productCost: Number(restBody.productCost) || 0,
      productCost_Unit: restBody.productCost_Unit || "",
      productGST: Number(restBody.productGST) || 0,
      preferredVendors,
      createdBy: req.user._id || req.user.id,
      logs: [creationLog],
    });

    await newProduct.save();

    // Also create separate log entry
    await createLog(
      "create",
      null,
      null,
      newProduct,
      req.user._id || req.user.id,
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
      const validVendorIds = preferredVendors.filter(id => isValidObjectId(id));
      if (validVendorIds.length !== preferredVendors.length) {
        return res.status(400).json({
          success: false,
          message: "Invalid vendor ID format detected",
        });
      }
      
      const validVendors = await Vendor.find({ _id: { $in: validVendorIds }, deleted: false });
      if (validVendors.length !== validVendorIds.length) {
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
      productId: existingProduct.productId,
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

    // Create log entries for each changed field - Ensure we have req.user._id
    const logEntries = [];
    fieldDiffs.forEach((diff) => {
      logEntries.push({
        action: "update",
        field: diff.field,
        oldValue: diff.oldValue,
        newValue: diff.newValue,
        performedBy: req.user._id || req.user.id, // Handle both formats
        performedAt: new Date(),
        ipAddress: req.ip,
      });
    });

    // If no specific fields changed but we're updating, add a general update log
    if (logEntries.length === 0 && Object.keys(req.body).length > 0) {
      logEntries.push({
        action: "update",
        field: "general",
        oldValue: null,
        newValue: null,
        performedBy: req.user._id || req.user.id,
        performedAt: new Date(),
        ipAddress: req.ip,
      });
    }

    // Add logs to the product
    if (logEntries.length > 0) {
      updatedData.$push = { logs: { $each: logEntries } };
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    }).populate("preferredVendors", "vendorCompany vendorName");

    // Also create separate log entries
    for (const diff of fieldDiffs) {
      await createLog(
        "update",
        diff.field,
        diff.oldValue,
        diff.newValue,
        req.user._id || req.user.id,
        req.ip
      );
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
      changes: fieldDiffs,
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
      productTag: p.productTag || "",
      variantId: p.variantId || "",
      category: p.category || "",
      subCategory: p.subCategory || "",
      variationHinge: p.variationHinge || "",
      name: p.name || "",
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

    // Generate unique product IDs for each item
    const productsWithIds = [];
    for (const prodData of productsData) {
      const productId = await generateProductId(
        prodData.category,
        prodData.subCategory || "",
        prodData.brandName || "",
        prodData.name
      );
      
      productsWithIds.push({
        ...prodData,
        productId,
        imageHashes: await computeAllHashes(prodData.images),
      });
    }

    // Check for duplicates (shouldn't happen with generated IDs, but just in case)
    const productIds = productsWithIds.map(p => p.productId);
    const existingProducts = await Product.find({ productId: { $in: productIds } });
    
    if (existingProducts.length > 0) {
      const existingIds = existingProducts.map(p => p.productId);
      return res.status(400).json({
        success: false,
        message: `Duplicate product IDs found: ${existingIds.join(', ')}`,
        duplicates: existingIds
      });
    }

    // Validate vendor IDs for all products
    for (const prodData of productsWithIds) {
      if (prodData.preferredVendors.length > 0) {
        const validVendorIds = prodData.preferredVendors.filter(id => isValidObjectId(id));
        if (validVendorIds.length !== prodData.preferredVendors.length) {
          return res.status(400).json({
            success: false,
            message: "Invalid vendor ID format detected in bulk upload",
          });
        }
        
        const validVendors = await Vendor.find({ _id: { $in: validVendorIds }, deleted: false });
        if (validVendors.length !== validVendorIds.length) {
          return res.status(400).json({
            success: false,
            message: "One or more vendor IDs are invalid or deleted in bulk upload",
          });
        }
      }
    }

    const insertedProducts = await Product.insertMany(productsWithIds);

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

    res.status(201).json({ 
      success: true,
      message: "Products created successfully",
      count: insertedProducts.length 
    });
  } catch (error) {
    console.error("Error bulk uploading products:", error);
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Duplicate product ID detected in bulk upload",
      });
    } else {
      res.status(500).json({ 
        success: false,
        message: "Server error during bulk upload",
        error: error.message 
      });
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

router.post("/products/logs/latest", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: "Invalid or empty product IDs" });
    }

    const objectIds = productIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      return res.status(400).json({ message: "No valid product IDs provided" });
    }

    const products = await Product.aggregate([
      { $match: { _id: { $in: objectIds } } },
      { $unwind: "$logs" },
      { $sort: { "logs.performedAt": -1 } },
      {
        $group: {
          _id: "$_id",
          latestLog: { $first: "$logs" },
          productName: { $first: "$name" },
          productId: { $first: "$productId" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "latestLog.performedBy",
          foreignField: "_id",
          as: "performedBy",
        },
      },
      { $unwind: { path: "$performedBy", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          action: "$latestLog.action",
          field: "$latestLog.field",
          performedBy: {
            $ifNull: [
              { _id: "$performedBy._id", email: "$performedBy.email", name: "$performedBy.name" },
              { email: "Unknown", name: "Unknown" },
            ],
          },
          performedAt: "$latestLog.performedAt",
          productName: 1,
          productCode: "$productId",
        },
      },
    ]);

    const latestLogs = {};
    productIds.forEach((id) => {
      const log = products.find((l) => l.productId.toString() === id);
      latestLogs[id] = log
        ? {
            action: log.action,
            field: log.field,
            performedBy: log.performedBy,
            performedAt: log.performedAt,
            productName: log.productName,
            productCode: log.productCode,
          }
        : {};
    });

    res.json({ latestLogs });
  } catch (error) {
    console.error("Error fetching latest logs:", error);
    res.status(500).json({ message: "Server error fetching latest logs" });
  }
});

// GET all logs for a specific product
router.get("/products/:id/logs", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("logs.performedBy", "name email")
      .select("logs name productId")
      .lean();
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Sort logs by date (newest first)
    const sortedLogs = (product.logs || []).sort(
      (a, b) => new Date(b.performedAt) - new Date(a.performedAt)
    );

    res.json({
      productName: product.name,
      productId: product.productId,
      logs: sortedLogs,
    });
  } catch (error) {
    console.error("Error fetching product logs:", error);
    res.status(500).json({ message: "Server error fetching product logs" });
  }
});

// Update the /products/logs/latest route in your backend

router.post("/products/logs/latest", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: "Invalid or empty product IDs" });
    }

    const objectIds = productIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    if (objectIds.length === 0) {
      return res.status(400).json({ message: "No valid product IDs provided" });
    }

    const products = await Product.aggregate([
      { $match: { _id: { $in: objectIds } } },
      { $unwind: "$logs" },
      { $sort: { "logs.performedAt": -1 } },
      {
        $group: {
          _id: "$_id",
          latestLog: { $first: "$logs" },
          productName: { $first: "$name" },
          productId: { $first: "$productId" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "latestLog.performedBy",
          foreignField: "_id",
          as: "performedBy",
        },
      },
      { $unwind: { path: "$performedBy", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          action: "$latestLog.action",
          field: "$latestLog.field",
          performedBy: {
            _id: "$performedBy._id",
            email: { $ifNull: ["$performedBy.email", "Unknown"] },
            name: { $ifNull: ["$performedBy.name", "Unknown"] },
          },
          performedAt: "$latestLog.performedAt",
          productName: 1,
          productCode: "$productId",
        },
      },
    ]);

    const latestLogs = {};
    productIds.forEach((id) => {
      const log = products.find((l) => l.productId.toString() === id);
      latestLogs[id] = log
        ? {
            action: log.action,
            field: log.field,
            performedBy: log.performedBy,
            performedAt: log.performedAt,
            productName: log.productName,
            productCode: log.productCode,
          }
        : {
            action: "unknown",
            field: null,
            performedBy: { _id: null, email: "Unknown", name: "Unknown" },
            performedAt: null,
            productName: "",
            productCode: "",
          };
    });

    res.json({ latestLogs });
  } catch (error) {
    console.error("Error fetching latest logs:", error);
    res.status(500).json({ message: "Server error fetching latest logs" });
  }
});

module.exports = router;