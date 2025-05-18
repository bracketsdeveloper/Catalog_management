import PptxGenJS from "pptxgenjs";

// Mapping for field names to display labels
const pptFieldMapping = {
  name: "Name",
  ProductBrand: "Brand Name",
  ProductDescription: "Description",
  quantity: "Qty",
  productCost: "Rate in INR (per pc)",
  productGST: "GST",
};

// Utility to wrap text for PPT slides
function wrapText(text, maxWidth, fontSize) {
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";
  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    // Approximate width: 1 char ≈ fontSize/2 pixels
    if (testLine.length * (fontSize / 2) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function exportToPPT(catalog, getBase64ImageFromUrl) {
  try {
    const pptx = new PptxGenJS();
    pptx.title = `Catalog - ${catalog.catalogName}`;

    // Fetch template images as base64
    let coverBgData = "";
    let template2BgData = "";
    let productBgData = "";
    let closingBgData = "";
    
    try {
      coverBgData = await getBase64ImageFromUrl("/ppttemplates/templateSlide1.jpg");
    } catch (err) {
      console.error("Error fetching cover slide background:", err);
    }
    
    try {
      template2BgData = await getBase64ImageFromUrl("/ppttemplates/templateSlide2.jpg");
    } catch (err) {
      console.error("Error fetching templateSlide2 background:", err);
    }
    
    try {
      productBgData = await getBase64ImageFromUrl("/ppttemplates/templateSlide3.jpg");
    } catch (err) {
      console.error("Error fetching product slide background:", err);
    }
    
    try {
      closingBgData = await getBase64ImageFromUrl("/ppttemplates/templateSlideLast.jpg");
    } catch (err) {
      console.error("Error fetching closing slide background:", err);
    }

    // Slide 1: Cover Slide (templateSlide1.jpg, no text)
    const coverSlide = pptx.addSlide();
    coverSlide.background = coverBgData
      ? { data: coverBgData }
      : { color: "F5F5F5" }; // Fallback to light gray

    // Slide 2: TemplateSlide2 (templateSlide2.jpg, no content)
    const template2Slide = pptx.addSlide();
    template2Slide.background = template2BgData
      ? { data: template2BgData }
      : { color: "F5F5F5" }; // Fallback to light gray

    // Product Slides (templateSlide3.jpg)
    for (let i = 0; i < (catalog.products?.length || 0); i++) {
      const sub = catalog.products[i];
      const prod = sub.productId && typeof sub.productId === "object" ? sub.productId : {};
      const slide = pptx.addSlide();
      slide.background = productBgData
        ? { data: productBgData }
        : { color: "FFFFFF" }; // Fallback to white

      // Image handling
      const imageWidth = 4; // 4 inches
      const imageHeight = 3; // 3 inches
      const imageX = 0.8; // Left margin
      const imageY = 1.3; // Top margin
      let mainImg = (prod.images && prod.images[0]) || (sub.images && sub.images[0]) || "";
      if (mainImg.startsWith("http://")) {
        mainImg = mainImg.replace("http://", "https://");
      }
      let imageData = "";
      if (mainImg) {
        try {
          imageData = await getBase64ImageFromUrl(mainImg);
        } catch (err) {
          console.error("Error fetching product image:", err);
        }
      }
      if (imageData) {
        try {
          slide.addImage({
            data: imageData,
            x: imageX,
            y: imageY,
            w: imageWidth,
            h: imageHeight,
            sizing: { type: "contain" },
          });
        } catch (err) {
          console.error("Error adding image to slide:", err);
        }
      } else {
        slide.addShape(pptx.shapes.RECTANGLE, {
          x: imageX,
          y: imageY,
          w: imageWidth,
          h: imageHeight,
          line: { color: "CCCCCC", width: 1 },
          fill: { color: "EFEFEF" },
        });
        slide.addText("No Image", {
          x: imageX + 0.5,
          y: imageY + 1.8,
          w: imageWidth - 1,
          h: 0.4,
          align: "center",
          fontSize: 12, // Reduced from 14
          color: "808080",
          fontFace: "Arial",
        });
      }

      // Text fields (right side)
      let textX = 5.5; // Start after image
      let textY = 0.7; // Align with image top
      const lineHeight = 0.4; // Reduced from 0.5 inches
      const textWidth = 4.5; // Remaining slide width

      // Name
      slide.addText(prod.name || sub.productName || "", {
        x: textX,
        y: textY,
        w: textWidth,
        h: 0.6,
        fontSize: 18, // Reduced from 22
        bold: true,
        color: "333333",
        fontFace: "Arial",
        wrap: true,
      });
      textY += lineHeight * 1.5; // Now 0.6 inches (was 0.75)

      // Brand Name
      if (prod.ProductBrand || sub.ProductBrand) {
        slide.addText(
          [
            { text: "Brand: ", bold: true, fontSize: 11 }, // Matches description label
            { text: prod.ProductBrand || sub.ProductBrand || "", fontSize: 10 }, // Matches description value
          ],
          {
            x: textX,
            y: textY,
            w: textWidth,
            fontSize: 11,
            h: 0.4,
            color: "333333",
            fontFace: "Arial",
            wrap: true,
          }
        );
        textY += lineHeight - 0.1;
      }

      // Description
      if (prod.ProductDescription || sub.ProductDescription) {
        const descriptionText = (prod.ProductDescription || sub.ProductDescription || "").replace(/\n/g, " ");
        const wrapped = wrapText(descriptionText, 300, 10); // Updated fontSize for wrapping
        slide.addText("Description:", {
          x: textX,
          y: textY,
          w: textWidth,
          h: 0.4,
          fontSize: 11, // Reduced from 13
          bold: true,
          color: "333333",
          fontFace: "Arial",
        });
        textY += lineHeight - 0.1; // Now 0.3 inches (was 0.4)
        wrapped.forEach((line) => {
          slide.addText(line, {
            x: textX,
            y: textY,
            w: textWidth+3,
            h: 0.4,
            fontSize: 8.5,
            color: "333333",
            fontFace: "Arial",
            wrap: true,
          });
          textY += lineHeight - 0.2; // Decreased by 0.2 inches
        });
        textY += lineHeight * 0.5; // Now 0.2 inches (was 0.5)
      }

      // Quantity
      if (sub.quantity) {
        slide.addText(
          [
            { text: "Qty: ", bold: true, fontSize: 11 }, // Matches description label
            { text: String(sub.quantity), fontSize: 10 }, // Matches description value
          ],
          {
            x: textX,
            y: textY,
            w: textWidth,
            fontSize: 11,
            h: 0.4,
            color: "333333",
            fontFace: "Arial",
            wrap: true,
          }
        );
        textY += lineHeight - 0.1;
      }

      // Price
      if (sub.productCost !== undefined) {
        const baseCost = sub.productCost;
        const margin = catalog.margin || 0;
        const effPrice = baseCost * (1 + margin / 100);
        slide.addText(
          [
            { text: "Rate (INR/pc): ", bold: true, fontSize: 11 }, // Matches description label
            { text: `${effPrice.toFixed(2)}/-`, fontSize: 10 }, // Matches description value
          ],
          {
            x: textX,
            y: textY,
            w: textWidth,
            fontSize: 11,
            h: 0.4,
            color: "333333",
            fontFace: "Arial",
            wrap: true,
          }
        );
        textY += lineHeight - 0.1;
      }

      // GST
      if (sub.productGST !== undefined) {
        slide.addText(
          [
            { text: "GST: ", bold: true, fontSize: 11 }, // Matches description label
            { text: `${sub.productGST}%`, fontSize: 10 }, // Matches description value
          ],
          {
            x: textX,
            y: textY,
            w: textWidth,
            h: 0.4,
            fontSize: 11,
            color: "333333",
            fontFace: "Arial",
            wrap: true,
          }
        );
        textY += lineHeight - 0.1;
      }
    }

    // Closing Slide (templateSlideLast.jpg)
    const closingSlide = pptx.addSlide();
    closingSlide.background = closingBgData
      ? { data: closingBgData }
      : { color: "F5F5F5" }; // Fallback to light gray

    await pptx.writeFile({ fileName: `Catalog-${catalog.catalogName}.pptx` });
  } catch (error) {
    console.error("PPT export error:", error);
    throw new Error("PPT export failed");
  }
}