import AsyncStorage from "@react-native-async-storage/async-storage";
import { upsertItem, getSessionID } from "../db/database";
import { getDB } from "../db/dbManager";

export const fetchItemsFromAPIAndDB = async () => {
  try {
    // 1️⃣ Base URL
    const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");
    if (!baseUrl) throw new Error("Base URL not found. Please scan QR again.");

    // 2️⃣ Get session from DB (NOT AsyncStorage)
    const session = await getSessionID();
    if (!session?.session_id) {
      throw new Error("Session expired. Please scan QR again.");
    }

    // 3️⃣ Company ID
    const companyIdStr = await AsyncStorage.getItem("company_id");
    const companyId = companyIdStr ? parseInt(companyIdStr, 10) : 1;

    // 4️⃣ GraphQL URL
    const GRAPHQL_URL = `${baseUrl}/api/graphql`;

    // 5️⃣ Fetch items
    const query = `
      query Items($companyId: Int) {
        items(company_id: $companyId) {
          item_id
          name
          item_type
          trade_price
          image_path
          item_balance
        }
      }
    `;

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": session.session_id, // ✅ IMPORTANT
      },
      body: JSON.stringify({ query, variables: { companyId } }),
    });

    const json = await response.json();
    const apiItems = json?.data?.items || [];
    console.log("API Items fetched:", apiItems.length);

    // 6️⃣ Upsert items
    for (const item of apiItems) {
      await upsertItem({
        id: item.item_id,
        name: item.name,
        type: item.item_type,
        price: item.trade_price,
        image: item.image_path,
        stock: item.item_balance,
      });
    }

    return apiItems;
  } catch (error) {
    console.error("❌ Error fetching items:", error.message);
    return [];
  }
};



// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { upsertItem } from "../db/database";
// import { getCurrentUserId, openUserDB } from "../db/dbManager";

// export const fetchItemsFromAPIAndDB = async () => {
//   try {
//     // 1️⃣ Load dynamic baseUrl and companyId
//     const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");
//     const companyIdStr = await AsyncStorage.getItem("company_id");
//     const companyId = companyIdStr ? parseInt(companyIdStr, 10) : 1;

//     if (!baseUrl) throw new Error("Base URL not found. Please scan QR again.");

//     // 2️⃣ Open user DB
//     const userId = await getCurrentUserId();
//     await openUserDB(userId, baseUrl);

//     // 3️⃣ GraphQL URL
//     const GRAPHQL_URL = `${baseUrl}/api/graphql`;
    
//     // const GRAPHQL_URL = `http://192.168.1.3:3000/api/graphql`;


//     // 4️⃣ Fetch items from API
//     const query = `
//       query Items($companyId: Int) {
//         items(company_id: $companyId) {
//           item_id
//           name
//           item_type
//           trade_price
//           image_path
//           item_balance
//         }
//       }
//     `;

//     const response = await fetch(GRAPHQL_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ query, variables: { companyId } }),
//     });

//     const json = await response.json();
//     const apiItems = json?.data?.items || [];
//     console.log("API Items fetched:", apiItems.length);

//     // 5️⃣ Map and upsert items into local DB
//     for (const item of apiItems) {
//       await upsertItem({
//         id: item.item_id,
//         name: item.name,
//         type: item.item_type,
//         price: item.trade_price,
//         image: item.image_path,
//         stock: item.item_balance,
//       });
//     }

//     return apiItems;
//   } catch (error) {
//     console.error("Error fetching items:", error);
//     return [];
//   }
// };
