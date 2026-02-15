import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  }
});

export default axiosClient 