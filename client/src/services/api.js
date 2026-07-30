// client/src/services/api.js
//
// Shared API client. Every feature (auth, items, trades, chat) imports
// this instead of creating its own axios instance. This is where the
// base URL, auth token, and error handling live in one place.

import axios from 'axios';
import { getToken } from '../utils/storage';

// Automatically normalize URL to ensure it always ends with /api
const rawUrl = import.meta.env.VITE_API_URL || ' https://installing-benz-advanced-renew.trycloudflare.com ';
const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
const baseURL = cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;

const api = axios.create({
  baseURL,
  timeout: 10000, // 10s — fails loudly instead of hanging forever on a dead backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// ------------------------------------------------------------
// REQUEST INTERCEPTOR — attaches the JWT to every outgoing request
// ------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ------------------------------------------------------------
// RESPONSE INTERCEPTOR — centralized error handling
// ------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with an error status (4xx/5xx)
      const { status, data } = error.response;

      if (status === 401) {
        // Token expired or invalid — clear it so the app doesn't
        // keep sending a dead token on every request
        localStorage.removeItem('token');
      }

      console.error(`API Error [${status}]:`, data?.error || data?.message || data);
    } else if (error.request) {
      // Request went out, no response came back (backend down, network issue)
      console.error('No response from server — is the backend running?');
    } else {
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;