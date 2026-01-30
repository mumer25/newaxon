import { getDB } from "../db/dbManager";
import { fetchAccountsFromAPI } from "../api/graphql";
import { insertAccounts, addCustomerReceipt } from "../db/database";

export const syncAccountsAndReceipts = async (receipts = []) => {
  const db = await getDB();

  // 1️⃣ Fetch accounts from API
  const accounts = await fetchAccountsFromAPI();

  if (accounts.length > 0) {
    // 2️⃣ Insert accounts locally
    await insertAccounts(db, accounts);
  }

  // 3️⃣ Insert receipts (mapping bank names to account IDs)
  for (const receipt of receipts) {
    const insertedId = await addCustomerReceipt(receipt);
    if (!insertedId) {
      console.warn("Receipt could not be inserted, bank account not found:", receipt.cash_bank_id);
    }
  }

  console.log("✅ Accounts and receipts synced successfully!");
};
