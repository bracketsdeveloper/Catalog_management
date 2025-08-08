import React from 'react';

const url = `https://api.cloudinary.com/v1_1/dxwax6pir/image/upload`;

const uploadImage = async (image) => {
  try {
    const formData = new FormData();
    formData.append("file", image);
    formData.append("upload_preset", "acecatalog");
    
    const dataResponse = await fetch(url, {
      method: "post",
      body: formData,
    });

    const result = await dataResponse.json();
    // Log the result URL for debugging
    // console.log("Uploaded Image URL:", result.secure_url);
    return result;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

export default uploadImage;
