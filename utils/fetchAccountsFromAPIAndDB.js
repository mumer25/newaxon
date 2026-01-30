import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUserId, openUserDB,getDB  } from "../db/dbManager";
import { insertAccounts, fetchLocalAccounts } from "../db/database"; // your functions

export const fetchAccountsFromAPIAndDB = async () => {
  try {
    const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");
    const companyIdStr = await AsyncStorage.getItem("company_id");
    const companyId = companyIdStr ? parseInt(companyIdStr, 10) : 1;

    if (!baseUrl) throw new Error("Base URL not found. Please scan QR again.");

    const userId = await getCurrentUserId();
    if (!userId) {
      console.warn("❌ User ID not found, cannot open DB.");
      return [];
    }

    await openUserDB(userId, baseUrl);

    const GRAPHQL_URL = `${baseUrl}/api/graphql`;

    const query = `
      query AccountsForBank($companyId: Int!) {
        accountsForBank(company_id: $companyId) {
          account_id
          name
        }
      }
    `;

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { companyId } }),
    });

    const json = await response.json();
    const apiAccounts = json?.data?.accountsForBank || [];
    console.log("API Accounts fetched:", apiAccounts.length);

    await insertAccounts(getDB(), apiAccounts.map(acc => ({
      account_id: acc.account_id,
      name: acc.name,
    })));

    return apiAccounts;

  } catch (error) {
    console.error("Error fetching accounts:", error);
    return [];
  }
};


// Fetch from local DB
export const fetchAccountsFromDB = async (query = "") => {
  let accounts = await fetchLocalAccounts();
  if (query) {
    accounts = accounts.filter(acc => acc.name.toLowerCase().includes(query.toLowerCase()));
  }
  return accounts;
};
