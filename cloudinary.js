// src/cloudinary.js
import axios from "axios";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/axon-receipts/upload";
const UPLOAD_PRESET = "axonrecipts-images"; 

export const uploadImageToCloudinary = async (uri) => {
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: `photo_${Date.now()}.jpg`,
  });
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await axios.post(CLOUDINARY_URL, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data.secure_url;
};
