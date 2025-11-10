// src/helpers/uploadImage.js
import axios from "axios";

// Cloudinary unsigned upload endpoint (change if your cloud name/preset differ)
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dqi1kwv6x/image/upload";
const UPLOAD_PRESET = "acecatalog";

/**
 * Upload a single image file to Cloudinary.
 * @param {File|Blob} file
 * @param {(percent:number)=>void} onProgress - optional progress callback 0..100
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
export default async function uploadImage(file, onProgress) {
  if (!file) throw new Error("No file provided");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await axios.post(CLOUDINARY_URL, formData, {
    headers: { "X-Requested-With": "XMLHttpRequest" },
    onUploadProgress: (evt) => {
      if (!onProgress || !evt.total) return;
      const pct = Math.round((evt.loaded * 100) / evt.total);
      onProgress(pct);
    },
    timeout: 60000,
    validateStatus: (s) => s >= 200 && s < 500, // let us read Cloudinary error JSON
  });

  if (res.status >= 400 || res.data?.error) {
    const msg = res.data?.error?.message || `Upload failed (${res.status})`;
    throw new Error(msg);
  }

  const { secure_url, public_id } = res.data || {};
  if (!secure_url) throw new Error("No secure_url returned by Cloudinary");
  return { secure_url, public_id };
}
