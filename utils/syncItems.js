// import { openUserDB, getCurrentUserId, getBaseUrl } from "../db/dbManager";
// import { fetchItemsFromAPI } from "../api/graphql";
// import { upsertItem } from "../db/database";

// export const syncItems = async () => {
//   try {
//     const baseUrl = await getBaseUrl();
//     if (!baseUrl) {
//       console.log("❌ Item sync failed: Base URL not found");
//       return 0;
//     }

//     const userId = await getCurrentUserId();
//     if (!userId) {
//       console.log("❌ Item sync failed: User not logged in");
//       return 0;
//     }

//     await openUserDB(userId, baseUrl);

//     const apiItems = await fetchItemsFromAPI();

//     if (!apiItems?.length) {
//       console.log("⚠️ No items returned from API");
//       return 0;
//     }

//     await Promise.all(apiItems.map(async (item) => {
//       try {
//         await upsertItem(item);
//       } catch (err) {
//         console.warn(`⚠️ Failed to upsert item ${item.id}:`, err);
//       }
//     }));

//     console.log(`✅ ${apiItems.length} items synced successfully`);
//     return apiItems.length;
//   } catch (err) {
//     console.log("❌ Item sync failed:", err);
//     return 0;
//   }
// };





// // import { openUserDB, getCurrentUserId, getBaseUrl } from "../db/dbManager";
// // import { fetchItemsFromAPI } from "../api/graphql";
// // import { upsertItem } from "../db/database";

// // export const syncItems = async () => {
// //   try {
// //     const baseUrl = await getBaseUrl();
// //     if (!baseUrl) {
// //       console.log("❌ Item sync failed: Base URL not found");
// //       return;
// //     }

// //     const userId = await getCurrentUserId();
// //     if (!userId) {
// //       console.log("❌ Item sync failed: User not logged in");
// //       return;
// //     }

// //     // Open user DB
// //     await openUserDB(userId, baseUrl);

// //     // Fetch items from API
// //     const apiItems = await fetchItemsFromAPI();

// //     if (!apiItems.length) {
// //       console.log("⚠️ No items returned from API");
// //       return;
// //     }

// //     // Upsert items into DB efficiently
// //     await Promise.all(apiItems.map(item => upsertItem(item)));

// //     console.log(`✅ ${apiItems.length} items synced successfully`);
// //   } catch (err) {
// //     console.log("❌ Item sync failed:", err);
// //   }
// // };




// // import { openUserDB, getCurrentUserId } from "../db/dbManager";
// // import { fetchItemsFromAPI } from "../api/graphql";
// // import { upsertItem } from "../db/database";

// // export const syncItems = async () => {
// //   try {
// //     const userId = await getCurrentUserId();
// //     if (!userId) {
// //       console.log("❌ Item sync failed: user not logged in");
// //       return;
// //     }

// //     await openUserDB(userId); // Now userId is defined
// //     const apiItems = await fetchItemsFromAPI();
// //     for (const item of apiItems) {
// //       await upsertItem(item);
// //     }
// //     console.log("✅ Items synced successfully");
// //   } catch (err) {
// //     console.log("❌ Item sync failed:", err);
// //   }
// // };
