/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import axios from "axios";

// Make the Pinata JWT secret available to this function
const pinataJWT = defineSecret("PINATA_JWT");

export const uploadToIpfs = onCall({secrets: [pinataJWT]}, async (request) => {
  const {data, type} = request.data;

  if (!data) {
    throw new Error("No data provided to upload.");
  }

  try {
    const pinataData = {
      pinataContent: type === "json" ? JSON.parse(data) : data,
    };

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      pinataData,
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${pinataJWT.value()}`,
        },
      }
    );

    return {cid: response.data.IpfsHash};
  } catch (error: unknown) {
    const axiosError = error as any;
    const errorMessage = axiosError.response?.data || axiosError.message;
    console.error("Error uploading to Pinata:", errorMessage);
    throw new Error("Failed to upload data to IPFS.");
  }
});
