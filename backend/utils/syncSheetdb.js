// syncSheetdb.js
const axios = require("axios");
const Product = require("../models/Product");
require("dotenv").config();

const SHEETDB_URL = process.env.SHEETDB_URL;

async function syncSheetdbData() {
  try {
    const response = await axios.get(SHEETDB_URL);
    const sheetProducts = response.data; // assuming an array of objects
    let newProductsCount = 0;
    let updatedProductsCount = 0;

    for (const record of sheetProducts) {
      const productId = record["Product ID (required)"];
      if (!productId) continue; // Skip records without a product ID

      // Map SheetDB fields to your product model fields, including GST updated to productGST
      const productData = {
        productTag: record["Product Tag (required)"] || "",
        variantId: record["Variant ID (optional)"] || "",
        category: record["Category (required)"] || "",
        subCategory: record["Sub Category (optional)"] || "",
        variationHinge: record["Variation_hinge (optional)"] || "",
        name: record["Name (required)"] || "",
        brandName: record["Brand Name (optional)"] || "",
        qty: Number(record["Qty"]) || 0,
        MRP_Currency: record["MRP_Currency"] || "",
        MRP: Number(record["MRP"]) || 0,
        MRP_Unit: record["MRP_Unit"] || "",
        deliveryTime: record["Delivery Time"] || "",
        size: record["Size"] || "",
        color: record["Color"] || "",
        material: record["Material"] || "",
        priceRange: record["Price Range"] || "",
        weight: record["Weight"] || "",
        hsnCode: record["HSN Code"] || "",
        productCost_Currency: record["Product Cost_Currency"] || "",
        productCost: Number(record["Product Cost"]) || 0,
        productCost_Unit: record["Product Cost_Unit"] || "",
        // Map the GST field from the sheet to productGST in your model
        productGST: Number(record["GST"]) || 0,
        productDetails: record["Product_Details (optional)"] || "",
        images: [
          record["Main_Image_URL (optional)"],
          record["Second_Image_URL (optional)"],
          record["Third_Image_URL (optional)"],
          record["Fourth_Image_URL (optional)"],
          record["Other_image_URL (optional)"]
        ].filter(Boolean)
      };

      // Upsert: update if exists, insert if not.
      const updateResult = await Product.updateOne(
        { productId },
        { $set: { productId, ...productData } },
        { upsert: true }
      );

      // Log and count the result for each product update or insert.
      if (updateResult.upsertedCount && updateResult.upsertedCount === 1) {
        console.log(`Inserted new product: ${productId}`);
        newProductsCount++;
      } else if (updateResult.modifiedCount && updateResult.modifiedCount === 1) {
        console.log(`Updated product: ${productId}`);
        updatedProductsCount++;
      }
    }

    console.log(
      `Sync complete. ${newProductsCount} new product(s) added and ${updatedProductsCount} product(s) updated.`
    );
    return { success: true, newProductsCount, updatedProductsCount };
  } catch (error) {
    console.error("Error syncing data from SheetDB:", error);
    return { success: false, error };
  }
}

module.exports = syncSheetdbData;
