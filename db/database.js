// src/db/database.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import { getDB, openUserDB, getCurrentUserId } from "./dbManager";
import { uploadImageToCloudinary } from '../cloudinary';
import { Buffer } from "buffer";


const DB = () => getDB();



/* ============ CLEAR USER DATA (current DB) ============ */
/* Clears only the currently opened DB */

export const clearUserData = async () => {
  const db = DB();
  await db.execAsync("DELETE FROM customer");
  await db.execAsync("DELETE FROM items");
  await db.execAsync("DELETE FROM order_booking");
  await db.execAsync("DELETE FROM order_booking_line");
  await db.execAsync("DELETE FROM activity_log");
  await db.execAsync("DELETE FROM customerReceipts");
  await db.execAsync("DELETE FROM recent_activity");
  await db.execAsync("DELETE FROM app_activity");


  // remove per-user AsyncStorage keys if any
  await AsyncStorage.multiRemove(["qr_scanned", "user_name"]);

  console.log("Cleared current user data (current DB).");
};

export const logoutDB = async () => {
  try {
    const db = DB();
    // Clear session_id from app_config
    await db.runAsync(`UPDATE app_config SET session_id = NULL WHERE id = 'config'`);
    console.log("✅ Session ID cleared from DB on logout");
  } catch (error) {
    console.log("❌ Failed to clear session ID from DB:", error);
  }
};


// ============ QR CONFIG HELPERS ============
// ✅ Save QR config into SQLite

export const saveQRConfig = async (data) => {
  const db = DB();

  const entity = data?.entity || {};
  const qr = data?.qr_payload || {};

  // decide active status
  const activeStatus = data?.valid ? "active" : "inActive";

  // ✅ Convert logo safely to base64
  const logoBase64 = entity.company_logo?.data
    ? Buffer.from(entity.company_logo.data).toString("base64")
    : null;

  await db.runAsync(
    `INSERT OR REPLACE INTO app_config
     (id, entity_id, name, email, baseUrl, check_connection_url, sync_url, signature, generated_at, active_status,session_id, company_logo, company_ntn_number, company_address)
     VALUES ('config', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entity.entity_id || null,
      entity.name || null,
      entity.email || null,
      qr.baseUrl || null,
      qr.check_connection_url || null,
      qr.sync_url || null,
      qr.signature || null,
      qr.generated_at || null,
      activeStatus,
      data.session_id || null,
      logoBase64,      
      entity.company_ntn_number || null,
      entity.company_address || null,
    ]
  );

  console.log("✅ QR Config saved with status:", activeStatus);

  // 🔍 SHOW FULL TABLE AFTER SAVE
  const rows = await db.getAllAsync(`SELECT * FROM app_config`);
  console.log("📦 app_config AFTER SAVE:", rows);
};


// export const saveQRConfig = async (data) => {
//   const db = DB();
//   const entity = data?.entity || {};
//   const qr = data?.qr_payload || {};

//   await db.runAsync(
//     `INSERT OR REPLACE INTO app_config 
//      (id, entity_id, name, email, baseUrl, check_connection_url, sync_url, signature, generated_at, active_status)
//      VALUES ('config', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       entity.entity_id || null,
//       entity.name || null,
//       entity.email || null,
//       qr.baseUrl || null,
//       qr.check_connection_url || null,
//       qr.sync_url || null,
//       qr.signature || null,
//       qr.generated_at || null,
//       "active",
//     ]
//   );
//     // 🔍 Debug log
//   const rows = await db.getAllAsync("SELECT * FROM app_config");
//   console.log("📦 app_config AFTER SAVE:");
//   console.table(rows);
// };


export const getActiveStatus = async () => {
  const db = DB();

  const rows = await db.getAllAsync(
    `SELECT active_status FROM app_config WHERE id = 'config'`
  );

  console.log("📌 Active status row:", rows);

  return rows?.[0]?.active_status || "inActive";
};



export const getQRConfig = async () => {
  const db = DB();
  const result = await db.getFirstAsync(
    `SELECT 
       entity_id,
       name,
       email,
       baseUrl,
       check_connection_url,
       sync_url,
       signature,
       generated_at,
       active_status, 
       session_id, 
       company_logo, 
       company_ntn_number, 
       company_address
     FROM app_config 
     WHERE id = 'config'`
  );

  return result || null;
};

export const getSessionID = async () => {
  const db = getDB();
  return await db.getFirstAsync(
    `SELECT session_id, entity_id, baseUrl FROM app_config WHERE id = 'config'`
  );
};


// Get entity_id from app_config table
export const getAppConfigEntityID = async () => {
  try {
    const db = getDB();
    const result = await db.getFirstAsync(
      `SELECT entity_id FROM app_config WHERE id = 'config'`
    );
    return result?.entity_id || null; // return null if not found
  } catch (err) {
    console.error("❌ Failed to get app_config entity_id:", err);
    return null;
  }
};



export const getAppConfig = async () => {
  try {
    const db = DB();
    const rows = await db.getAllAsync("SELECT * FROM app_config LIMIT 1");
    return rows?.[0] || null;
  } catch (err) {
    console.error("Error fetching app config:", err);
    return null;
  }
};

// ==================== CUSTOMER FUNCTIONS ====================

// export const getAllCustomers = async () => {
//   const db = DB();
//   return await db.getAllAsync("SELECT * FROM customer ORDER BY entity_id DESC");
// };


// export const getAllCustomers = async () => {
//   const db = DB();
//   try {
//     const customers = await db.getAllAsync("SELECT * FROM customer ORDER BY entity_id DESC");
//     console.log("🛠 Customers in DB:", customers); // 🔍 Debug log
//     return customers;
//   } catch (err) {
//     console.error("❌ Failed to fetch customers:", err);
//     return [];
//   }
// };


// Get customers for Database based on customer_rep_id and app_config(entity_id)
// export const getAllCustomers = async () => {
//   try {
//     const db = getDB();

//     // 1️⃣ Get app_config entity_id (rep id)
//     const config = await db.getFirstAsync(
//       "SELECT entity_id FROM app_config WHERE id = 'config'"
//     );
//     const repId = config?.entity_id;
//     console.log("🏢 app_config.entity_id (rep id):", repId);

//     if (!repId) {
//       console.warn("⚠️ No rep id found in app_config");
//       return [];
//     }

//     // 2️⃣ Get customers where customer_rep_id matches repId
//     const customers = await db.getAllAsync(
//       `
//       SELECT *
//       FROM customer
//       WHERE customer_rep_id = ?
//       ORDER BY entity_id DESC
//       `,
//       [repId]
//     );

//     console.log("👥 Loaded customers for rep:", customers);
//     return customers;
//   } catch (err) {
//     console.error("❌ Failed to get customers:", err);
//     return [];
//   }
// };

export const getAllCustomers = async () => {
  try {
    const db = getDB();

    // 1️⃣ Get app_config entity_id (rep id)
    const config = await db.getFirstAsync(
      "SELECT entity_id FROM app_config WHERE id = 'config'"
    );
    const repId = config?.entity_id;
    console.log("🏢 app_config.entity_id (rep id):", repId);

    if (!repId) {
      console.warn("⚠️ No rep id found in app_config");
      return [];
    }

    // 2️⃣ Get customers:
    //    - assigned to this rep
    //    - OR not assigned to any rep (NULL / empty)
    const customers = await db.getAllAsync(
      `
      SELECT *
      FROM customer
      WHERE 
        customer_rep_id = ?
        OR customer_rep_id IS NULL
        OR customer_rep_id = ''
      ORDER BY entity_id DESC
      `,
      [repId]
    );

    console.log("👥 Loaded customers for rep (including unassigned):", customers);
    return customers;
  } catch (err) {
    console.error("❌ Failed to get customers:", err);
    return [];
  }
};

export const searchCustomers = async (query) => {
  try {
    const db = getDB();

    // 1️⃣ Get app_config entity_id (rep id)
    const config = await db.getFirstAsync(
      "SELECT entity_id FROM app_config WHERE id = 'config'"
    );
    const repId = config?.entity_id;
    console.log("🏢 app_config.entity_id (rep id):", repId);

    if (!repId) {
      console.warn("⚠️ No rep id found in app_config");
      return [];
    }

    // 2️⃣ Search customers:
    //    - assigned to this rep
    //    - OR unassigned (NULL / empty)
    const customers = await db.getAllAsync(
      `
      SELECT *
      FROM customer
      WHERE name LIKE ?
        AND (
          customer_rep_id = ?
          OR customer_rep_id IS NULL
          OR customer_rep_id = ''
        )
      ORDER BY entity_id DESC
      `,
      [`%${query}%`, repId]
    );

    console.log("🔍 Search results for rep (including unassigned):", customers);
    return customers;
  } catch (err) {
    console.error("❌ Failed to search customers:", err);
    return [];
  }
};


// export const searchCustomers = async (query) => {
//   try {
//     const db = getDB();

//     // 1️⃣ Get app_config entity_id (rep id)
//     const config = await db.getFirstAsync(
//       "SELECT entity_id FROM app_config WHERE id = 'config'"
//     );
//     const repId = config?.entity_id;
//     console.log("🏢 app_config.entity_id (rep id):", repId);

//     if (!repId) {
//       console.warn("⚠️ No rep id found in app_config");
//       return [];
//     }

//     // 2️⃣ Search customers for this rep
//     const customers = await db.getAllAsync(
//       `
//       SELECT *
//       FROM customer
//       WHERE name LIKE ?
//         AND customer_rep_id = ?
//       ORDER BY entity_id DESC
//       `,
//       [`%${query}%`, repId]
//     );

//     console.log("🔍 Search results for rep:", customers);
//     return customers;
//   } catch (err) {
//     console.error("❌ Failed to search customers:", err);
//     return [];
//   }
// };
// export const searchCustomers = async (query) => {
//   const db = DB();
//   return await db.getAllAsync(
//     "SELECT * FROM customer WHERE name LIKE ? ORDER BY entity_id DESC",
//     [`%${query}%`]
//   );
// };

// ⭐ CORRECTED VERSION — marks unsynced + updated_at
export const updateVisited = async (id, visited) => {
  const db = DB();
  const status = visited ? "Visited" : "Unvisited";

  await db.runAsync(
    `UPDATE customer 
     SET visited = ?, synced = 0, updated_at = ? 
     WHERE entity_id = ?`,
    [status, new Date().toISOString(), id]
  );
};

// export const updateVisited = async (id, visited) => {
//   const db = DB();
//   const status = visited ? "Yes" : "No";
//   await db.runAsync(
//     "UPDATE customer SET visited = ? WHERE entity_id = ?",
//     [status, id]
//   );
// };

// UPSERT customer from API, but keep existing visited/last_seen
export const upsertCustomer = async (customer) => {
  const db = DB();
  await db.runAsync(`
    INSERT OR IGNORE INTO customer 
      (entity_id,customer_rep_id, name, phone, last_seen, visited, latitude, longitude, location_status, synced, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      customer.entity_id,
      customer.customer_rep_id,
      customer.name,
      customer.phone || "",
      customer.last_seen || null,   // will be null only for new customers
      customer.visited || "Unvisited",
      customer.latitude || null,
      customer.longitude || null,
      customer.location_status || "Not Updated",
      new Date().toISOString()
    ]
  );

  // Always update name/phone from API, but keep visited/last_seen intact
  // await db.runAsync(`
  //   UPDATE customer
  //   SET name = ?, phone = ?
  //   WHERE entity_id = ?`,
  //   [customer.name, customer.phone || "", customer.entity_id]
  // );


  // ⭐ CORRECTED VERSION to Update Customers in Database
    await db.runAsync(`
    UPDATE customer
    SET name = ?, phone = ?, customer_rep_id = ?
    WHERE entity_id = ?`,
    [customer.name, customer.phone || "", customer.customer_rep_id, customer.entity_id]
  );
};


// ==================== ITEM FUNCTIONS ====================

export const getAllItems = async () => {
  const db = DB();
  return await db.getAllAsync("SELECT * FROM items ORDER BY name ASC");
};

export const getItems = async (query = "") => {
  const db = DB();
  return await db.getAllAsync(
    "SELECT * FROM items WHERE name LIKE ? ORDER BY name ASC",
    [`%${query}%`]
  );
};

export const addItem = async (name, price, image, stock = 0) => {
  const db = DB();
  const id = uuidv4();
  await db.runAsync(
    "INSERT INTO items (id, name, price, image, stock) VALUES (?, ?, ?, ?, ?)",
    [id, name, price, image, stock]
  );
  return id;
};

// // UPSERT item from API
// export const upsertItem = async (item) => {
//   const db = DB();
//   await db.runAsync(
//     `INSERT OR REPLACE INTO items 
//       (id, name, price, type, image, stock)
//      VALUES (?, ?, ?, ?, ?, ?)`,
//     [
//       item.item_id,
//       item.name,
//       item.retail_price || 0,
//       item.item_type || "",
//       item.image_path || "",
//       item.item_balance || 0,
//     ]
//   );
// };


// UPSERT item from API (FIXED)
export const upsertItem = async (item) => {
  const db = DB();

  await db.runAsync(
    `
    INSERT OR REPLACE INTO items
    (id, name, type, price, stock, image)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      item.id,                 // ✅ correct
      item.name ?? "",
      item.type ?? "",
      item.price ?? 0,          // ✅ correct
      item.stock ?? 0,          // ✅ correct
      item.image ?? null,
    ]
  );
};

// ==================== ORDER BOOKING FUNCTIONS ====================

const getCurrentDateTime = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

export const addOrderBooking = async (order) => {
  const db = DB();
  const bookingId = uuidv4();
  await db.runAsync(
    `INSERT INTO order_booking (booking_id, order_date, customer_id, order_no, created_by_id, created_date, synced)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      bookingId,
      order.order_date,
      order.customer_id,
      order.order_no,
      order.created_by_id,
      order.created_date,
    ]
  );

  const now = getCurrentDateTime();
  const today = now.split(" ")[0];

  // await db.runAsync(
  //   "UPDATE customer SET visited = 'Visited', last_seen = ? WHERE entity_id = ?",
  //   [now, order.customer_id]
  // );
  await db.runAsync(
  `UPDATE customer
   SET visited = 'Visited',
       last_seen = ?,
       synced = 0
   WHERE entity_id = ?`,
  [now, order.customer_id]
);


  const existing = await db.getFirstAsync(
    "SELECT id FROM activity_log WHERE customer_id = ? AND date = ?",
    [order.customer_id, today]
  );

  if (!existing) {
  // Ensure customer_name is not null
  let customerName = order.customer_name;

  // If not provided in order, fetch from customer table
  if (!customerName) {
    const customer = await db.getFirstAsync(
      "SELECT name FROM customer WHERE entity_id = ?",
      [order.customer_id]
    );
    customerName = customer?.name || "Unknown Customer";
  }

  await db.runAsync(
    `INSERT INTO activity_log 
      (id, customer_id, customer_name, date, status)
     VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), order.customer_id, customerName, today, "Visited"]
  );
}

  else {
    await db.runAsync(
      "UPDATE activity_log SET status = 'Visited' WHERE customer_id = ? AND date = ?",
      [order.customer_id, today]
    );
  }

  return bookingId;
};

export const addOrderBookingLine = async (line) => {
  const db = DB();
  const lineId = uuidv4();
  await db.execAsync("BEGIN TRANSACTION;");
  try {
    await db.runAsync(
      `INSERT INTO order_booking_line (line_id, booking_id, item_id, order_qty, unit_price, amount, synced)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        lineId,
        line.booking_id,
        line.item_id,
        line.order_qty,
        line.unit_price,
        line.amount,
      ]
    );
    await db.execAsync("COMMIT;");
  } catch (error) {
    console.error("Error inserting order line:", error);
    await db.execAsync("ROLLBACK;");
    throw error;
  }
};



export const getLastOrderNo = async () => {
  const db = DB();
  try {
    const result = await db.getAllAsync(
      `SELECT order_no FROM order_booking ORDER BY rowid DESC LIMIT 1`
    );
    return result[0]?.order_no || null;
  } catch (err) {
    console.error("Error getting last order no:", err);
    return null;
  }
};


export const generateNextOrderNo = async () => {
  const lastOrderNo = await getLastOrderNo();
  let lastNumber = 0;

  if (lastOrderNo) {
    // Extract numeric part from "ORD-0001"
    lastNumber = parseInt(lastOrderNo.replace("ORD-", ""), 10);
  }

  const nextNumber = (lastNumber + 1).toString().padStart(4, "0"); // "0002"
  return `ORD-${nextNumber}`;
};


// ==================== DAILY ACTIVITY LOG FUNCTIONS ====================

// Initialize activity log for all customers today
export const initDailyActivityLog = async () => {
  const db = DB();
  const today = new Date().toISOString().split("T")[0];
  const allCustomers = await getAllCustomers();

  // Filter customers with valid entity_id
  const customers = allCustomers.filter(c => c.entity_id != null);

  for (let customer of customers) {
    try {
      const exists = await db.getAllAsync(
        "SELECT * FROM activity_log WHERE customer_id = ? AND date = ?",
        [customer.entity_id, today]
      );

      if (exists.length === 0) {
        await db.runAsync(
          "INSERT INTO activity_log (id, customer_id, customer_name, date, status) VALUES (?, ?, ?, ?, ?)",
          [uuidv4(), customer.entity_id, customer.name, today, "Unvisited"]
        );
      }
    } catch (err) {
      console.error(`Failed to insert activity log for ${customer.name}:`, err);
    }
  }
};

// Auto reset customer visited status once per day
export const autoResetDailyVisitStatus = async () => {
  const db = DB();
  const today = new Date().toISOString().split("T")[0];

  // Get last reset date
  const row = await db.getFirstAsync(
    "SELECT last_reset_date FROM app_settings WHERE id = 1"
  );

  if (!row) {
    // First time app runs → insert today's date
    await db.runAsync(
      "INSERT INTO app_settings (id, last_reset_date) VALUES (1, ?)",
      [today]
    );

    await initDailyActivityLog();
    return;
  }

  // If today is different → new day → reset
  if (row.last_reset_date !== today) {
    console.log("New day detected → resetting visit status");

    // Reset all customers to unvisited
    // await db.runAsync("UPDATE customer SET visited = 'Unvisited'");
    await db.runAsync("UPDATE customer SET visited = 'Unvisited', synced = 0, updated_at = '${new Date().toISOString()}'");


    // Create new daily activity log for today
    await initDailyActivityLog();

    // Update settings table
    await db.runAsync(
      "UPDATE app_settings SET last_reset_date = ? WHERE id = 1",
      [today]
    );
  }
};

// Mark customer as visited (updates both customer table and activity log)
export const markCustomerVisited = async (customer_id) => {
  const db = DB();
  const today = new Date().toISOString().split("T")[0];
  // await db.runAsync(
  //   "UPDATE customer SET visited = 'Visited' WHERE entity_id = ?",
  //   [customer_id]
  // );
  await db.runAsync(
  `UPDATE customer 
   SET visited = 'Visited',
       last_seen = ?,
       synced = 0,
       updated_at = ?
   WHERE entity_id = ?`,
  [now, new Date().toISOString(), order.customer_id]
);

  await db.runAsync(
    "UPDATE activity_log SET status = 'Visited' WHERE customer_id = ? AND date = ?",
    [customer_id, today]
  );
};

// // Optional: reset all customers to 'Unvisited' at the start of a new day
// export const resetDailyCustomerStatus = async () => {
//   await db.runAsync("UPDATE customer SET visited = 'Unvisited'");
//   await initDailyActivityLog();
// };

// Get activity log for today
export const getTodayActivityLog = async () => {
  const db = DB();
  const today = new Date().toISOString().split("T")[0];
  return await db.getAllAsync(
    "SELECT * FROM activity_log WHERE date = ? ORDER BY customer_name ASC",
    [today]
  );
};

// ⭐ UPDATE LAST SEEN (local change → must sync)
export const updateCustomerLastSeen = async (customer_id, last_seen) => {
  const db = DB();

  await db.runAsync(
    `UPDATE customer 
     SET last_seen = ?, synced = 0, updated_at = ? 
     WHERE entity_id = ?`,
    [last_seen, new Date().toISOString(), customer_id]
  );
};


// // Update last_seen for a customer
// export const updateCustomerLastSeen = async (customer_id, last_seen) => {
//   const db = DB();
//   await db.runAsync(
//     "UPDATE customer SET last_seen = ? WHERE entity_id = ?",
//     [last_seen, customer_id]
//   );
// };


// Fetch today's visit counts per hour
// Fetch today's visit counts per 6-hour interval (consistent style)
export const getTodayVisitStats = async () => {
  const db = DB(); // get the DB instance
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    // Fetch logs for today with status 'Visited'
    const logs = await db.getAllAsync(
      `SELECT * FROM activity_log WHERE date >= ? AND date < ? AND status = 'Visited'`,
      [startOfDay, endOfDay]
    );

    // Initialize 6-hour intervals: 0-5, 6-11, 12-17, 18-23
    const intervals = ["0-5", "6-11", "12-17", "18-23"];
    const counts = [0, 0, 0, 0];

    logs.forEach((log) => {
      const hour = new Date(log.date).getHours();
      if (hour >= 0 && hour <= 5) counts[0]++;
      else if (hour >= 6 && hour <= 11) counts[1]++;
      else if (hour >= 12 && hour <= 17) counts[2]++;
      else if (hour >= 18 && hour <= 23) counts[3]++;
    });

    return { labels: intervals, dataPoints: counts };
  } catch (error) {
    console.error("Error fetching visit stats:", error);
    return { labels: [], dataPoints: [] };
  }
};


// ==================== ORDER FETCHING FUNCTIONS ====================

// Fetch all orders summary
export const getAllOrders = async () => {
  const db = DB();
  return await db.getAllAsync(`
    SELECT 
      ob.booking_id, 
      ob.order_no, 
      ob.order_date, 
      c.name AS customer_name,
      c.phone AS customer_phone,
      COUNT(obl.line_id) AS item_count,
      SUM(obl.amount) AS total_amount,
      ob.synced
    FROM order_booking ob
    LEFT JOIN customer c ON ob.customer_id = c.entity_id
    LEFT JOIN order_booking_line obl ON ob.booking_id = obl.booking_id
    GROUP BY ob.booking_id
    ORDER BY ob.order_date DESC;
  `);
};

// // Fetch single order details
// export const getOrderDetails = async (bookingId) => {
//   const db = DB();
//   return await db.getAllAsync(
//     `
//     SELECT 
//       obl.line_id, 
//       i.name AS item_name, 
//       obl.order_qty, 
//       obl.unit_price, 
//       obl.amount

//     FROM order_booking_line obl
//     JOIN items i ON obl.item_id = i.id
//     WHERE obl.booking_id = ?
//     `,
//     [bookingId]
//   );
// };


// Fetch single order details with customer info
export const getOrderDetails = async (bookingId) => {
  const db = DB();

  return await db.getAllAsync(
    `
    SELECT 
      obl.line_id,
      i.name AS item_name,
      obl.order_qty,
      obl.unit_price,
      obl.amount,

      -- Customer info
      c.entity_id AS customer_id,
      c.name AS customer_name,
      c.phone AS customer_phone,

      -- Order info
      ob.order_no,
      ob.order_date
    FROM order_booking_line obl
    JOIN items i 
      ON obl.item_id = i.id
    JOIN order_booking ob 
      ON obl.booking_id = ob.booking_id
    LEFT JOIN customer c 
      ON ob.customer_id = c.entity_id
    WHERE obl.booking_id = ?
    `,
    [bookingId]
  );
};


// ==================== ORDER BOOKING LINE HELPERS ====================

// Get existing order line by booking and item
export const getOrderLineByBookingAndItem = async (bookingId, itemId) => {
  const db = DB();
  return await db.getAllAsync(
    `SELECT * FROM order_booking_line WHERE booking_id = ? AND item_id = ?`,
    [bookingId, itemId]
  );
};

// Update an existing order line
export const updateOrderBookingLine = async (lineId, data) => {
  const db = DB();
  try {
    await db.runAsync(
      `UPDATE order_booking_line 
       SET order_qty = ?, amount = ? 
       WHERE line_id = ?`,
      [data.order_qty, data.amount, lineId]
    );
  } catch (error) {
    console.error("Failed to update order line:", error);
    throw error;
  }
};

// ---------------------- DELETE ORDER LINE ----------------------
export const deleteOrderBookingLine = async (lineId) => {
  const db = DB();
  try {
    await db.runAsync(
      "DELETE FROM order_booking_line WHERE line_id = ?",
      [lineId]
    );
  } catch (error) {
    console.error("Failed to delete order line:", error);
    throw error;
  }
};


// Update order booking line
export const updateOrderBookingLineDetails = async ({
  booking_line_id,
  order_qty,
  amount,
}) => {
  const db = DB();
  try {
    await db.runAsync(
      `UPDATE order_booking_line 
       SET order_qty = ?, amount = ? 
       WHERE line_id = ?`,
      [order_qty, amount, booking_line_id]
    );
  } catch (error) {
    console.error("Failed to update order line:", error);
    throw error;
  }
};



// ==================== CUSTOMER LOCATION UPDATE ====================

// Update latitude and longitude for a customer
export const updateCustomerLocation = async (customer_id, latitude, longitude) => {
  const db = DB();
  try {
    await db.runAsync(
      `UPDATE customer 
       SET latitude = ?, longitude = ? 
       WHERE entity_id = ?`,
      [latitude, longitude, customer_id]
    );
    console.log(`Customer ${customer_id} location updated.`);
  } catch (error) {
    console.error("Error updating customer location:", error);
  }
};

// Update location, last_seen, and location_status

export const updateCustomerLocationWithLastSeen = async (
  customer_id,
  latitude,
  longitude,
  status
) => {
  const db = DB();
  const now = new Date().toISOString();

  try {
    await db.runAsync(
      `
      UPDATE customer
      SET 
        latitude = ?,
        longitude = ?,
        location_status = ?,
        last_seen = ?,
        updated_at = ?,
        synced = 0
      WHERE entity_id = ?
      `,
      [
        latitude,
        longitude,
        status,
        now,
        now,
        customer_id
      ]
    );

    console.log(`📍 Customer ${customer_id} location updated & marked unsynced`);
  } catch (error) {
    console.error("❌ Error updating customer location:", error);
  }
};

// export const updateCustomerLocationWithLastSeen = async (customer_id, latitude, longitude, status) => {
//   const db = DB();
//   const last_seen = new Date().toISOString();
//   try {
//     await db.runAsync(
//       `UPDATE customer 
//        SET latitude = ?, longitude = ?, location_status = ? 
//        WHERE entity_id = ?`,
//       [latitude, longitude, status, customer_id]
//     );
//     console.log(`Customer ${customer_id} location, last_seen, and status updated.`);
//   } catch (error) {
//     console.error("Error updating customer location, last_seen, and status:", error);
//   }
// };


// ==================== CUSTOMER RECEIPTS ====================

// Add new customer receipt (bank names are converted to account IDs)
export const addCustomerReceipt = async ({ customer_id, cash_bank_id,cash_bank_name, amount, note, attachment }) => {
  const db = DB();
  const id = uuidv4();

  // store bank name directly
  await db.runAsync(
    `INSERT INTO customerReceipts 
      (id, customer_id, cash_bank_id,cash_bank_name, amount, note, attachment, synced, attachment_synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    [id, customer_id, cash_bank_id, cash_bank_name, amount, note, attachment]
  );

  return id;
};




// // Add new customer receipt
// export const addCustomerReceipt = async ({ customer_id, cash_bank_id, amount, note, attachment }) => {
//   const db = DB();
//   const id = uuidv4();

//   await db.runAsync(
//     `INSERT INTO customerReceipts 
//       (id, customer_id, cash_bank_id, amount, note, attachment, synced, attachment_synced)
//      VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
//     [id, customer_id, cash_bank_id, amount, note, attachment]
//   );

//   return id;
// };

// Update existing customer receipt
export const updateCustomerReceipt = async ({
  id,
  cash_bank_id,
  cash_bank_name,
  amount,
  note,
  attachment,
}) => {
  const db = DB();

  // Check existing attachment
  const existing = await db.getFirstAsync(
    "SELECT attachment FROM customerReceipts WHERE id = ?",
    [id]
  );

  const attachmentSynced =
    attachment !== existing?.attachment ? 0 : 1;

  await db.runAsync(
    `UPDATE customerReceipts
     SET cash_bank_id = ?,
         cash_bank_name = ?,
         amount = ?,
         note = ?,
         attachment = ?,
         attachment_synced = ?,
         created_at = datetime('now', 'localtime')
     WHERE id = ?`,
    [
      cash_bank_id,
      cash_bank_name,
      amount,
      note,
      attachment,
      attachmentSynced,
      id,
    ]
  );
};

// export const updateCustomerReceipt = async ({ id, customer_id, cash_bank_id,cash_bank_name, amount, note, attachment }) => {
//   const db = DB();

//   // Reset attachment_synced if attachment changed
//   const existing = await db.getFirstAsync(
//     "SELECT attachment FROM customerReceipts WHERE id = ?",
//     [id]
//   );

//   let attachmentSynced = 1;
//   if (attachment !== existing?.attachment) {
//     attachmentSynced = 0; // new attachment, needs upload
//   }

//   await db.runAsync(
//     `UPDATE customerReceipts
//      SET customer_id = ?, cash_bank_id = ?, cash_bank_name = ?, amount = ?, note = ?, attachment = ?, 
//          created_at = (datetime('now', 'localtime')), attachment_synced = ?
//      WHERE id = ?`,
//     [customer_id, cash_bank_id,cash_bank_name, amount, note, attachment, attachmentSynced, id]
//   );
// };


// Upload Customer Receipt Image to Cloudinary

export const syncAttachments = async () => {
  const db = DB();

  // Get receipts with unsynced attachments
  const unsyncedReceipts = await db.getAllAsync(
    `SELECT id, attachment FROM customerReceipts WHERE attachment IS NOT NULL AND attachment_synced = 0`
  );

  for (const receipt of unsyncedReceipts) {
    try {
      const uploadedUrl = await uploadImageToCloudinary(receipt.attachment);

      // Update DB with Cloudinary URL and mark as synced
      await db.runAsync(
        `UPDATE customerReceipts
         SET attachment = ?, attachment_synced = 1
         WHERE id = ?`,
        [uploadedUrl, receipt.id]
      );

      console.log('Attachment uploaded for receipt:', receipt.id);
    } catch (err) {
      console.log('Failed to upload attachment for receipt:', receipt.id, err);
      // Keep it unsynced, will retry later
    }
  }
};



// export const insertAccounts = async (db, accounts) => {
//   const query = `
//     INSERT OR REPLACE INTO accounts (id, name, account_type, root_type, is_group)
//     VALUES (?, ?, ?, ?, ?)
//   `;

//   for (const acc of accounts) {
//     await db.runAsync(query, [
//       acc.account_id,
//       acc.name ?? "Unnamed Account",
//       acc.account_type ?? null,
//       acc.root_type ?? null,
//       acc.is_group ? 1 : 0,
//     ]);
//   }
// };

export const insertAccounts = async (db, accounts) => {
  const query = `
    INSERT INTO accounts (account_id, name, account_type, root_type, is_group)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(account_id) DO UPDATE SET
      name = excluded.name,
      account_type = excluded.account_type,
      root_type = excluded.root_type,
      is_group = excluded.is_group
  `;

  for (const acc of accounts) {
    if (!acc.account_id && !acc.id) continue; // skip invalid
    await db.runAsync(query, [
      String(acc.account_id || acc.id),
      acc.name ?? "Unnamed Account",
      acc.account_type ?? null,
      acc.root_type ?? null,
      acc.is_group ? 1 : 0,
    ]);
  }
};


// export const insertAccounts = async (db, accounts) => {
//   const query = `
//     INSERT INTO accounts (account_id, name, account_type, root_type, is_group)
//     VALUES (?, ?, ?, ?, ?)
//     ON CONFLICT(account_id) DO UPDATE SET
//       name = excluded.name,
//       account_type = excluded.account_type,
//       root_type = excluded.root_type,
//       is_group = excluded.is_group
//   `;

//   for (const acc of accounts) {
//     await db.runAsync(query, [
//       String(acc.account_id), // 🔥 force string
//       acc.name ?? "Unnamed Account",
//       acc.account_type ?? null,
//       acc.root_type ?? null,
//       acc.is_group ? 1 : 0,
//     ]);
//   }
// };

export const fetchLocalAccounts = async () => {
  const db = getDB();
  const accounts = await db.getAllAsync(`
    SELECT CAST(account_id AS TEXT) as id, name
    FROM accounts
    WHERE account_id IS NOT NULL
  `);
  return accounts;
};


// export const fetchLocalAccounts = async () => {
//   const db = getDB();
//   const accounts = await db.getAllAsync(`
//     SELECT CAST(account_id AS TEXT) as id, name
//     FROM accounts
//   `);
//   return accounts;
// };


export const getReceiptsWithAccountName = async (db) => {
  return await db.getAllAsync(`
    SELECT r.*, a.name AS cash_bank_name
    FROM customerReceipts r
    LEFT JOIN accounts a ON a.id = r.cash_bank_id
    ORDER BY r.created_at DESC
  `);
};



// // Add new customer receipt
// export const addCustomerReceipt = async ({ customer_id, cash_bank_id, amount, note, attachment }) => {
//   const db = DB();
//   const id = uuidv4();
//   return await db.runAsync(
//     `INSERT INTO customerReceipts (id, customer_id, cash_bank_id, amount, note, attachment, synced)
//      VALUES (?, ?, ?, ?, ?, ?, 0)`,
//     [id, customer_id, cash_bank_id, amount, note, attachment]
//   );
//   return id;
// };

// // Update existing customer receipt
// export const updateCustomerReceipt = async (data) => {
//   const db = DB();
//   await db.runAsync(
//     `
//     UPDATE customerReceipts
//     SET 
//       customer_id = ?, 
//       cash_bank_id = ?, 
//       amount = ?, 
//       note = ?, 
//       attachment = ?,
//       created_at = (datetime('now', 'localtime'))   -- 🔥 update timestamp on edit
//     WHERE id = ?
//     `,
//     [
//       data.customer_id,
//       data.cash_bank_id,
//       data.amount,
//       data.note,
//       data.attachment,
//       data.id,
//     ]
//   );
// };



export const getAllCustomerReceipts = async () => {
  const db = DB();
  return await db.getAllAsync(`
    SELECT cr.id, cr.customer_id, cr.cash_bank_id, cr.cash_bank_name, cr.amount, cr.note, cr.attachment, cr.created_at,
    cr.synced,       
    c.name AS customerName
    FROM customerReceipts cr
    LEFT JOIN customer c ON cr.customer_id = c.entity_id
    ORDER BY cr.created_at DESC
  `, []);
};


// Fetch orders for a specific customer with summary info
export const getOrdersByCustomer = async (customerId) => {
  const db = DB();
  return await db.getAllAsync(`
    SELECT 
      ob.booking_id, 
      ob.order_no, 
      ob.order_date, 
      c.name AS customer_name,
      COUNT(obl.line_id) AS item_count,
      SUM(obl.amount) AS total_amount
    FROM order_booking ob
    LEFT JOIN customer c ON ob.customer_id = c.entity_id
    LEFT JOIN order_booking_line obl ON ob.booking_id = obl.booking_id
    WHERE ob.customer_id = ?
    GROUP BY ob.booking_id
    ORDER BY ob.booking_id DESC;
  `, [customerId]);
};

export const getTodaysSales = async () => {
  const db = DB();
  const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

  const result = await db.getFirstAsync(
    `SELECT SUM(amount) AS total FROM order_booking_line WHERE DATE(created_at) = ?`,
    [today]
  );

  return result?.total || 0;
};


export const getLastMonthSales = async () => {
  const db = DB();
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const start = lastMonth.toISOString().split("T")[0];
  const end = lastMonthEnd.toISOString().split("T")[0];

  const result = await db.getFirstAsync(
    `SELECT SUM(amount) AS total FROM order_booking_line 
     WHERE DATE(created_at) BETWEEN ? AND ?`,
    [start, end]
  );

  return result?.total || 0;
};




// ==================== RECENT ACTIVITY ====================

export const initRecentActivityTable = async () => {
  const db = DB();

};

export const addRecentActivity = async ({
  booking_id,
  customer_name,
  item_count,
  total_amount,
}) => {
  const db = DB();
  const id = uuidv4();
  const date = new Date().toISOString();
 try {
    await db.runAsync(
      `INSERT INTO recent_activity (id, booking_id, customer_name, item_count, total_amount, activity_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, booking_id, customer_name, item_count, total_amount, date]
    );
  } catch (error) {
    console.error("Failed to add recent activity:", error);
    throw error;
  }
};


// Get all recent activities (latest first)
export const getRecentActivities = async () => {
  const db = DB();
  return await db.getAllAsync(`
    SELECT * FROM recent_activity
    ORDER BY activity_date DESC
  `);
};



// // ==================== SYNC HELPER FUNCTIONS ====================

// ----------------------------
// FETCH UNSYNCED ROWS ONLY
// ----------------------------

// ==================== CUSTOMERS ====================
// export const getAllCustomers = async () => {
//   const db = DB();
//   return await db.getAllAsync("SELECT * FROM customer ORDER BY entity_id DESC");
// };

// Fetch unsynced customers
export const getUnsyncedCustomers = async () => {
  const db = DB();
  return await db.getAllAsync(`
    SELECT * FROM customer
    WHERE synced = 0
    ORDER BY entity_id ASC
  `);
};


// Mark customer as synced
export const markCustomerSynced = async (entityId) => {
  const db = DB();
  await db.runAsync("UPDATE customer SET synced = 1 WHERE entity_id = ?", [entityId]);
};

export const markCustomerUpdated = async (customerId, visited, lastSeen) => {
  const db = DB();
  await db.runAsync(
    `UPDATE customer
     SET visited = ?, last_seen = ?, synced = 0
     WHERE entity_id = ?`,
    [visited, lastSeen, customerId]
  );
};



// // ==================== ITEMS ====================
// export const getAllItems = async () => {
//   const db = DB();
//   return await db.getAllAsync("SELECT * FROM items ORDER BY name ASC");
// };

// Fetch unsynced items
// export const getUnsyncedItems = async () => {
//   const db = DB();
//   return await db.getAllAsync(`
//     SELECT * FROM items
//     WHERE synced = 0
//     ORDER BY id ASC
//   `);
// };

// Mark item as synced
// export const markItemSynced = async (id) => {
//   const db = DB();
//   await db.runAsync("UPDATE items SET synced = 1 WHERE id = ?", [id]);
// };

// ==================== ORDER BOOKING ====================
export const getUnsyncedBookings = async () => {
  const db = DB();
  return await db.getAllAsync(`
    SELECT * FROM order_booking
    WHERE synced = 0
    ORDER BY booking_id ASC
  `);
};

// // Mark order as synced (also sync its lines)
// export const markOrderSynced = async (bookingId) => {
//   const db = DB();
//   await db.runAsync("UPDATE order_booking SET synced = 1 WHERE booking_id = ?", [bookingId]);
//   await db.runAsync("UPDATE order_booking_line SET synced = 1 WHERE booking_id = ?", [bookingId]);
// };

// ==================== ORDER BOOKING LINES ====================
export const getUnsyncedBookingLines = async () => {
  const db = DB();
  return await db.getAllAsync(`
    SELECT * FROM order_booking_line
    WHERE synced = 0
    ORDER BY line_id ASC
  `);
};

// Mark order line as synced
export const markBookingLineSynced = async (lineId) => {
  const db = DB();
  await db.runAsync("UPDATE order_booking_line SET synced = 1 WHERE line_id = ?", [lineId]);
};

// ==================== CUSTOMER RECEIPTS ====================
export const getUnsyncedReceipts = async () => {
  const db = DB();
  return await db.getAllAsync(`
    SELECT * FROM customerReceipts
    WHERE synced = 0
    ORDER BY id ASC
  `);
};

// // Mark receipt as synced
// export const markCustomerReceiptSynced = async (id) => {
//   const db = DB();
//   await db.runAsync("UPDATE customerReceipts SET synced = 1 WHERE id = ?", [id]);
// };

// // Orders + Lines
// export const markOrderSynced = async (bookingId) => {
//   const db = DB();

//   // Mark order
//   await db.runAsync(
//     "UPDATE order_booking SET synced = 1 WHERE booking_id = ?",
//     [bookingId]
//   );

//   // Mark related lines
//   await db.runAsync(
//     "UPDATE order_booking_line SET synced = 1 WHERE booking_id = ?",
//     [bookingId]
//   );
// };

// // Receipts
// export const markCustomerReceiptSynced = async (id) => {
//   const db = DB();
//   await db.runAsync(
//     "UPDATE customerReceipts SET synced = 1 WHERE id = ?",
//     [id]
//   );
// };


// export const markCustomerReceiptSynced = async (id) => {
//   const db = DB();
//   await db.runAsync(`UPDATE customerReceipts SET synced = 1 WHERE id = ?`, [id]);
// };


// export const markOrderSynced = async (bookingId) => {
//   const db = DB();

//   await db.runAsync(
//     `UPDATE order_booking SET synced = 1 WHERE booking_id = ?`,
//     [bookingId]
//   );

//   await db.runAsync(
//     `UPDATE order_booking_line SET synced = 1 WHERE booking_id = ?`,
//     [bookingId]
//   );
// };



// // Helper to ensure UUID
// const ensureUUID = (record, key) => {
//   if (!record[key]) record[key] = uuidv4();
//   return record;
// };

// // Get all customers (used in incremental sync)
// export const getAllCustomersForSync = async () => {
//   const db = DB();
//   const rows = await db.getAllAsync(`
//     SELECT entity_id, name, phone, last_seen, visited, latitude, longitude, location_status
//     FROM customer
//     ORDER BY entity_id ASC
//   `);

//   // Ensure UUIDs and remove duplicates by entity_id
//   const deduped = Object.values(
//     rows.reduce((acc, c) => {
//       c = ensureUUID(c, "entity_id");
//       acc[c.entity_id] = c;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// // Get all items (used in incremental sync)
// export const getAllItemsForSync = async () => {
//   const db = DB();
//   const rows = await db.getAllAsync(`
//     SELECT id, name, price, type, image, stock
//     FROM items
//     ORDER BY id ASC
//   `);

//   const deduped = Object.values(
//     rows.reduce((acc, i) => {
//       i = ensureUUID(i, "id");
//       acc[i.id] = i;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// // Get all order bookings (used in incremental sync)
// export const getAllOrderBookings = async () => {
//   const db = DB();
//   const rows = await db.getAllAsync(`
//     SELECT booking_id, order_date, customer_id, order_no, created_by_id, created_date
//     FROM order_booking
//     ORDER BY booking_id ASC
//   `);

//   const deduped = Object.values(
//     rows.reduce((acc, b) => {
//       b = ensureUUID(b, "booking_id");
//       acc[b.booking_id] = b;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// // Get all order booking lines (used in incremental sync)
// export const getAllOrderBookingLines = async () => {
//   const db = DB();
//   const rows = await db.getAllAsync(`
//     SELECT line_id, booking_id, item_id, order_qty, unit_price, amount, created_at
//     FROM order_booking_line
//     ORDER BY line_id ASC
//   `);

//   const deduped = Object.values(
//     rows.reduce((acc, l) => {
//       l = ensureUUID(l, "line_id");
//       acc[l.line_id] = l;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// // Get all customer receipts for incremental sync
// export const getAllCustomerReceiptsForSync = async () => {
//   const db = DB();
//   const rows = await db.getAllAsync(`
//     SELECT id, customer_id, cash_bank_id, amount, note, attachment, created_at, synced
//     FROM customerReceipts
//     ORDER BY id ASC
//   `);

//   const deduped = Object.values(
//     rows.reduce((acc, r) => {
//       r = ensureUUID(r, "id");
//       acc[r.id] = r;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };


export const markCustomerReceiptSynced = async (id) => {
  const db = DB();
  await db.runAsync(
    "UPDATE customerReceipts SET synced = 1 WHERE id = ?",
    [id]
  );
};

export const markOrderSynced = async (bookingId) => {
  const db = DB();
  await db.runAsync(
    "UPDATE order_booking SET synced = 1 WHERE booking_id = ?",
    [bookingId]
  );
  await db.runAsync(
    "UPDATE order_booking_line SET synced = 1 WHERE booking_id = ?",
    [bookingId]
  );
};

// Check if a booking is synced
export const checkOrderSynced = async (bookingId) => {
  const db = DB();
  try {
    const rows = await db.getAllAsync(
      `SELECT synced FROM order_booking WHERE booking_id = ?`,
      [bookingId]
    );
    if (rows.length === 0) return false;
    return rows[0].synced === 1; // 1 = synced
  } catch (err) {
    console.error("Failed to check if order is synced:", err);
    return false;
  }
};



// ==================== QR CONFIG HELPERS ====================

export const getSavedQR = async () => {
  const db = DB();
  const row = await db.getFirstAsync(`
    SELECT qr_code FROM app_config LIMIT 1
    `);

  return row?.qr_code || null;
};



// ==================== Login Status Async Storage Funtions ====================

export const setLoginStatus = async (status) => {
  await AsyncStorage.setItem("logged_in", status ? "true" : "false");
};

export const getLoginStatus = async () => {
  const status = await AsyncStorage.getItem("logged_in");
  return status === "true";
};

export const resetLogin = async () => {
  await AsyncStorage.setItem("logged_in", "false");
  await AsyncStorage.setItem("qr_scanned", "false");
  await AsyncStorage.removeItem("user_name");
};





// Get unsynced attachments
export const getPendingAttachments = async () => {
  const db = getDB();
  return await db.getAllAsync(`SELECT * FROM customerReceipts WHERE attachment IS NOT NULL AND synced=0`);
};

// Mark attachment as synced
export const markAttachmentSynced = async (id, url) => {
  const db = getDB();
  await db.runAsync(
    `UPDATE customerReceipts SET attachment=?, synced=1 WHERE id=?`,
    [url, id]
  );
};

export default DB;













// Updated the Synced data functions to mark individual records as synced

// src/db/database.js
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { v4 as uuidv4 } from "uuid";
// import { getDB, openUserDB, getCurrentUserId } from "./dbManager";

// /* ---------- Helper to return active DB instance ---------- */
// const DB = () => getDB();



// /* ---------------------- CLEAR USER DATA (current DB) ---------------------- */
// /**
//  * Clears only the currently opened DB (i.e., current user's local data).
//  * This does NOT delete other users' DB files.
//  */
// export const clearUserData = async () => {
//   const db = DB();
//   await db.execAsync("DELETE FROM customer");
//   await db.execAsync("DELETE FROM items");
//   await db.execAsync("DELETE FROM order_booking");
//   await db.execAsync("DELETE FROM order_booking_line");
//   await db.execAsync("DELETE FROM activity_log");
//   await db.execAsync("DELETE FROM customerReceipts");
//   await db.execAsync("DELETE FROM recent_activity");

//   // remove per-user AsyncStorage keys if any
//   await AsyncStorage.multiRemove(["qr_scanned", "user_name"]);

//   console.log("Cleared current user data (current DB).");
// };


// // ---------------------- QR CONFIG HELPERS ----------------------
// // ✅ Save QR config into SQLite
// export const saveQRConfig = async (data) => {
//   const db = DB();
//   const entity = data?.entity || {};
//   const qr = data?.qr_payload || {};

//   await db.runAsync(
//     `INSERT OR REPLACE INTO app_config 
//      (id, entity_id, name, email, baseUrl, check_connection_url, sync_url, signature, generated_at)
//      VALUES ('config', ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       entity.entity_id || null,
//       entity.name || null,
//       entity.email || null,
//       qr.baseUrl || null,
//       qr.check_connection_url || null,
//       qr.sync_url || null,
//       qr.signature || null,
//       qr.generated_at || null,
//     ]
//   );
// };



// // ---------------------- CUSTOMER FUNCTIONS ----------------------
// export const getAllCustomers = async () => {
//   const db = DB();
//   return await db.getAllAsync("SELECT * FROM customer ORDER BY entity_id DESC");
// };

// export const searchCustomers = async (query) => {
//   const db = DB();
//   return await db.getAllAsync(
//     "SELECT * FROM customer WHERE name LIKE ? ORDER BY entity_id DESC",
//     [`%${query}%`]
//   );
// };

// export const updateVisited = async (id, visited) => {
//   const db = DB();
//   const status = visited ? "Yes" : "No";
//   await db.runAsync(
//     "UPDATE customer SET visited = ? WHERE entity_id = ?",
//     [status, id]
//   );
// };

// // UPSERT customer from API, but keep existing visited/last_seen
// export const upsertCustomer = async (customer) => {
//   const db = DB();
//   await db.runAsync(`
//     INSERT OR IGNORE INTO customer 
//       (entity_id, name, phone, last_seen, visited, latitude, longitude, location_status)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       customer.entity_id,
//       customer.name,
//       customer.phone || "",
//       customer.last_seen || null,   // will be null only for new customers
//       customer.visited || "Unvisited",
//       customer.latitude || null,
//       customer.longitude || null,
//       customer.location_status || "Not Updated"
//     ]
//   );

//   // Always update name/phone from API, but keep visited/last_seen intact
//   await db.runAsync(`
//     UPDATE customer
//     SET name = ?, phone = ?
//     WHERE entity_id = ?`,
//     [customer.name, customer.phone || "", customer.entity_id]
//   );
// };


// // ---------------------- ITEM FUNCTIONS ----------------------
// export const getAllItems = async () => {
//   const db = DB();
//   return await db.getAllAsync("SELECT * FROM items ORDER BY name ASC");
// };

// export const getItems = async (query = "") => {
//   const db = DB();
//   return await db.getAllAsync(
//     "SELECT * FROM items WHERE name LIKE ? ORDER BY name ASC",
//     [`%${query}%`]
//   );
// };

// export const addItem = async (name, price, image, stock = 0) => {
//   const db = DB();
//   const id = uuidv4();
//   await db.runAsync(
//     "INSERT INTO items (id, name, price, image, stock) VALUES (?, ?, ?, ?, ?)",
//     [id, name, price, image, stock]
//   );
//   return id;
// };

// // UPSERT item from API
// export const upsertItem = async (item) => {
//   const db = DB();
//   await db.runAsync(
//     `INSERT OR REPLACE INTO items 
//       (id, name, price, type, image, stock)
//      VALUES (?, ?, ?, ?, ?, ?)`,
//     [
//       item.item_id,
//       item.name,
//       item.retail_price || 0,
//       item.item_type || "",
//       item.image_path || "",
//       item.item_balance || 0,
//     ]
//   );
// };

// // ---------------------- ORDER BOOKING FUNCTIONS ----------------------
// const getCurrentDateTime = () => {
//   const now = new Date();
//   const yyyy = now.getFullYear();
//   const mm = String(now.getMonth() + 1).padStart(2, "0");
//   const dd = String(now.getDate()).padStart(2, "0");
//   const hh = String(now.getHours()).padStart(2, "0");
//   const min = String(now.getMinutes()).padStart(2, "0");
//   const ss = String(now.getSeconds()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
// };

// export const addOrderBooking = async (order) => {
//   const db = DB();
//   const bookingId = uuidv4();
//   await db.runAsync(
//     `INSERT INTO order_booking (booking_id, order_date, customer_id, order_no, created_by_id, created_date)
//      VALUES (?, ?, ?, ?, ?, ?)`,
//     [
//       bookingId,
//       order.order_date,
//       order.customer_id,
//       order.order_no,
//       order.created_by_id,
//       order.created_date,
//     ]
//   );

//   const now = getCurrentDateTime();
//   const today = now.split(" ")[0];

//   await db.runAsync(
//     "UPDATE customer SET visited = 'Visited', last_seen = ? WHERE entity_id = ?",
//     [now, order.customer_id]
//   );

//   const existing = await db.getFirstAsync(
//     "SELECT id FROM activity_log WHERE customer_id = ? AND date = ?",
//     [order.customer_id, today]
//   );

//   if (!existing) {
//   // Ensure customer_name is not null
//   let customerName = order.customer_name;

//   // If not provided in order, fetch from customer table
//   if (!customerName) {
//     const customer = await db.getFirstAsync(
//       "SELECT name FROM customer WHERE entity_id = ?",
//       [order.customer_id]
//     );
//     customerName = customer?.name || "Unknown Customer";
//   }

//   await db.runAsync(
//     `INSERT INTO activity_log 
//       (id, customer_id, customer_name, date, status)
//      VALUES (?, ?, ?, ?, ?)`,
//     [uuidv4(), order.customer_id, customerName, today, "Visited"]
//   );
// }

//   else {
//     await db.runAsync(
//       "UPDATE activity_log SET status = 'Visited' WHERE customer_id = ? AND date = ?",
//       [order.customer_id, today]
//     );
//   }

//   return bookingId;
// };

// export const addOrderBookingLine = async (line) => {
//   const db = DB();
//   const lineId = uuidv4();
//   await db.execAsync("BEGIN TRANSACTION;");
//   try {
//     await db.runAsync(
//       `INSERT INTO order_booking_line (line_id, booking_id, item_id, order_qty, unit_price, amount)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [
//         lineId,
//         line.booking_id,
//         line.item_id,
//         line.order_qty,
//         line.unit_price,
//         line.amount,
//       ]
//     );
//     await db.execAsync("COMMIT;");
//   } catch (error) {
//     console.error("Error inserting order line:", error);
//     await db.execAsync("ROLLBACK;");
//     throw error;
//   }
// };





// // ---------------------- DAILY ACTIVITY LOG FUNCTIONS ----------------------


// // Initialize activity log for all customers today
// export const initDailyActivityLog = async () => {
//   const db = DB();
//   const today = new Date().toISOString().split("T")[0];
//   const allCustomers = await getAllCustomers();

//   // Filter customers with valid entity_id
//   const customers = allCustomers.filter(c => c.entity_id != null);

//   for (let customer of customers) {
//     try {
//       const exists = await db.getAllAsync(
//         "SELECT * FROM activity_log WHERE customer_id = ? AND date = ?",
//         [customer.entity_id, today]
//       );

//       if (exists.length === 0) {
//         await db.runAsync(
//           "INSERT INTO activity_log (id, customer_id, customer_name, date, status) VALUES (?, ?, ?, ?, ?)",
//           [uuidv4(), customer.entity_id, customer.name, today, "Unvisited"]
//         );
//       }
//     } catch (err) {
//       console.error(`Failed to insert activity log for ${customer.name}:`, err);
//     }
//   }
// };


// // Auto reset customer visited status once per day
// export const autoResetDailyVisitStatus = async () => {
//   const db = DB();
//   const today = new Date().toISOString().split("T")[0];

//   // Get last reset date
//   const row = await db.getFirstAsync(
//     "SELECT last_reset_date FROM app_settings WHERE id = 1"
//   );

//   if (!row) {
//     // First time app runs → insert today's date
//     await db.runAsync(
//       "INSERT INTO app_settings (id, last_reset_date) VALUES (1, ?)",
//       [today]
//     );

//     await initDailyActivityLog();
//     return;
//   }

//   // If today is different → new day → reset
//   if (row.last_reset_date !== today) {
//     console.log("New day detected → resetting visit status");

//     // Reset all customers to unvisited
//     await db.runAsync("UPDATE customer SET visited = 'Unvisited'");

//     // Create new daily activity log for today
//     await initDailyActivityLog();

//     // Update settings table
//     await db.runAsync(
//       "UPDATE app_settings SET last_reset_date = ? WHERE id = 1",
//       [today]
//     );
//   }
// };


// // Mark customer as visited (updates both customer table and activity log)
// export const markCustomerVisited = async (customer_id) => {
//   const db = DB();
//   const today = new Date().toISOString().split("T")[0];
//   await db.runAsync(
//     "UPDATE customer SET visited = 'Visited' WHERE entity_id = ?",
//     [customer_id]
//   );
//   await db.runAsync(
//     "UPDATE activity_log SET status = 'Visited' WHERE customer_id = ? AND date = ?",
//     [customer_id, today]
//   );
// };

// // // Optional: reset all customers to 'Unvisited' at the start of a new day
// // export const resetDailyCustomerStatus = async () => {
// //   await db.runAsync("UPDATE customer SET visited = 'Unvisited'");
// //   await initDailyActivityLog();
// // };

// // Get activity log for today
// export const getTodayActivityLog = async () => {
//   const db = DB();
//   const today = new Date().toISOString().split("T")[0];
//   return await db.getAllAsync(
//     "SELECT * FROM activity_log WHERE date = ? ORDER BY customer_name ASC",
//     [today]
//   );
// };


// // Update last_seen for a customer
// export const updateCustomerLastSeen = async (customer_id, last_seen) => {
//   const db = DB();
//   await db.runAsync(
//     "UPDATE customer SET last_seen = ? WHERE entity_id = ?",
//     [last_seen, customer_id]
//   );
// };

// // ---------------------- ORDER FETCHING FUNCTIONS ----------------------


// // Fetch all orders summary
// export const getAllOrders = async () => {
//   const db = DB();
//   return await db.getAllAsync(`
//     SELECT 
//       ob.booking_id, 
//       ob.order_no, 
//       ob.order_date, 
//       c.name AS customer_name,
//       COUNT(obl.line_id) AS item_count,
//       SUM(obl.amount) AS total_amount
//     FROM order_booking ob
//     LEFT JOIN customer c ON ob.customer_id = c.entity_id
//     LEFT JOIN order_booking_line obl ON ob.booking_id = obl.booking_id
//     GROUP BY ob.booking_id
//     ORDER BY ob.order_date DESC;
//   `);
// };

// // Fetch single order details
// export const getOrderDetails = async (bookingId) => {
//   const db = DB();
//   return await db.getAllAsync(
//     `
//     SELECT 
//       obl.line_id, 
//       i.name AS item_name, 
//       obl.order_qty, 
//       obl.unit_price, 
//       obl.amount
//     FROM order_booking_line obl
//     JOIN items i ON obl.item_id = i.id
//     WHERE obl.booking_id = ?
//     `,
//     [bookingId]
//   );
// };

// // ---------------------- ORDER BOOKING LINE HELPERS ----------------------

// // Get existing order line by booking and item
// export const getOrderLineByBookingAndItem = async (bookingId, itemId) => {
//   const db = DB();
//   return await db.getAllAsync(
//     `SELECT * FROM order_booking_line WHERE booking_id = ? AND item_id = ?`,
//     [bookingId, itemId]
//   );
// };

// // Update an existing order line
// export const updateOrderBookingLine = async (lineId, data) => {
//   const db = DB();
//   try {
//     await db.runAsync(
//       `UPDATE order_booking_line 
//        SET order_qty = ?, amount = ? 
//        WHERE line_id = ?`,
//       [data.order_qty, data.amount, lineId]
//     );
//   } catch (error) {
//     console.error("Failed to update order line:", error);
//     throw error;
//   }
// };

// // ---------------------- DELETE ORDER LINE ----------------------
// export const deleteOrderBookingLine = async (lineId) => {
//   const db = DB();
//   try {
//     await db.runAsync(
//       "DELETE FROM order_booking_line WHERE line_id = ?",
//       [lineId]
//     );
//   } catch (error) {
//     console.error("Failed to delete order line:", error);
//     throw error;
//   }
// };


// // Update order booking line
// export const updateOrderBookingLineDetails = async ({
//   booking_line_id,
//   order_qty,
//   amount,
// }) => {
//   const db = DB();
//   try {
//     await db.runAsync(
//       `UPDATE order_booking_line 
//        SET order_qty = ?, amount = ? 
//        WHERE line_id = ?`,
//       [order_qty, amount, booking_line_id]
//     );
//   } catch (error) {
//     console.error("Failed to update order line:", error);
//     throw error;
//   }
// };



// // ---------------------- CUSTOMER LOCATION UPDATE ----------------------

// // Update latitude and longitude for a customer
// export const updateCustomerLocation = async (customer_id, latitude, longitude) => {
//   const db = DB();
//   try {
//     await db.runAsync(
//       `UPDATE customer 
//        SET latitude = ?, longitude = ? 
//        WHERE entity_id = ?`,
//       [latitude, longitude, customer_id]
//     );
//     console.log(`Customer ${customer_id} location updated.`);
//   } catch (error) {
//     console.error("Error updating customer location:", error);
//   }
// };

// // Update location, last_seen, and location_status
// export const updateCustomerLocationWithLastSeen = async (customer_id, latitude, longitude, status) => {
//   const db = DB();
//   const last_seen = new Date().toISOString();
//   try {
//     await db.runAsync(
//       `UPDATE customer 
//        SET latitude = ?, longitude = ?, location_status = ? 
//        WHERE entity_id = ?`,
//       [latitude, longitude, status, customer_id]
//     );
//     console.log(`Customer ${customer_id} location, last_seen, and status updated.`);
//   } catch (error) {
//     console.error("Error updating customer location, last_seen, and status:", error);
//   }
// };


// // ---------------------- CUSTOMER RECEIPTS ----------------------

// // Add new customer receipt
// export const addCustomerReceipt = async ({ customer_id, cash_bank_id, amount, note, attachment }) => {
//   const db = DB();
//   const id = uuidv4();
//   return await db.runAsync(
//     `INSERT INTO customerReceipts (id, customer_id, cash_bank_id, amount, note, attachment)
//      VALUES (?, ?, ?, ?, ?, ?)`,
//     [id, customer_id, cash_bank_id, amount, note, attachment]
//   );
//   return id;
// };

// // Update existing customer receipt
// export const updateCustomerReceipt = async (data) => {
//   const db = DB();
//   await db.runAsync(
//     `
//     UPDATE customerReceipts
//     SET 
//       customer_id = ?, 
//       cash_bank_id = ?, 
//       amount = ?, 
//       note = ?, 
//       attachment = ?,
//       created_at = (datetime('now', 'localtime'))   -- 🔥 update timestamp on edit
//     WHERE id = ?
//     `,
//     [
//       data.customer_id,
//       data.cash_bank_id,
//       data.amount,
//       data.note,
//       data.attachment,
//       data.id,
//     ]
//   );
// };



// export const getAllCustomerReceipts = async () => {
//   const db = DB();
//   return await db.getAllAsync(`
//     SELECT cr.id, cr.customer_id, cr.cash_bank_id, cr.amount, cr.note, cr.attachment, cr.created_at,
//            c.name AS customerName
//     FROM customerReceipts cr
//     LEFT JOIN customer c ON cr.customer_id = c.entity_id
//     ORDER BY cr.created_at DESC
//   `, []);
// };



// // Fetch orders for a specific customer with summary info
// export const getOrdersByCustomer = async (customerId) => {
//   const db = DB();
//   return await db.getAllAsync(`
//     SELECT 
//       ob.booking_id, 
//       ob.order_no, 
//       ob.order_date, 
//       c.name AS customer_name,
//       COUNT(obl.line_id) AS item_count,
//       SUM(obl.amount) AS total_amount
//     FROM order_booking ob
//     LEFT JOIN customer c ON ob.customer_id = c.entity_id
//     LEFT JOIN order_booking_line obl ON ob.booking_id = obl.booking_id
//     WHERE ob.customer_id = ?
//     GROUP BY ob.booking_id
//     ORDER BY ob.booking_id DESC;
//   `, [customerId]);
// };


// export const getTodaysSales = async () => {
//   const db = DB();
//   const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

//   const result = await db.getFirstAsync(
//     `SELECT SUM(amount) AS total FROM order_booking_line WHERE DATE(created_at) = ?`,
//     [today]
//   );

//   return result?.total || 0;
// };


// export const getLastMonthSales = async () => {
//   const db = DB();
//   const now = new Date();
//   const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//   const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

//   const start = lastMonth.toISOString().split("T")[0];
//   const end = lastMonthEnd.toISOString().split("T")[0];

//   const result = await db.getFirstAsync(
//     `SELECT SUM(amount) AS total FROM order_booking_line 
//      WHERE DATE(created_at) BETWEEN ? AND ?`,
//     [start, end]
//   );

//   return result?.total || 0;
// };




// // ---------------------- RECENT ACTIVITY ----------------------

// export const initRecentActivityTable = async () => {
//   const db = DB();
//   // try {
//   //   await db.execAsync(`
//   //     CREATE TABLE IF NOT EXISTS recent_activity (
//   //       id TEXT PRIMARY KEY,
//   //       booking_id TEXT,
//   //       customer_name TEXT,
//   //       item_count INTEGER,
//   //       total_amount REAL,
//   //       activity_date TEXT
//   //     )
//   //   `);
//   //   console.log("Recent activity table initialized.");
//   // } catch (error) {
//   //   console.error("Error creating recent_activity table:", error);
//   // }
// };

// export const addRecentActivity = async ({
//   booking_id,
//   customer_name,
//   item_count,
//   total_amount,
// }) => {
//   const db = DB();
//   const id = uuidv4();
//   const date = new Date().toISOString();
//  try {
//     await db.runAsync(
//       `INSERT INTO recent_activity (id, booking_id, customer_name, item_count, total_amount, activity_date)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [id, booking_id, customer_name, item_count, total_amount, date]
//     );
//   } catch (error) {
//     console.error("Failed to add recent activity:", error);
//     throw error;
//   }
// };


// // Get all recent activities (latest first)
// export const getRecentActivities = async () => {
//   const db = DB();
//   return await db.getAllAsync(`
//     SELECT * FROM recent_activity
//     ORDER BY activity_date DESC
//   `);
// };



// // ---------------------- SYNC HELPER FUNCTIONS ----------------------

// // Helper to ensure UUID
// const ensureUUID = (record, key) => {
//   if (!record[key]) record[key] = uuidv4();
//   return record;
// };

// // Get all customers (used in incremental sync)
// export const getAllCustomersForSync = async () => {
//   const db = DB();
//   const rows = await db.getAllAsync(`
//     SELECT entity_id, name, phone, last_seen, visited, latitude, longitude, location_status
//     FROM customer
//     ORDER BY entity_id ASC
//   `);

//   // Ensure UUIDs and remove duplicates by entity_id
//   const deduped = Object.values(
//     rows.reduce((acc, c) => {
//       c = ensureUUID(c, "entity_id");
//       acc[c.entity_id] = c;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// // Get all items (used in incremental sync)
// export const getAllItemsForSync = async () => {
//   const db = DB();
//   const rows = await db.getAllAsync(`
//     SELECT id, name, price, type, image, stock
//     FROM items
//     ORDER BY id ASC
//   `);

//   const deduped = Object.values(
//     rows.reduce((acc, i) => {
//       i = ensureUUID(i, "id");
//       acc[i.id] = i;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// // Get all order bookings (used in incremental sync)
// export const getAllOrderBookings = async () => {
//   const db = DB();
//   const rows = await db.getAllAsync(`
//     SELECT booking_id, order_date, customer_id, order_no, created_by_id, created_date
//     FROM order_booking
//     ORDER BY booking_id ASC
//   `);

//   const deduped = Object.values(
//     rows.reduce((acc, b) => {
//       b = ensureUUID(b, "booking_id");
//       acc[b.booking_id] = b;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// // Get all order booking lines (used in incremental sync)
// export const getAllOrderBookingLines = async () => {
//   const db = DB();
//   const rows = await db.getAllAsync(`
//     SELECT line_id, booking_id, item_id, order_qty, unit_price, amount, created_at
//     FROM order_booking_line
//     ORDER BY line_id ASC
//   `);

//   const deduped = Object.values(
//     rows.reduce((acc, l) => {
//       l = ensureUUID(l, "line_id");
//       acc[l.line_id] = l;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// // Get all customer receipts for incremental sync
// export const getAllCustomerReceiptsForSync = async () => {
//   const db = DB();
//   const rows = await db.getAllAsync(`
//     SELECT id, customer_id, cash_bank_id, amount, note, attachment, created_at
//     FROM customerReceipts
//     ORDER BY id ASC
//   `);

//   const deduped = Object.values(
//     rows.reduce((acc, r) => {
//       r = ensureUUID(r, "id");
//       acc[r.id] = r;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };



// // ---------------------- QR CONFIG HELPERS ----------------------

// export const getSavedQR = async () => {
//   const db = DB();
//   const row = await db.getFirstAsync(`
//     SELECT qr_code FROM app_config LIMIT 1
//     `);

//   return row?.qr_code || null;
// };




// export const setLoginStatus = async (status) => {
//   await AsyncStorage.setItem("logged_in", status ? "true" : "false");
// };

// export const getLoginStatus = async () => {
//   const status = await AsyncStorage.getItem("logged_in");
//   return status === "true";
// };

// export const resetLogin = async () => {
//   await AsyncStorage.setItem("logged_in", "false");
//   await AsyncStorage.setItem("qr_scanned", "false");
//   await AsyncStorage.removeItem("user_name");
// };




// export default DB;



// Multiple Users Support - OLD CODE

// import * as SQLite from "expo-sqlite";
// import 'react-native-get-random-values';
// import { v4 as uuidv4 } from 'uuid';

// // Open persistent database
// const db = SQLite.openDatabaseSync("axonerp.db");

// // ---------------------- INITIALIZATION ----------------------
// export const initDB = async () => {

//   // App Config table
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS app_config (
//       id TEXT PRIMARY KEY DEFAULT 'config',
//       entity_id TEXT,
//       name TEXT,
//       email TEXT,
//       baseUrl TEXT,
//       check_connection_url TEXT,
//       sync_url TEXT,
//       signature TEXT,
//       generated_at TEXT
//     );
//   `);

//   // Customer Table
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS customer (
//       entity_id INTEGER UNIQUE,
//       name TEXT NOT NULL,
//       phone TEXT,
//       last_seen TEXT,
//       visited TEXT DEFAULT 'Unvisited',
//       latitude REAL,
//       longitude REAL,
//       location_status TEXT DEFAULT 'Not Updated'
//     );
//   `);

//   // Items Table
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS items (
//       id TEXT PRIMARY KEY,
//       name TEXT NOT NULL,
//       price REAL NOT NULL,
//       type TEXT DEFAULT '',
//       image TEXT DEFAULT '',
//       stock INTEGER NOT NULL DEFAULT 0
//     );
//   `);

//   // Order Booking
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS order_booking (
//       booking_id TEXT PRIMARY KEY,
//       order_date TEXT NOT NULL,
//       customer_id INTEGER NOT NULL,
//       order_no TEXT NOT NULL,
//       created_by_id TEXT,
//       created_date TEXT,
//       FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
//     );
//   `);

//   // Order Booking Line
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS order_booking_line (
//       line_id TEXT PRIMARY KEY,
//       booking_id TEXT NOT NULL,
//       item_id TEXT NOT NULL,
//       order_qty INTEGER NOT NULL,
//       unit_price REAL NOT NULL,
//       amount REAL NOT NULL,
//       created_at TEXT DEFAULT (datetime('now')),
//       FOREIGN KEY (booking_id) REFERENCES order_booking(booking_id),
//       FOREIGN KEY (item_id) REFERENCES items(id)
//     );
//   `);

//   // Activity Log Table
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS activity_log (
//       id TEXT PRIMARY KEY,
//       customer_id INTEGER NOT NULL,
//       customer_name TEXT NOT NULL,
//       date TEXT NOT NULL,
//       status TEXT DEFAULT 'Unvisited',
//       FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
//     );
//   `);

//   // App Settings table
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS app_settings (
//       id INTEGER PRIMARY KEY,
//       last_reset_date TEXT
//     );
//   `);

//   // Customer Receipts
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS customerReceipts (
//       id TEXT PRIMARY KEY,
//       customer_id INTEGER NOT NULL,
//       cash_bank_id TEXT NOT NULL,
//       amount REAL NOT NULL,
//       note TEXT,
//       attachment TEXT,
//       created_at TEXT DEFAULT (datetime('now', 'localtime')),
//       FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
//     );
//   `);
// };

// // ---------------------- CUSTOMER FUNCTIONS ----------------------
// export const getAllCustomers = async () => {
//   return await db.getAllAsync("SELECT * FROM customer ORDER BY entity_id DESC");
// };

// export const searchCustomers = async (query) => {
//   return await db.getAllAsync(
//     "SELECT * FROM customer WHERE name LIKE ? ORDER BY entity_id DESC",
//     [`%${query}%`]
//   );
// };

// export const updateVisited = async (id, visited) => {
//   const status = visited ? "Yes" : "No";
//   await db.runAsync(
//     "UPDATE customer SET visited = ? WHERE entity_id = ?",
//     [status, id]
//   );
// };

// // UPSERT customer from API, but keep existing visited/last_seen
// export const upsertCustomer = async (customer) => {
//   await db.runAsync(`
//     INSERT OR IGNORE INTO customer 
//       (entity_id, name, phone, last_seen, visited, latitude, longitude, location_status)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       customer.entity_id,
//       customer.name,
//       customer.phone || "",
//       customer.last_seen || null,   // will be null only for new customers
//       customer.visited || "Unvisited",
//       customer.latitude || null,
//       customer.longitude || null,
//       customer.location_status || "Not Updated"
//     ]
//   );

//   // Always update name/phone from API, but keep visited/last_seen intact
//   await db.runAsync(`
//     UPDATE customer
//     SET name = ?, phone = ?
//     WHERE entity_id = ?`,
//     [customer.name, customer.phone || "", customer.entity_id]
//   );
// };


// // ---------------------- ITEM FUNCTIONS ----------------------
// export const getAllItems = async () => {
//   return await db.getAllAsync("SELECT * FROM items ORDER BY name ASC");
// };

// export const getItems = async (query = "") => {
//   return await db.getAllAsync(
//     "SELECT * FROM items WHERE name LIKE ? ORDER BY name ASC",
//     [`%${query}%`]
//   );
// };

// export const addItem = async (name, price, image, stock = 0) => {
//   const id = uuidv4();
//   await db.runAsync(
//     "INSERT INTO items (id, name, price, image, stock) VALUES (?, ?, ?, ?, ?)",
//     [id, name, price, image, stock]
//   );
//   return id;
// };

// // UPSERT item from API
// export const upsertItem = async (item) => {
//   await db.runAsync(
//     `INSERT OR REPLACE INTO items 
//       (id, name, price, type, image, stock)
//      VALUES (?, ?, ?, ?, ?, ?)`,
//     [
//       item.item_id,
//       item.name,
//       item.retail_price || 0,
//       item.item_type || "",
//       item.image_path || "",
//       item.item_balance || 0,
//     ]
//   );
// };

// // ---------------------- ORDER BOOKING FUNCTIONS ----------------------
// const getCurrentDateTime = () => {
//   const now = new Date();
//   const yyyy = now.getFullYear();
//   const mm = String(now.getMonth() + 1).padStart(2, "0");
//   const dd = String(now.getDate()).padStart(2, "0");
//   const hh = String(now.getHours()).padStart(2, "0");
//   const min = String(now.getMinutes()).padStart(2, "0");
//   const ss = String(now.getSeconds()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
// };

// export const addOrderBooking = async (order) => {
//   const bookingId = uuidv4();
//   await db.runAsync(
//     `INSERT INTO order_booking (booking_id, order_date, customer_id, order_no, created_by_id, created_date)
//      VALUES (?, ?, ?, ?, ?, ?)`,
//     [
//       bookingId,
//       order.order_date,
//       order.customer_id,
//       order.order_no,
//       order.created_by_id,
//       order.created_date,
//     ]
//   );

//   const now = getCurrentDateTime();
//   const today = now.split(" ")[0];

//   await db.runAsync(
//     "UPDATE customer SET visited = 'Visited', last_seen = ? WHERE entity_id = ?",
//     [now, order.customer_id]
//   );

//   const existing = await db.getFirstAsync(
//     "SELECT id FROM activity_log WHERE customer_id = ? AND date = ?",
//     [order.customer_id, today]
//   );

//   if (!existing) {
//   // Ensure customer_name is not null
//   let customerName = order.customer_name;

//   // If not provided in order, fetch from customer table
//   if (!customerName) {
//     const customer = await db.getFirstAsync(
//       "SELECT name FROM customer WHERE entity_id = ?",
//       [order.customer_id]
//     );
//     customerName = customer?.name || "Unknown Customer";
//   }

//   await db.runAsync(
//     `INSERT INTO activity_log 
//       (id, customer_id, customer_name, date, status)
//      VALUES (?, ?, ?, ?, ?)`,
//     [uuidv4(), order.customer_id, customerName, today, "Visited"]
//   );
// }

//   else {
//     await db.runAsync(
//       "UPDATE activity_log SET status = 'Visited' WHERE customer_id = ? AND date = ?",
//       [order.customer_id, today]
//     );
//   }

//   return bookingId;
// };

// export const addOrderBookingLine = async (line) => {
//   const lineId = uuidv4();
//   await db.execAsync("BEGIN TRANSACTION;");
//   try {
//     await db.runAsync(
//       `INSERT INTO order_booking_line (line_id, booking_id, item_id, order_qty, unit_price, amount)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [
//         lineId,
//         line.booking_id,
//         line.item_id,
//         line.order_qty,
//         line.unit_price,
//         line.amount,
//       ]
//     );
//     await db.execAsync("COMMIT;");
//   } catch (error) {
//     console.error("Error inserting order line:", error);
//     await db.execAsync("ROLLBACK;");
//     throw error;
//   }
// };





// // ---------------------- DAILY ACTIVITY LOG FUNCTIONS ----------------------


// // Initialize activity log for all customers today
// export const initDailyActivityLog = async () => {
//   const today = new Date().toISOString().split("T")[0];
//   const allCustomers = await getAllCustomers();

//   // Filter customers with valid entity_id
//   const customers = allCustomers.filter(c => c.entity_id != null);

//   for (let customer of customers) {
//     try {
//       const exists = await db.getAllAsync(
//         "SELECT * FROM activity_log WHERE customer_id = ? AND date = ?",
//         [customer.entity_id, today]
//       );

//       if (exists.length === 0) {
//         await db.runAsync(
//           "INSERT INTO activity_log (id, customer_id, customer_name, date, status) VALUES (?, ?, ?, ?, ?)",
//           [uuidv4(), customer.entity_id, customer.name, today, "Unvisited"]
//         );
//       }
//     } catch (err) {
//       console.error(`Failed to insert activity log for ${customer.name}:`, err);
//     }
//   }
// };


// // Auto reset customer visited status once per day
// export const autoResetDailyVisitStatus = async () => {
//   const today = new Date().toISOString().split("T")[0];

//   // Get last reset date
//   const row = await db.getFirstAsync(
//     "SELECT last_reset_date FROM app_settings WHERE id = 1"
//   );

//   if (!row) {
//     // First time app runs → insert today's date
//     await db.runAsync(
//       "INSERT INTO app_settings (id, last_reset_date) VALUES (1, ?)",
//       [today]
//     );

//     await initDailyActivityLog();
//     return;
//   }

//   // If today is different → new day → reset
//   if (row.last_reset_date !== today) {
//     console.log("New day detected → resetting visit status");

//     // Reset all customers to unvisited
//     await db.runAsync("UPDATE customer SET visited = 'Unvisited'");

//     // Create new daily activity log for today
//     await initDailyActivityLog();

//     // Update settings table
//     await db.runAsync(
//       "UPDATE app_settings SET last_reset_date = ? WHERE id = 1",
//       [today]
//     );
//   }
// };


// // Mark customer as visited (updates both customer table and activity log)
// export const markCustomerVisited = async (customer_id) => {
//   const today = new Date().toISOString().split("T")[0];
//   await db.runAsync(
//     "UPDATE customer SET visited = 'Visited' WHERE entity_id = ?",
//     [customer_id]
//   );
//   await db.runAsync(
//     "UPDATE activity_log SET status = 'Visited' WHERE customer_id = ? AND date = ?",
//     [customer_id, today]
//   );
// };

// // // Optional: reset all customers to 'Unvisited' at the start of a new day
// // export const resetDailyCustomerStatus = async () => {
// //   await db.runAsync("UPDATE customer SET visited = 'Unvisited'");
// //   await initDailyActivityLog();
// // };

// // Get activity log for today
// export const getTodayActivityLog = async () => {
//   const today = new Date().toISOString().split("T")[0];
//   return await db.getAllAsync(
//     "SELECT * FROM activity_log WHERE date = ? ORDER BY customer_name ASC",
//     [today]
//   );
// };


// // Update last_seen for a customer
// export const updateCustomerLastSeen = async (customer_id, last_seen) => {
//   await db.runAsync(
//     "UPDATE customer SET last_seen = ? WHERE entity_id = ?",
//     [last_seen, customer_id]
//   );
// };

// // ---------------------- ORDER FETCHING FUNCTIONS ----------------------


// // Fetch all orders summary
// export const getAllOrders = async () => {
//   return await db.getAllAsync(`
//     SELECT 
//       ob.booking_id, 
//       ob.order_no, 
//       ob.order_date, 
//       c.name AS customer_name,
//       COUNT(obl.line_id) AS item_count,
//       SUM(obl.amount) AS total_amount
//     FROM order_booking ob
//     LEFT JOIN customer c ON ob.customer_id = c.entity_id
//     LEFT JOIN order_booking_line obl ON ob.booking_id = obl.booking_id
//     GROUP BY ob.booking_id
//     ORDER BY ob.order_date DESC;
//   `);
// };

// // Fetch single order details
// export const getOrderDetails = async (bookingId) => {
//   return await db.getAllAsync(
//     `
//     SELECT 
//       obl.line_id, 
//       i.name AS item_name, 
//       obl.order_qty, 
//       obl.unit_price, 
//       obl.amount
//     FROM order_booking_line obl
//     JOIN items i ON obl.item_id = i.id
//     WHERE obl.booking_id = ?
//     `,
//     [bookingId]
//   );
// };

// // ---------------------- ORDER BOOKING LINE HELPERS ----------------------

// // Get existing order line by booking and item
// export const getOrderLineByBookingAndItem = async (bookingId, itemId) => {
//   return await db.getAllAsync(
//     `SELECT * FROM order_booking_line WHERE booking_id = ? AND item_id = ?`,
//     [bookingId, itemId]
//   );
// };

// // Update an existing order line
// export const updateOrderBookingLine = async (lineId, data) => {
//   try {
//     await db.runAsync(
//       `UPDATE order_booking_line 
//        SET order_qty = ?, amount = ? 
//        WHERE line_id = ?`,
//       [data.order_qty, data.amount, lineId]
//     );
//   } catch (error) {
//     console.error("Failed to update order line:", error);
//     throw error;
//   }
// };

// // ---------------------- DELETE ORDER LINE ----------------------
// export const deleteOrderBookingLine = async (lineId) => {
//   try {
//     await db.runAsync(
//       "DELETE FROM order_booking_line WHERE line_id = ?",
//       [lineId]
//     );
//   } catch (error) {
//     console.error("Failed to delete order line:", error);
//     throw error;
//   }
// };


// // Update order booking line
// export const updateOrderBookingLineDetails = async ({
//   booking_line_id,
//   order_qty,
//   amount,
// }) => {
//   try {
//     await db.runAsync(
//       `UPDATE order_booking_line 
//        SET order_qty = ?, amount = ? 
//        WHERE line_id = ?`,
//       [order_qty, amount, booking_line_id]
//     );
//   } catch (error) {
//     console.error("Failed to update order line:", error);
//     throw error;
//   }
// };



// // ---------------------- CUSTOMER LOCATION UPDATE ----------------------

// // Update latitude and longitude for a customer
// export const updateCustomerLocation = async (customer_id, latitude, longitude) => {
//   try {
//     await db.runAsync(
//       `UPDATE customer 
//        SET latitude = ?, longitude = ? 
//        WHERE entity_id = ?`,
//       [latitude, longitude, customer_id]
//     );
//     console.log(`Customer ${customer_id} location updated.`);
//   } catch (error) {
//     console.error("Error updating customer location:", error);
//   }
// };

// // Update location, last_seen, and location_status
// export const updateCustomerLocationWithLastSeen = async (customer_id, latitude, longitude, status) => {
//   const last_seen = new Date().toISOString();
//   try {
//     await db.runAsync(
//       `UPDATE customer 
//        SET latitude = ?, longitude = ?, location_status = ? 
//        WHERE entity_id = ?`,
//       [latitude, longitude, status, customer_id]
//     );
//     console.log(`Customer ${customer_id} location, last_seen, and status updated.`);
//   } catch (error) {
//     console.error("Error updating customer location, last_seen, and status:", error);
//   }
// };


// // ---------------------- CUSTOMER RECEIPTS ----------------------

// // Add new customer receipt
// export const addCustomerReceipt = async ({ customer_id, cash_bank_id, amount, note, attachment }) => {
//   const id = uuidv4();
//   return await db.runAsync(
//     `INSERT INTO customerReceipts (id, customer_id, cash_bank_id, amount, note, attachment)
//      VALUES (?, ?, ?, ?, ?, ?)`,
//     [id, customer_id, cash_bank_id, amount, note, attachment]
//   );
//   return id;
// };

// // Update existing customer receipt
// export const updateCustomerReceipt = async (data) => {
//   await db.runAsync(
//     `
//     UPDATE customerReceipts
//     SET 
//       customer_id = ?, 
//       cash_bank_id = ?, 
//       amount = ?, 
//       note = ?, 
//       attachment = ?,
//       created_at = (datetime('now', 'localtime'))   -- 🔥 update timestamp on edit
//     WHERE id = ?
//     `,
//     [
//       data.customer_id,
//       data.cash_bank_id,
//       data.amount,
//       data.note,
//       data.attachment,
//       data.id,
//     ]
//   );
// };



// export const getAllCustomerReceipts = async () => {
//   return await db.getAllAsync(`
//     SELECT cr.id, cr.customer_id, cr.cash_bank_id, cr.amount, cr.note, cr.attachment, cr.created_at,
//            c.name AS customerName
//     FROM customerReceipts cr
//     LEFT JOIN customer c ON cr.customer_id = c.entity_id
//     ORDER BY cr.created_at DESC
//   `, []);
// };



// // Fetch orders for a specific customer with summary info
// export const getOrdersByCustomer = async (customerId) => {
//   return await db.getAllAsync(`
//     SELECT 
//       ob.booking_id, 
//       ob.order_no, 
//       ob.order_date, 
//       c.name AS customer_name,
//       COUNT(obl.line_id) AS item_count,
//       SUM(obl.amount) AS total_amount
//     FROM order_booking ob
//     LEFT JOIN customer c ON ob.customer_id = c.entity_id
//     LEFT JOIN order_booking_line obl ON ob.booking_id = obl.booking_id
//     WHERE ob.customer_id = ?
//     GROUP BY ob.booking_id
//     ORDER BY ob.booking_id DESC;
//   `, [customerId]);
// };


// export const getTodaysSales = async () => {
//   const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

//   const result = await db.getFirstAsync(
//     `SELECT SUM(amount) AS total FROM order_booking_line WHERE DATE(created_at) = ?`,
//     [today]
//   );

//   return result?.total || 0;
// };


// export const getLastMonthSales = async () => {
//   const now = new Date();
//   const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//   const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

//   const start = lastMonth.toISOString().split("T")[0];
//   const end = lastMonthEnd.toISOString().split("T")[0];

//   const result = await db.getFirstAsync(
//     `SELECT SUM(amount) AS total FROM order_booking_line 
//      WHERE DATE(created_at) BETWEEN ? AND ?`,
//     [start, end]
//   );

//   return result?.total || 0;
// };

// // ✅ Save QR config into SQLite
// export const saveQRConfig = async (data) => {
//   const entity = data?.entity || {};
//   const qr = data?.qr_payload || {};

//   await db.runAsync(
//     `INSERT OR REPLACE INTO app_config 
//      (id, entity_id, name, email, baseUrl, check_connection_url, sync_url, signature, generated_at)
//      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       entity.entity_id || null,
//       entity.name || null,
//       entity.email || null,
//       qr.baseUrl || null,
//       qr.check_connection_url || null,
//       qr.sync_url || null,
//       qr.signature || null,
//       qr.generated_at || null,
//     ]
//   );
// };


// // ---------------------- RECENT ACTIVITY ----------------------

// export const initRecentActivityTable = async () => {
//   try {
//     await db.execAsync(`
//       CREATE TABLE IF NOT EXISTS recent_activity (
//         id TEXT PRIMARY KEY,
//         booking_id TEXT,
//         customer_name TEXT,
//         item_count INTEGER,
//         total_amount REAL,
//         activity_date TEXT
//       )
//     `);
//     console.log("Recent activity table initialized.");
//   } catch (error) {
//     console.error("Error creating recent_activity table:", error);
//   }
// };

// export const addRecentActivity = async ({
//   booking_id,
//   customer_name,
//   item_count,
//   total_amount,
// }) => {
//   const id = uuidv4();
//   const date = new Date().toISOString();
//  try {
//     await db.runAsync(
//       `INSERT INTO recent_activity (id, booking_id, customer_name, item_count, total_amount, activity_date)
//        VALUES (?, ?, ?, ?, ?, ?)`,
//       [id, booking_id, customer_name, item_count, total_amount, date]
//     );
//   } catch (error) {
//     console.error("Failed to add recent activity:", error);
//     throw error;
//   }
// };


// // Get all recent activities (latest first)
// export const getRecentActivities = async () => {
//   return await db.getAllAsync(`
//     SELECT * FROM recent_activity
//     ORDER BY activity_date DESC
//   `);
// };



// // ---------------------- SYNC HELPER FUNCTIONS ----------------------

// // Helper to ensure UUID
// const ensureUUID = (record, key) => {
//   if (!record[key]) record[key] = uuidv4();
//   return record;
// };

// // Get all customers (used in incremental sync)
// export const getAllCustomersForSync = async () => {
//   const rows = await db.getAllAsync(`
//     SELECT entity_id, name, phone, last_seen, visited, latitude, longitude, location_status
//     FROM customer
//     ORDER BY entity_id ASC
//   `);

//   // Ensure UUIDs and remove duplicates by entity_id
//   const deduped = Object.values(
//     rows.reduce((acc, c) => {
//       c = ensureUUID(c, "entity_id");
//       acc[c.entity_id] = c;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// // Get all items (used in incremental sync)
// export const getAllItemsForSync = async () => {
//   const rows = await db.getAllAsync(`
//     SELECT id, name, price, type, image, stock
//     FROM items
//     ORDER BY id ASC
//   `);

//   const deduped = Object.values(
//     rows.reduce((acc, i) => {
//       i = ensureUUID(i, "id");
//       acc[i.id] = i;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// // Get all order bookings (used in incremental sync)
// export const getAllOrderBookings = async () => {
//   const rows = await db.getAllAsync(`
//     SELECT booking_id, order_date, customer_id, order_no, created_by_id, created_date
//     FROM order_booking
//     ORDER BY booking_id ASC
//   `);

//   const deduped = Object.values(
//     rows.reduce((acc, b) => {
//       b = ensureUUID(b, "booking_id");
//       acc[b.booking_id] = b;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// // Get all order booking lines (used in incremental sync)
// export const getAllOrderBookingLines = async () => {
//   const rows = await db.getAllAsync(`
//     SELECT line_id, booking_id, item_id, order_qty, unit_price, amount, created_at
//     FROM order_booking_line
//     ORDER BY line_id ASC
//   `);

//   const deduped = Object.values(
//     rows.reduce((acc, l) => {
//       l = ensureUUID(l, "line_id");
//       acc[l.line_id] = l;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// // Get all customer receipts for incremental sync
// export const getAllCustomerReceiptsForSync = async () => {
//   const rows = await db.getAllAsync(`
//     SELECT id, customer_id, cash_bank_id, amount, note, attachment, created_at
//     FROM customerReceipts
//     ORDER BY id ASC
//   `);

//   const deduped = Object.values(
//     rows.reduce((acc, r) => {
//       r = ensureUUID(r, "id");
//       acc[r.id] = r;
//       return acc;
//     }, {})
//   );

//   return deduped;
// };

// export default db;


// // ---------------------- QR CONFIG HELPERS ----------------------

// export const getSavedQR = async () => {
//   const row = await db.getFirstAsync(`
//     SELECT qr_code FROM app_config LIMIT 1
//   `);

//   return row?.qr_code || null;
// };

// // ---------------------- CLEAR USER DATA ----------------------
// export const clearUserData = async (entityId) => {
//   if (!entityId) return;

//   try {
//     // Delete all data related to this customer/entity
//     await db.execAsync(`DELETE FROM customer WHERE entity_id = ?;`, [entityId]);
//     await db.execAsync(`DELETE FROM order_booking WHERE customer_id = ?;`, [entityId]);
//     await db.execAsync(
//       `DELETE FROM order_booking_line WHERE booking_id IN 
//        (SELECT booking_id FROM order_booking WHERE customer_id = ?);`,
//       [entityId]
//     );
//     await db.execAsync(`DELETE FROM activity_log WHERE customer_id = ?;`, [entityId]);
//     await db.execAsync(`DELETE FROM customerReceipts WHERE customer_id = ?;`, [entityId]);

//     // Optional: clear AsyncStorage entries for this user
//     await AsyncStorage.multiRemove(["qr_scanned", "current_user", "user_name", "current_user_id"]);

//     console.log(`All data cleared for entity_id: ${entityId}`);
//   } catch (err) {
//     console.log("Error clearing user data:", err);
//   }
// };






// import AsyncStorage from "@react-native-async-storage/async-storage";

// export const setLoginStatus = async (status) => {
//   await AsyncStorage.setItem("logged_in", status ? "true" : "false");
// };

// export const getLoginStatus = async () => {
//   const status = await AsyncStorage.getItem("logged_in");
//   return status === "true";
// };

// export const resetLogin = async () => {
//   await AsyncStorage.setItem("logged_in", "false");
//   await AsyncStorage.setItem("qr_scanned", "false");
//   await AsyncStorage.removeItem("user_name");
// };