/**
 * Convert an image URL to a Base64 data URL
 * Requires proper CORS headers if the image is on a different domain.
 */
export async function getBase64ImageFromUrl(url) {
    try {
      const response = await fetch(url, { mode: "cors" });
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result?.toString() || "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error converting image to base64:", error);
      return "";
    }
  }
  
  /**
   * A text-wrapping helper for pdf-lib
   * @param {string} text
   * @param {number} maxWidth
   * @param {Font} font
   * @param {number} fontSize
   * @returns string[] lines
   */
  export function wrapText(text, maxWidth, font, fontSize) {
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";
    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
  }
  