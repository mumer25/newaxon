import {
  getUnsyncedCustomers,
  getUnsyncedBookings,
  getUnsyncedBookingLines,
  getUnsyncedReceipts,
  markCustomerSynced,
  markOrderSynced,
  markCustomerReceiptSynced,
  getSessionID,
  getAppConfigEntityID,
  logoutDB,
  setLoginStatus,
} from "../db/database";

import { getDB, closeUserDB } from "../db/dbManager";
import { getBaseUrl } from "../utils//apiConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const handleSync = async (onOrderSynced,navigation) => {
  const db = getDB();



  const logout = async () => {
  // Clear session ID from DB (but keep the database and tables intact)
  await logoutDB();

  // Clear AsyncStorage session data only (keep database for next login)
  await AsyncStorage.multiRemove([
    "logged_in",
    "qr_scanned",
    "session_id",
    "user_name",
  ]);

  // Update login status in your app
  await setLoginStatus(false);

  // Close user DB (but don't delete the database file)
  // The database file and tables remain intact for next login
  await closeUserDB();

  // Navigate to QR Scan screen
  navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
  
  console.log("✅ User logged out (database preserved for next login)");
};


  try {

     // 🔐 Get session info
    const session = await getSessionID();
     if (!session?.session_id) {
      // Session missing → logout
      console.log("❌ Session expired, logging out...");
      await logout(navigation);
      return {
        success: false,
        message: "Session expired. Please login again.",
        syncedCount: 0,
      };
    }
    // if (!session?.session_id) {
    //   return {
    //     success: false,
    //     message: "Session expired. Please login again.",
    //     syncedCount: 0,
    //   };
    // }

     // ✅ Use unique function name to avoid confusion
    const appConfigEntityID = await getAppConfigEntityID();
    console.log("🏢 App Config Entity ID:", appConfigEntityID);

    // --- Fetch only UNSYNCED rows ---
    const customers = await getUnsyncedCustomers();
    const bookings = await getUnsyncedBookings();
    const lines = await getUnsyncedBookingLines();
    const receipts = await getUnsyncedReceipts();

    const totalToSync =
      customers.length +
      bookings.length +
      lines.length +
      receipts.length;

    if (totalToSync === 0) {
      console.log("✅ Nothing new to sync");
      return { success: true, message: "Nothing new to sync", syncedCount: 0 };
    }

    // --- Build payload ---
    const payload = {
      session_id: session.session_id,
      app_entity_id: appConfigEntityID,
      customers: customers.map(c => ({
        entity_id: c.entity_id,
        name: c.name,
        phone: c.phone,
        last_seen: c.last_seen,
        visited: c.visited,
        latitude: c.latitude,
        longitude: c.longitude,
        location_status: c.location_status,
        updated_at: c.updated_at,
      })),
      order_booking: bookings,
      order_booking_line: lines,
      receipts,
    };

    console.log("🔄 SYNC PAYLOAD:", payload);

    const baseUrl = await getBaseUrl();
    const syncUrl = `${baseUrl}/api/order-booking/sync`;
    
    // const syncUrl = "http://192.168.1.3:3000/api/order-booking/sync";

    console.log("🌍 Sync URL:", syncUrl);

    // --- Send to API ---
    const response = await fetch(syncUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json",
        "Session-Id": session.session_id,

      "app_entity_id": appConfigEntityID,

       },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("📡 Server Response:", result);

    // --- Only mark rows as synced if server confirms success ---
    if (result.success) {
      await Promise.all([
        ...customers.map(c => markCustomerSynced(c.entity_id)),
        ...bookings.map(b => markOrderSynced(b.booking_id)),
        ...receipts.map(r => markCustomerReceiptSynced(r.id)),
      ]);

      // --- Apply server → local updates ---
      const serverCustomers = result.server_customers || [];
      for (let cust of serverCustomers) {
        await db.runAsync(
          `
          INSERT OR IGNORE INTO customer
            (entity_id, name, phone, last_seen, visited, latitude, longitude, location_status, synced, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          `,
          [
            cust.entity_id,
            cust.name,
            cust.phone || "",
            cust.last_seen || null,
            cust.visited || "Unvisited",
            cust.latitude || null,
            cust.longitude || null,
            cust.location_status || "Not Updated",
            cust.updated_at || new Date().toISOString(),
          ]
        );

        await db.runAsync(
          `
          UPDATE customer
          SET name = ?, phone = ?
          WHERE entity_id = ?
          `,
          [cust.name, cust.phone || "", cust.entity_id]
        );
      }

      console.log("✅ Data synced successfully!");
      if (onOrderSynced) {
        onOrderSynced(bookings.map(b => b.booking_id));
      }

      return {
        success: true,
        message: "Data synced successfully",
        syncedCount: totalToSync,
      };
    } else {
      console.log("❌ Server sync failed:", result.error || "Unknown error");
      
      // Check if it's a session mismatch error
      if (result.error && result.error.includes("Session mismatch")) {
        console.log("⚠️ Session mismatch detected - Logging out user...");
        
        try {
          // Clear session ID from DB (but keep the database and tables intact)
          await logoutDB();

          // Clear AsyncStorage session data only (keep database for next login)
          await AsyncStorage.multiRemove([
            "logged_in",
            "qr_scanned",
            "session_id",
            "user_name",
          ]);

          // Update login status in your app
          await setLoginStatus(false);

          // Close user DB (but don't delete the database file)
          // The database file and tables remain intact for next login
          await closeUserDB();

          // Navigate to QR Scan screen
          if (navigation) {
            navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
          }

          console.log("✅ User logged out due to session mismatch (database preserved for next login)");
        } catch (logoutError) {
          console.error("❌ Error during logout:", logoutError);
        }
      }
      
      return {
        success: false,
        message: result.error || "Server rejected sync",
        syncedCount: 0,
      };
    }
  } catch (err) {
    console.log("❌ Sync error:", err);
    return {
      success: false,
      message: err.message || "Sync failed",
      syncedCount: 0,
    };
  }
};






// Sessio_ID Sending
// import {
//   getUnsyncedCustomers,
//   getUnsyncedBookings,
//   getUnsyncedBookingLines,
//   getUnsyncedReceipts,
//   markCustomerSynced,
//   markOrderSynced,
//   markCustomerReceiptSynced,
// } from "../db/database";

// import { getDB } from "../db/dbManager";
// import { getBaseUrl } from "../utils//apiConfig";

// export const handleSync = async (onOrderSynced) => {
//   const db = getDB();

//   try {
//     // --- Fetch only UNSYNCED rows ---
//     const customers = await getUnsyncedCustomers();
//     const bookings = await getUnsyncedBookings();
//     const lines = await getUnsyncedBookingLines();
//     const receipts = await getUnsyncedReceipts();

//     const totalToSync =
//       customers.length +
//       bookings.length +
//       lines.length +
//       receipts.length;

//     if (totalToSync === 0) {
//       console.log("✅ Nothing new to sync");
//       return { success: true, message: "Nothing new to sync", syncedCount: 0 };
//     }

//     // --- Build payload ---
//     const payload = {
//       customers: customers.map(c => ({
//         entity_id: c.entity_id,
//         name: c.name,
//         phone: c.phone,
//         last_seen: c.last_seen,
//         visited: c.visited,
//         latitude: c.latitude,
//         longitude: c.longitude,
//         location_status: c.location_status,
//         updated_at: c.updated_at,
//       })),
//       order_booking: bookings,
//       order_booking_line: lines,
//       receipts,
//     };

//     console.log("🔄 SYNC PAYLOAD:", payload);

//     const baseUrl = await getBaseUrl();
//     const syncUrl = `${baseUrl}/api/order-booking/sync`;
//     // const syncUrl = "http://192.168.1.3:3000/api/order-booking/sync";

//     console.log("🌍 Sync URL:", syncUrl);

//     // --- Send to API ---
//     const response = await fetch(syncUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });

//     const result = await response.json();
//     console.log("📡 Server Response:", result);

//     // --- Only mark rows as synced if server confirms success ---
//     if (result.success) {
//       await Promise.all([
//         ...customers.map(c => markCustomerSynced(c.entity_id)),
//         ...bookings.map(b => markOrderSynced(b.booking_id)),
//         ...receipts.map(r => markCustomerReceiptSynced(r.id)),
//       ]);

//       // --- Apply server → local updates ---
//       const serverCustomers = result.server_customers || [];
//       for (let cust of serverCustomers) {
//         await db.runAsync(
//           `
//           INSERT OR IGNORE INTO customer
//             (entity_id, name, phone, last_seen, visited, latitude, longitude, location_status, synced, updated_at)
//           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
//           `,
//           [
//             cust.entity_id,
//             cust.name,
//             cust.phone || "",
//             cust.last_seen || null,
//             cust.visited || "Unvisited",
//             cust.latitude || null,
//             cust.longitude || null,
//             cust.location_status || "Not Updated",
//             cust.updated_at || new Date().toISOString(),
//           ]
//         );

//         await db.runAsync(
//           `
//           UPDATE customer
//           SET name = ?, phone = ?
//           WHERE entity_id = ?
//           `,
//           [cust.name, cust.phone || "", cust.entity_id]
//         );
//       }

//       console.log("✅ Data synced successfully!");
//       if (onOrderSynced) {
//         onOrderSynced(bookings.map(b => b.booking_id));
//       }

//       return {
//         success: true,
//         message: "Data synced successfully",
//         syncedCount: totalToSync,
//       };
//     } else {
//       console.log("❌ Server sync failed:", result.error || "Unknown error");
//       return {
//         success: false,
//         message: result.error || "Server rejected sync",
//         syncedCount: 0,
//       };
//     }
//   } catch (err) {
//     console.log("❌ Sync error:", err);
//     return {
//       success: false,
//       message: err.message || "Sync failed",
//       syncedCount: 0,
//     };
//   }
// };








// import {
//   getUnsyncedCustomers,
//   getUnsyncedBookings,
//   getUnsyncedBookingLines,
//   getUnsyncedReceipts,
//   markCustomerSynced,
//   markOrderSynced,
//   markCustomerReceiptSynced,
// } from "../db/database";

// import { getDB } from "../db/dbManager";
// import { getBaseUrl } from "../utils//apiConfig";

// export const handleSync = async (onOrderSynced) => {
//   const db = getDB();

//   try {
//     // --- Fetch only UNSYNCED rows ---
//     const customers = await getUnsyncedCustomers();
//     const bookings = await getUnsyncedBookings();
//     const lines = await getUnsyncedBookingLines();
//     const receipts = await getUnsyncedReceipts();

//     const totalToSync =
//       customers.length +
//       bookings.length +
//       lines.length +
//       receipts.length;

//     if (totalToSync === 0) {
//       console.log("✅ Nothing new to sync");
//       return { success: true, message: "Nothing new to sync", syncedCount: 0 };
//     }

//     // --- Build payload ---
//     const payload = {
//       customers: customers.map(c => ({
//         entity_id: c.entity_id,
//         name: c.name,
//         phone: c.phone,
//         last_seen: c.last_seen,
//         visited: c.visited,
//         latitude: c.latitude,
//         longitude: c.longitude,
//         location_status: c.location_status,
//         updated_at: c.updated_at,
//       })),
//       order_booking: bookings,
//       order_booking_line: lines,
//       receipts,
//     };

//     console.log("🔄 SYNC PAYLOAD:", payload);

//     // --- 🔥 Dynamic Sync URL ---
//     const baseUrl = await getBaseUrl();
//     // const syncUrl = `${baseUrl}/api/order-booking/sync`;
//     const syncUrl = "http://192.168.1.3:3000/api/order-booking/sync";


//     console.log("🌍 Sync URL:", syncUrl);

//     // --- Send to API ---
//     const response = await fetch(syncUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });

//     const result = await response.json();

//     if (!result.success) {
//       console.log("❌ Sync failed:", result.error);
//       return { success: false, message: result.error, syncedCount: 0 };
//     }

//     // --- 1️⃣ Mark uploaded rows as synced ---
//     await Promise.all([
//       ...customers.map(c => markCustomerSynced(c.entity_id)),
//       ...bookings.map(b => markOrderSynced(b.booking_id)),
//       ...receipts.map(r => markCustomerReceiptSynced(r.id)),
//     ]);

//     // --- 2️⃣ Apply server → local updates ---
//     const serverCustomers = result.server_customers || [];

//     for (let cust of serverCustomers) {
//       await db.runAsync(
//         `
//         INSERT OR IGNORE INTO customer
//           (entity_id, name, phone, last_seen, visited, latitude, longitude, location_status, synced, updated_at)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
//         `,
//         [
//           cust.entity_id,
//           cust.name,
//           cust.phone || "",
//           cust.last_seen || null,
//           cust.visited || "Unvisited",
//           cust.latitude || null,
//           cust.longitude || null,
//           cust.location_status || "Not Updated",
//           cust.updated_at || new Date().toISOString(),
//         ]
//       );

//       await db.runAsync(
//         `
//         UPDATE customer
//         SET name = ?, phone = ?
//         WHERE entity_id = ?
//         `,
//         [cust.name, cust.phone || "", cust.entity_id]
//       );
//     }

//     console.log("✅ Data synced successfully!");

//     if (onOrderSynced) {
//       onOrderSynced(bookings.map(b => b.booking_id));
//     }

//     return {
//       success: true,
//       message: "Data synced successfully",
//       syncedCount: totalToSync,
//     };
//   } catch (err) {
//     console.log("❌ Sync error:", err);
//     return {
//       success: false,
//       message: err.message || "Sync failed",
//       syncedCount: 0,
//     };
//   }
// };






// import {
//   getUnsyncedCustomers,
//   getUnsyncedBookings,
//   getUnsyncedBookingLines,
//   getUnsyncedReceipts,
//   markCustomerSynced,
//   markOrderSynced,
//   markCustomerReceiptSynced,
// } from "../db/database";

// import { getDB } from "../db/dbManager";
// import { getBaseUrl } from "../utils//apiConfig";

// export const handleSync = async (onOrderSynced) => {
//   const db = getDB();

//   try {
//     // --- Fetch only UNSYNCED rows ---
//     const customers = await getUnsyncedCustomers();
//     const bookings = await getUnsyncedBookings();
//     const lines = await getUnsyncedBookingLines();
//     const receipts = await getUnsyncedReceipts();

//     const totalToSync =
//       customers.length +
//       bookings.length +
//       lines.length +
//       receipts.length;

//     if (totalToSync === 0) {
//       console.log("✅ Nothing new to sync");
//       return { success: true, message: "Nothing new to sync", syncedCount: 0 };
//     }

//     // --- Build payload ---
//     const payload = {
//       customers: customers.map(c => ({
//         entity_id: c.entity_id,
//         name: c.name,
//         phone: c.phone,
//         last_seen: c.last_seen,
//         visited: c.visited,
//         latitude: c.latitude,
//         longitude: c.longitude,
//         location_status: c.location_status,
//         updated_at: c.updated_at,
//       })),
//       order_booking: bookings,
//       order_booking_line: lines,
//       receipts,
//     };

//     console.log("🔄 SYNC PAYLOAD:", payload);

//     // --- 🔥 Dynamic Sync URL ---
//     const baseUrl = await getBaseUrl();
//     // const syncUrl = `${baseUrl}/api/order-booking/sync`;
//     const syncUrl = "http://192.168.1.3:3000/api/order-booking/sync";


//     console.log("🌍 Sync URL:", syncUrl);

//     // --- Send to API ---
//     const response = await fetch(syncUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(payload),
//     });

//     const result = await response.json();

//     if (!result.success) {
//       console.log("❌ Sync failed:", result.error);
//       return { success: false, message: result.error, syncedCount: 0 };
//     }

//     // --- 1️⃣ Mark uploaded rows as synced ---
//     await Promise.all([
//       ...customers.map(c => markCustomerSynced(c.entity_id)),
//       ...bookings.map(b => markOrderSynced(b.booking_id)),
//       ...receipts.map(r => markCustomerReceiptSynced(r.id)),
//     ]);

//     // --- 2️⃣ Apply server → local updates ---
//     const serverCustomers = result.server_customers || [];

//     for (let cust of serverCustomers) {
//       await db.runAsync(
//         `
//         INSERT OR IGNORE INTO customer
//           (entity_id, name, phone, last_seen, visited, latitude, longitude, location_status, synced, updated_at)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
//         `,
//         [
//           cust.entity_id,
//           cust.name,
//           cust.phone || "",
//           cust.last_seen || null,
//           cust.visited || "Unvisited",
//           cust.latitude || null,
//           cust.longitude || null,
//           cust.location_status || "Not Updated",
//           cust.updated_at || new Date().toISOString(),
//         ]
//       );

//       await db.runAsync(
//         `
//         UPDATE customer
//         SET name = ?, phone = ?
//         WHERE entity_id = ?
//         `,
//         [cust.name, cust.phone || "", cust.entity_id]
//       );
//     }

//     console.log("✅ Data synced successfully!");

//     if (onOrderSynced) {
//       onOrderSynced(bookings.map(b => b.booking_id));
//     }

//     return {
//       success: true,
//       message: "Data synced successfully",
//       syncedCount: totalToSync,
//     };
//   } catch (err) {
//     console.log("❌ Sync error:", err);
//     return {
//       success: false,
//       message: err.message || "Sync failed",
//       syncedCount: 0,
//     };
//   }
// };



// Updated at 15-12-2025
// // syncService.js
// import {
//   getUnsyncedCustomers,
//   // getUnsyncedItems,
//   getUnsyncedBookings,
//   getUnsyncedBookingLines,
//   getUnsyncedReceipts,
//   markCustomerSynced,
//   // markItemSynced,
//   markOrderSynced,
//   markCustomerReceiptSynced,
// } from "../db/database";
// import { getDB, openUserDB, getCurrentUserId } from "../db/dbManager";
// export const handleSync = async (onOrderSynced) => {
//   const DB = () => getDB();
//   const db = DB();

//   try {
//     // --- Fetch only UNSYNCED rows ---
//     const customers = await getUnsyncedCustomers();
//     // const items = await getUnsyncedItems();
//     const bookings = await getUnsyncedBookings();
//     const lines = await getUnsyncedBookingLines();
//     const receipts = await getUnsyncedReceipts();

//     const totalToSync =
//       customers.length +
//       // items.length +
//       bookings.length +
//       lines.length +
//       receipts.length;

//     if (totalToSync === 0) {
//       console.log("✅ Nothing new to sync");
//       return { success: true, message: "Nothing new to sync", syncedCount: 0 };
//     }

//     // --- Build payload ---
//     const payload = {
//       customers: customers.map(c => ({
//         entity_id: c.entity_id,
//         name: c.name,
//         phone: c.phone,
//         last_seen: c.last_seen,
//         visited: c.visited,
//         latitude: c.latitude,
//         longitude: c.longitude,
//         location_status: c.location_status,
//         updated_at: c.updated_at
//       })),
//       // items: items.map(i => ({
//       //   id: i.id,
//       //   name: i.name,
//       //   price: i.price,
//       //   type: i.type,
//       //   image: i.image,
//       //   stock: i.stock,
//       //   updated_at: i.updated_at
//       // })),
//       order_booking: bookings,
//       order_booking_line: lines,
//       receipts
//     };

//     console.log("🔄 SYNC PAYLOAD:", payload);

//     // --- Send to API ---
//     // "https://staging.axonerp.com/api/order-booking/sync",
//     const response = await fetch(
//     // "http://192.168.1.3:3000/api/order-booking/sync",
//     "https://staging.axonerp.com/api/order-booking/sync",

//     {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       }
//     );

//     const result = await response.json();

//     if (!result.success) {
//       console.log("❌ Sync failed:", result.error);
//       return { success: false, message: result.error, syncedCount: 0 };
//     }

//     // --- 1️⃣ Mark uploaded rows as synced ---
//     await Promise.all([
//       ...customers.map(c => markCustomerSynced(c.entity_id)),
//       // ...items.map(i => markItemSynced(i.id)),
//       ...bookings.map(b => markOrderSynced(b.booking_id)),
//       ...receipts.map(r => markCustomerReceiptSynced(r.id))
//     ]);

//     // --- 2️⃣ Apply server → local updates ---
//     const serverCustomers = result.server_customers || [];
//     for (let cust of serverCustomers) {
//       await db.runAsync(`
//         INSERT OR IGNORE INTO customer 
//           (entity_id, name, phone, last_seen, visited, latitude, longitude, location_status, synced, updated_at)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
//       `,
//       [
//         cust.entity_id,
//         cust.name,
//         cust.phone || "",
//         cust.last_seen || null,
//         cust.visited || "Unvisited",
//         cust.latitude || null,
//         cust.longitude || null,
//         cust.location_status || "Not Updated",
//         cust.updated_at || new Date().toISOString()
//       ]);

//       await db.runAsync(`
//         UPDATE customer
//         SET name = ?, phone = ?
//         WHERE entity_id = ?
//       `, [cust.name, cust.phone || "", cust.entity_id]);
//     }

//     // const serverItems = result.server_items || [];
//     // for (let item of serverItems) {
//     //   await db.runAsync(`
//     //     INSERT OR IGNORE INTO items
//     //       (id, name, price, type, image, stock, synced, updated_at)
//     //     VALUES (?, ?, ?, ?, ?, ?, 1, ?)
//     //   `,
//     //   [
//     //     item.id,
//     //     item.name,
//     //     item.price,
//     //     item.type,
//     //     item.image || "",
//     //     item.stock || 0,
//     //     item.updated_at || new Date().toISOString()
//     //   ]);

//     //   await db.runAsync(`
//     //     UPDATE items
//     //     SET name = ?, price = ?, type = ?, image = ?, stock = ?
//     //     WHERE id = ?
//     //   `,
//     //   [item.name, item.price, item.type, item.image || "", item.stock || 0, item.id]);
//     // }

//     console.log("✅ Data synced successfully!");

//     // --- Notify UI for orders if callback provided ---
//     if (onOrderSynced) {
//       onOrderSynced(bookings.map(b => b.booking_id));
//     }

//     return {
//       success: true,
//       message: "Data synced successfully",
//       syncedCount: totalToSync,
//     };

//   } catch (err) {
//     console.log("❌ Sync error:", err);
//     return { success: false, message: err.message || "Sync failed", syncedCount: 0 };
//   }
// };





// // syncService.js
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import {
//   getAllCustomersForSync,
//   getAllItemsForSync,
//   getAllOrderBookings,
//   getAllOrderBookingLines,
//   getAllCustomerReceiptsForSync,
//   markCustomerReceiptSynced, 
//   markOrderSynced 
// } from "../db/database"; // adjust path

// export const handleSync = async (onOrderSynced) => {
//   try {
//     // --- Fetch all data ---
//     const allCustomers = await getAllCustomersForSync();
//     const allItems = await getAllItemsForSync();
//     const allBookings = await getAllOrderBookings();
//     const allLines = await getAllOrderBookingLines();
//     const allReceipts = await getAllCustomerReceiptsForSync();

//     // --- Load previously synced row counts ---
//     const [
//       prevCustomerCountStr,
//       prevItemCountStr,
//       prevBookingCountStr,
//       prevLineCountStr,
//       prevReceiptCountStr,
//     ] = await Promise.all([
//       AsyncStorage.getItem("synced_customer_count"),
//       AsyncStorage.getItem("synced_item_count"),
//       AsyncStorage.getItem("synced_booking_count"),
//       AsyncStorage.getItem("synced_line_count"),
//       AsyncStorage.getItem("synced_receipt_count"),
//     ]);

//     const prevCustomerCount = prevCustomerCountStr ? Number(prevCustomerCountStr) : 0;
//     const prevItemCount = prevItemCountStr ? Number(prevItemCountStr) : 0;
//     const prevBookingCount = prevBookingCountStr ? Number(prevBookingCountStr) : 0;
//     const prevLineCount = prevLineCountStr ? Number(prevLineCountStr) : 0;
//     const prevReceiptCount = prevReceiptCountStr ? Number(prevReceiptCountStr) : 0;

//     // --- Check if any table has changed ---
//     const isUpdated =
//       allCustomers.length !== prevCustomerCount ||
//       allItems.length !== prevItemCount ||
//       allBookings.length !== prevBookingCount ||
//       allLines.length !== prevLineCount ||
//       allReceipts.length !== prevReceiptCount;

//     if (!isUpdated) {
//       console.log("Nothing new to sync");
//       return { success: true, message: "Nothing new to sync", syncedCount: 0 };
//     }

//     // --- Prepare payload ---
//     const payload = {
//       customers: allCustomers,
//       items: allItems,
//       order_booking: allBookings,
//       order_booking_line: allLines,
//       receipts: allReceipts,
//     };

//     console.log("SYNC PAYLOAD:", payload);

//     // --- Send to API ---  
//     // "https://192.168.1.3:3000/api/order-booking/sync",
//     // "https://staging.axonerp.com/api/order-booking/sync",

//     const response = await fetch(
//           "https://staging.axonerp.com/api/order-booking/sync",
//       {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       }
//     );

//     const result = await response.json();

//     if (result.success) {
//       // --- Mark synced rows in database ---
//       await Promise.all([
//         ...allReceipts.map((r) => markCustomerReceiptSynced(r.id)),
//         ...allBookings.map((b) => markOrderSynced(b.booking_id)),
//       ]);

//       // --- Update synced counts in AsyncStorage ---
//       await Promise.all([
//         AsyncStorage.setItem("synced_customer_count", allCustomers.length.toString()),
//         AsyncStorage.setItem("synced_item_count", allItems.length.toString()),
//         AsyncStorage.setItem("synced_booking_count", allBookings.length.toString()),
//         AsyncStorage.setItem("synced_line_count", allLines.length.toString()),
//         AsyncStorage.setItem("synced_receipt_count", allReceipts.length.toString()),
//       ]);

//       const syncedCount =
//         allCustomers.length +
//         allItems.length +
//         allBookings.length +
//         allLines.length +
//         allReceipts.length;

//       console.log("Data synced successfully!", result);

//       // --- Notify OrderDetailScreen to update UI ---
//       if (onOrderSynced && typeof onOrderSynced === "function") {
//         onOrderSynced(allBookings.map((b) => b.booking_id));
//       }

//       return { success: true, message: "Data synced successfully", syncedCount };
//     } else {
//       console.log("Sync failed:", result.error);
//       return { success: false, message: result.error || "Sync failed", syncedCount: 0 };
//     }
//   } catch (err) {
//     console.log("Sync error:", err);
//     return { success: false, message: err.message || "Something went wrong", syncedCount: 0 };
//   }
// };