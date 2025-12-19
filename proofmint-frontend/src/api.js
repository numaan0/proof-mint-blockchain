import axios from "axios";

const API = axios.create({
  baseURL: "https://proofmintapi.onrender.com",
});

export const generateCode = () => API.get("/generate-code");

export const uploadProof = (file, code) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("code", code);
  return API.post("/upload-proof", fd);
};

export const verifyProof = (id, file) => {
  const fd = new FormData();
  fd.append("file", file);
  return API.post(`/verify/${id}`, fd);
};

export default API;
