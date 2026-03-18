import axios from "axios";

const API_BASE_URL = "http://localhost:4000";

export async function uploadAndSummarizePdf(file, onUploadProgress) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(`${API_BASE_URL}/upload-book`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (event) => {
      if (!event.total) return;
      const percent = Math.round((event.loaded * 100) / event.total);
      if (onUploadProgress) {
        onUploadProgress(percent);
      }
    },
  });

  return response.data;
}

