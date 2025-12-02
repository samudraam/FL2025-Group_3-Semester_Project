/**
 * @file utils/cloudinaryUpload.js
 * @description Helper to stream in-memory buffers into Cloudinary.
 */
const streamifier = require("streamifier");
const cloudinary = require("./cloudinary");

/**
 * Stream a Buffer to Cloudinary and resolve with the uploaded asset metadata.
 * @param {object} params
 * @param {Buffer} params.buffer - Raw file buffer.
 * @param {string} params.folder - Cloudinary folder path.
 * @param {string} [params.publicId] - Desired asset identifier.
 * @param {object} [params.options] - Additional Cloudinary upload options.
 * @returns {Promise<import("cloudinary").UploadApiResponse>}
 */
const uploadBufferToCloudinary = ({
  buffer,
  folder,
  publicId,
  options = {},
} = {}) =>
  new Promise((resolve, reject) => {
    if (!buffer) {
      reject(new Error("Missing upload buffer."));
      return;
    }

    const uploadOptions = {
      folder,
      resource_type: "image",
      overwrite: true,
      ...options,
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

module.exports = uploadBufferToCloudinary;

