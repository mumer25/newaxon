import { upsertCustomer } from "../db/database";
import { getCurrentUserId, openUserDB } from "../db/dbManager";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Sync customers from server using dynamic baseUrl and companyId
 */
export const syncCustomers = async () => {
  try {
    // Get dynamic configuration saved from QR scan
    const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");
    const companyIdStr = await AsyncStorage.getItem("company_id"); // store companyId from QR
    const companyId = companyIdStr ? parseInt(companyIdStr, 10) : 1;

    if (!baseUrl) throw new Error("Base URL is required. Please scan QR again.");

    // Open the DB for current user using dynamic baseUrl
    const userId = await getCurrentUserId();
    await openUserDB(userId, baseUrl);
    console.log(`DB opened for user: ${userId} with baseUrl: ${baseUrl}`);

    // Construct dynamic GraphQL URL
    const GRAPHQL_URL = `${baseUrl}/api/graphql`;

    // const GRAPHQL_URL = `http://192.168.1.3:3000/api/graphql`;


    const query = `
      query Customer($companyId: Int) {
        Customer(company_id: $companyId) {
          entity_id
          name
          phone
          email
        }
      }
    `;

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { companyId } }),
    });

    const json = await response.json();

    if (json?.data?.Customer) {
      for (const c of json.data.Customer) {
        await upsertCustomer({
          entity_id: c.entity_id,
          name: c.name,
          phone: c.phone,
          last_seen: null,
          visited: "Unvisited",
          latitude: null,
          longitude: null,
          location_status: "Not Updated",
        });
      }
    }

    console.log("✅ Customers synced at app startup");
  } catch (err) {
    console.log("Customer Startup Sync Error:", err);
  }
};




// import {
//   upsertCustomer
// } from "../db/database";
// import { getCurrentUserId, openUserDB } from "../db/dbManager";

// const GRAPHQL_URL = "https://staging.axonerp.com/api/graphql";
// const COMPANY_ID = 1;

// export const syncCustomers = async () => {
//   try {
//     const userId = await getCurrentUserId();
//     await openUserDB(userId);

//     const query = `
//       query Customer($companyId: Int) {
//         Customer(company_id: $companyId) {
//           entity_id
//           name
//           phone
//           email
//         }
//       }
//     `;

//     const response = await fetch(GRAPHQL_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         query,
//         variables: { companyId: COMPANY_ID }
//       }),
//     });

//     const json = await response.json();

//     if (json?.data?.Customer) {
//       for (const c of json.data.Customer) {
//         await upsertCustomer({
//           entity_id: c.entity_id,
//           name: c.name,
//           phone: c.phone,
//           last_seen: null,
//           visited: "Unvisited",
//           latitude: null,
//           longitude: null,
//           location_status: "Not Updated",
//         });
//       }
//     }

//     console.log("✅ Customers synced at app startup");
//   } catch (err) {
//     console.log("Customer Startup Sync Error:", err);
//   }
// };
