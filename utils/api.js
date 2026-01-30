// src/utils/api.js
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Get dynamic baseUrl from AsyncStorage
 */
export const getBaseUrl = async () => {
  const baseUrl = await AsyncStorage.getItem("base_url");
  if (!baseUrl) throw new Error("Base URL not found. Scan QR first.");
  return baseUrl;
};

/**
 * General API fetch method using dynamic baseUrl
 */
export const apiFetch = async (endpoint, options = {}) => {
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}/${endpoint}`;

  const defaultOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  };

  // Stringify body if object
  if (defaultOptions.body && typeof defaultOptions.body !== "string") {
    defaultOptions.body = JSON.stringify(defaultOptions.body);
  }

  const response = await fetch(url, defaultOptions);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "API Error");
  return data;
};
