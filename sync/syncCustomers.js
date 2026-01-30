import { db } from '../database'; // your existing SQLite DB instance
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// GraphQL API URL
const GRAPHQL_URL = "https://staging.axonerp.com/api/graphql";

// GraphQL query
const CUSTOMER_QUERY = `
query Customer($companyId: Int) {
  Customer(company_id: $companyId) {
    entity_id
    name
    created_date
    entity_category_id
    phone
    email
    address
    sequence_id
    entity_code
    is_customer
    is_vendor
    is_employee
    is_user
    is_email_verified
    is_supper_user
    company_id
    item_price_types_id
    cnic_number
    province
    registration_type
    payment_terms_id
    ntn_number
  }
}
`;

// Fetch customers from API
export const fetchCustomersFromAPI = async (companyId) => {
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add auth token if required
        // "Authorization": `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        query: CUSTOMER_QUERY,
        variables: { companyId },
      }),
    });

    const result = await response.json();
    return result?.data?.Customer || [];
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
};

// Sync fetched customers into SQLite
export const syncCustomersToDB = async (companyId) => {
  const customers = await fetchCustomersFromAPI(companyId);

  if (!customers || customers.length === 0) {
    console.log("No customers to sync.");
    return;
  }

  try {
    await db.execAsync("BEGIN TRANSACTION;");

    for (let customer of customers) {
      // Upsert customer into local DB
      await db.runAsync(
        `INSERT OR REPLACE INTO customer
        (entity_id, name, phone, last_seen, visited, latitude, longitude, location_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer.entity_id,
          customer.name,
          customer.phone || null,
          customer.created_date || new Date().toISOString(),
          "Unvisited",
          null, // latitude
          null, // longitude
          "Not Updated", // location_status
        ]
      );
    }

    await db.execAsync("COMMIT;");
    console.log(`Synced ${customers.length} customers successfully.`);
  } catch (error) {
    await db.execAsync("ROLLBACK;");
    console.error("Failed to sync customers:", error);
  }
};
