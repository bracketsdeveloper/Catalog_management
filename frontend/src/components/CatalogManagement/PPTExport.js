// src/components/CatalogManagement/PPTExport.js
import PptxGenJS from "pptxgenjs";
import { getBase64ImageFromUrl } from "./exportUtils";
import { templateConfig } from "./constants";

function sanitizeText(text) {
  return text
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/[^\x00-\x7F]/g, "");
}

export default async function PPTExport({ catalog, templateId = "1" }) {
  try {
    const tmpl = templateConfig[templateId];
    if (!tmpl) {
      throw new Error("Invalid template selection");
    }

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inches

    // Define slide masters
    pptx.defineSlideMaster({
      title: "COVER_SLIDE",
      background: { color: tmpl.ppt1?.background || "FFFFFF" },
      objects: [
        {
          image: {
            x: 0.5,
            y: 0.5,
            w: 2,
            h: 1,
            path: tmpl.ppt1?.logo || "",
          },
        },
        {
          text: {
            text: "{catalogName}",
            options: {
              x: 0.5,
              y: 2,
              w: 12,
              h: 1,
              fontSize: 36,
              bold: true,
              color: tmpl.ppt1?.fontColor || "000000",
              align: "center",
            },
          },
        },
        {
          text: {
            text: "{customerCompany}",
            options: {
              x: 0.5,
              y: 3.5,
              w: 12,
              h: 0.5,
              fontSize: 24,
              color: tmpl.ppt1?.fontColor || "000000",
              align: "center",
            },
          },
        },
      ],
    });

    pptx.defineSlideMaster({
      title: "PRODUCT_SLIDE",
      background: { color: tmpl.ppt2?.background || "FFFFFF" },
      objects: [
        {
          image: {
            x: 0.5,
            y: 1,
            w: 6,
            h: 4,
            path: tmpl.ppt2?.logo || "",
          },
        },
        {
          text: {
            text: "{productName}",
            options: {
              x: 7,
              y: 1,
              w: 6,
              h: 0.5,
              fontSize: 24,
              bold: true,
              color: tmpl.ppt2?.fontColor || "000000",
            },
          },
        },
        {
          text: {
            text: "Brand Name: {productBrand}",
            options: {
              x: 7,
              y: 1.8,
              w: 6,
              h: 0.4,
              fontSize: 18,
              color: tmpl.ppt2?.fontColor || "000000",
            },
          },
        },
        {
          text: {
            text: "Description: {productDescription}",
            options: {
              x: 7,
              y: 2.4,
              w: 5.5,
              h: 1.5,
              fontSize: 14,
              color: tmpl.ppt2?.fontColor || "000000",
            },
          },
        },
        {
          text: {
            text: "Qty: {quantity}",
            options: {
              x: 7,
              y: 4.1,
              w: 5,
              h: 0.4,
              fontSize: 18,
              color: tmpl.ppt2?.fontColor || "000000",
            },
          },
        },
        {
          text: {
            text: "Rate in INR (per pc): {rate}",
            options: {
              x: 7,
              y: 4.7,
              w: 5,
              h: 0.4,
              fontSize: 18,
              color: tmpl.ppt2?.fontColor || "000000",
            },
          },
        },
        {
          text: {
            text: "GST: {gst}%",
            options: {
              x: 7,
              y: 5.3,
              w: 5,
              h: 0.4,
              fontSize: 18,
              color: tmpl.ppt2?.fontColor || "000000",
            },
          },
        },
      ],
    });

    pptx.defineSlideMaster({
      title: "END_SLIDE",
      background: { color: tmpl.ppt3?.background || "FFFFFF" },
      objects: [
        {
          image: {
            x: 0.5,
            y: 0.5,
            w: 2,
            h: 1,
            path: tmpl.ppt3?.logo || "",
          },
        },
        {
          text: {
            text: "Thank You",
            options: {
              x: 0.5,
              y: 2,
              w: 12,
              h: 1,
              fontSize: 36,
              bold: true,
              color: tmpl.ppt3?.fontColor || "000000",
              align: "center",
            },
          },
        },
      ],
    });

    // Cover Slide
    const coverSlide = pptx.addSlide({ masterName: "COVER_SLIDE" });
    coverSlide.addText(catalog.catalogName || "Catalog", {
      placeholder: "{catalogName}",
    });
    coverSlide.addText(catalog.customerCompany || "", {
      placeholder: "{customerCompany}",
    });

    // Product Slides
    for (let i = 0; i < (catalog.products || []).length; i++) {
      const sub = catalog.products[i];
      const prod = sub.productId && typeof sub.productId === "object" ? sub.productId : {};
      const slide = pptx.addSlide({ masterName: "PRODUCT_SLIDE" });

      // Product Image
      let mainImg = (prod.images && prod.images[0]) || (sub.images && sub.images[0]) || "";
      if (mainImg && mainImg.startsWith("http://")) {
        mainImg = mainImg.replace("http://", "https://");
      }
      let imageData = "";
      if (mainImg) {
        try {
          imageData = await getBase64ImageFromUrl(mainImg);
        } catch (err) {
          console.error("Error fetching product image for PPT:", err);
        }
      }
      if (imageData) {
        slide.addImage({
          data: imageData,
          x: 0.5,
          y: 1,
          w: 6,
          h: 4,
        });
      } else {
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.5,
          y: 1,
          w: 6,
          h: 4,
          line: { color: "CCCCCC", width: 1 },
        });
        slide.addText("No Image", {
          x: 2.5,
          y: 2.5,
          w: 2,
          h: 0.5,
          fontSize: 18,
          color: "808080",
          align: "center",
        });
      }

      // Product Details
      slide.addText(prod.name || sub.productName || "", {
        placeholder: "{productName}",
      });
      slide.addText(`Brand Name: ${prod.ProductBrand || sub.ProductBrand || ""}`, {
        placeholder: "{productBrand}",
      });
      const descriptionText = sanitizeText((prod.ProductDescription || sub.ProductDescription || "").replace(/\n/g, " "));
      slide.addText(`Description: ${descriptionText}`, {
        placeholder: "{productDescription}",
      });
      slide.addText(`Qty: ${sub.quantity || ""}`, {
        placeholder: "{quantity}",
      });
      if (sub.productCost !== undefined) {
        const baseCost = sub.productCost;
        const margin = catalog.margin || 0;
        const effPrice = baseCost * (1 + margin / 100);
        slide.addText(`Rate in INR (per pc): ${effPrice.toFixed(2)}/-`, {
          placeholder: "{rate}",
        });
      }
      slide.addText(`GST: ${sub.productGST !== undefined ? sub.productGST : ""}%`, {
        placeholder: "{gst}",
      });
    }

    // End Slide
    const endSlide = pptx.addSlide({ masterName: "END_SLIDE" });
    endSlide.addText("Thank You", {
      placeholder: "Thank You",
    });

    // Save the presentation
    await pptx.writeFile({ fileName: `Catalog-${catalog.catalogName}.pptx` });
  } catch (error) {
    console.error("PPT export error:", error);
    throw new Error("PPT export failed");
  }
}