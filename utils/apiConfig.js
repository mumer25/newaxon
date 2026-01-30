import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Returns dynamic base URL saved from QR
 */
export const getBaseUrl = async () => {
  const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");

  if (!baseUrl) {
    throw new Error("Base URL not found. Please scan QR again.");
  }

  return baseUrl;
};

/**
 * Returns GraphQL URL dynamically
 */
export const getGraphQLUrl = async () => {
  const baseUrl = await getBaseUrl();
  return `${baseUrl}/api/graphql`;
};
