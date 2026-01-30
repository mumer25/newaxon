import AsyncStorage from "@react-native-async-storage/async-storage";
import { upsertCustomer, getSessionID } from "../db/database";

/**
 * Fetch all customers from API for current company & store in local DB
 */
export const fetchCustomersFromAPIAndDB = async () => {
  try {
    // 1️⃣ Get baseUrl and companyId from AsyncStorage
    const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");
    const companyIdStr = await AsyncStorage.getItem("company_id");
    const companyId = companyIdStr ? parseInt(companyIdStr, 10) : 1;

    if (!baseUrl) throw new Error("Base URL not found. Please scan QR again.");

    // 2️⃣ Get session_id from DB
    const session = await getSessionID();
    if (!session?.session_id) {
      throw new Error("Session expired. Please scan QR again.");
    }

    // 3️⃣ GraphQL URL
    const GRAPHQL_URL = `${baseUrl}/api/graphql`;

    // 4️⃣ GraphQL query
    const query = `
      query Customer($companyId: Int) {
        Customer(company_id: $companyId) {
          entity_id
          name
          phone
          email
          customer_rep_id
        }
      }
    `;

    // 5️⃣ Fetch from API with session
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": session.session_id, // ✅ MUST send session
      },
      body: JSON.stringify({ query, variables: { companyId } }),
    });

    const json = await response.json();
    const apiCustomers = json?.data?.Customer || [];
    console.log("API Customers fetched:", apiCustomers.length);

    // 6️⃣ Upsert into local DB
    for (const c of apiCustomers) {
      await upsertCustomer({
        entity_id: c.entity_id,
        customer_rep_id: c.customer_rep_id,
        name: c.name,
        phone: c.phone,
        last_seen: null,
        visited: "Unvisited",
        latitude: null,
        longitude: null,
        location_status: "Not Updated",
      });
    }

    return apiCustomers;
  } catch (error) {
    console.error("❌ Error fetching customers:", error.message);
    return [];
  }
};





// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { upsertCustomer } from "../db/database";
// import { getCurrentUserId, openUserDB } from "../db/dbManager";

// /**
//  * Fetch all customers from API for current company & store in local DB
//  */
// export const fetchCustomersFromAPIAndDB = async () => {
//   try {
//     const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");
//     const companyIdStr = await AsyncStorage.getItem("company_id");
//     const companyId = companyIdStr ? parseInt(companyIdStr, 10) : 1;
//     const userId = await getCurrentUserId();

//     if (!baseUrl) throw new Error("Base URL not found. Please scan QR again.");

//     await openUserDB(userId, baseUrl);

//     const GRAPHQL_URL = `${baseUrl}/api/graphql`;

//     // const GRAPHQL_URL = `http://192.168.1.3:3000/api/graphql`;


//     const query = `
//       query Customer($companyId: Int) {
//         Customer(company_id: $companyId) {
//           entity_id
//           name
//           phone
//           email
//           customer_rep_id
//         }
//       }
//     `;

//     const response = await fetch(GRAPHQL_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ query, variables: { companyId } }),
//     });

//     const json = await response.json();
//     const apiCustomers = json?.data?.Customer || [];

//     for (const c of apiCustomers) {
//       await upsertCustomer({
//         entity_id: c.entity_id,
//         customer_rep_id: c.customer_rep_id,
//         name: c.name,
//         phone: c.phone,
//         last_seen: null,
//         visited: "Unvisited",
//         latitude: null,
//         longitude: null,
//         location_status: "Not Updated",
//       });
//     }

//     return apiCustomers; // optional, if you want to use it immediately
//   } catch (error) {
//     console.error("Error fetching customers:", error);
//     return [];
//   }
// };
