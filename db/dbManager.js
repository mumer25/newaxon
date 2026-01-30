import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

let db = null;
let currentDBKey = null;
let isDBReady = false;

/* ============================================================
   HELPERS
   ============================================================ */

// sanitize baseUrl for filename
const sanitizeBaseUrl = (url = "") =>
  url.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_");


/* ============================================================
   1) OPEN DATABASE (ENTITY + BASEURL)
   ============================================================ */

export const openUserDB = async (entityId, baseUrl) => {
  if (!entityId) throw new Error("openUserDB: entityId is required");
  if (!baseUrl) throw new Error("openUserDB: baseUrl is required");

  const entityStr = String(entityId);
  const sanitizedUrl = sanitizeBaseUrl(baseUrl);

  // 🔐 unique DB per company
  const dbKey = `${entityStr}_${sanitizedUrl}`;
  const dbName = `axonerp_${dbKey}.db`;

  // already opened
   if (db && currentDBKey === dbKey && isDBReady) {
    return db;
  }

   // 🔥 ALWAYS close previous DB first
  await closeUserDB();

  // open DB
  // db = SQLite.openDatabaseAsync(dbName);
  // currentDBKey = dbKey;
    db = await SQLite.openDatabaseAsync(dbName);
  currentDBKey = dbKey;
  isDBReady = true;

  // persist session info
  await AsyncStorage.multiSet([
    ["current_user_id", entityStr],
    ["current_baseUrl", baseUrl],
    ["current_db_key", dbKey],
  ]);

  // init schema
  await initDBForCurrentDB();

  console.log("✅ Opened DB:", dbName);
  return db;
};

/* ============================================================
   2) GET DB
   ============================================================ */

export const getDB = () => {
  if (!db || !isDBReady) {
    throw new Error("DB not ready");
  }
  return db;
};

/* ============================================================
   3) CLOSE DB
   ============================================================ */

export const closeUserDB = async () => {
  try {
    if (db) {
      await db.closeAsync(); // 🔥 IMPORTANT
    }
  } catch (err) {
    console.log("DB close error:", err);
  }

  db = null;
  currentDBKey = null;
  isDBReady = false;

  await AsyncStorage.multiRemove([
    "current_user_id",
    "current_baseUrl",
    "current_db_key",
  ]);

  console.log("🔒 User DB closed");
};


export const safeDBCall = async (callback) => {
  try {
    const database = getDB();
    return await callback(database);
  } catch (err) {
    console.log("⚠️ DB unavailable, skipping operation");
    return null;
  }
};


/* ============================================================
   4) DELETE DB FILE (LOGOUT / COMPANY SWITCH)
   ============================================================ */

export const deleteUserDB = async (entityId, baseUrl) => {
  try {
    const sanitizedUrl = sanitizeBaseUrl(baseUrl);
    const dbKey = `${entityId}_${sanitizedUrl}`;
    const dbName = `axonerp_${dbKey}.db`;
    const dbUri = `${FileSystem.documentDirectory}${dbName}`;

    db = null;
    currentDBKey = null;

    const info = await FileSystem.getInfoAsync(dbUri);
    if (info.exists) {
      await FileSystem.deleteAsync(dbUri, { idempotent: true });
      console.log("🗑️ Deleted DB:", dbName);
    }
  } catch (err) {
    console.log("Delete DB error:", err);
  }
};

/* ============================================================
   5) SESSION HELPERS
   ============================================================ */

export const getCurrentUserId = async () => {
  const id = await AsyncStorage.getItem("current_user_id");
  return id ? String(id) : null; // always string
};

export const getCurrentBaseUrl = async () => {
  const url = await AsyncStorage.getItem("current_baseUrl");
  return url || null;
};

// export const clearUserSessionData = async (userId) => {
//   await AsyncStorage.removeItem("current_user_id");
//   await AsyncStorage.removeItem(`user_name_${userId}`);
//   await AsyncStorage.removeItem("qr_scanned");
//   console.log("Session cleared for user:", userId);
// };


// export const getCurrentUserId = () => currentUserId;

/**
 * Initialize schema for the currently opened DB (tables per user).
 * Keep schema identical to your previous schema (no user_id columns).
 */
const initDBForCurrentDB = async () => {
  // Use the same schema you already used, adjusted to not include user_id columns.
  // This uses the execAsync API in your environment.

   // 1️⃣ Create table if it doesn't exist (include new columns)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_config (
      id TEXT PRIMARY KEY DEFAULT 'config',
      entity_id TEXT,
      name TEXT,
      email TEXT,
      baseUrl TEXT,
      check_connection_url TEXT,
      sync_url TEXT,
      signature TEXT,
      generated_at TEXT,
      active_status TEXT DEFAULT 'inActive',
      session_id TEXT,
      company_logo TEXT,
      company_ntn_number TEXT,
      company_address TEXT
    );
  `);

  const columns = await db.getAllAsync(`PRAGMA table_info(app_config);`);
const colNames = columns.map(c => c.name);

if (!colNames.includes("company_logo")) {
  await db.runAsync(`ALTER TABLE app_config ADD COLUMN company_logo TEXT`);
}
if (!colNames.includes("company_ntn_number")) {
  await db.runAsync(`ALTER TABLE app_config ADD COLUMN company_ntn_number TEXT`);
}
if (!colNames.includes("company_address")) {
  await db.runAsync(`ALTER TABLE app_config ADD COLUMN company_address TEXT`);
}

  // await db.execAsync(`
  //   CREATE TABLE IF NOT EXISTS app_config (
  //     id TEXT PRIMARY KEY DEFAULT 'config',
  //     entity_id TEXT,
  //     name TEXT,
  //     email TEXT,
  //     baseUrl TEXT,
  //     check_connection_url TEXT,
  //     sync_url TEXT,
  //     signature TEXT,
  //     generated_at TEXT,
  //     active_status TEXT DEFAULT 'inActive',
  //     session_id TEXT
  //   );
  // `);


  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS customer (
      entity_id INTEGER UNIQUE,
      customer_rep_id TEXT,
      name TEXT NOT NULL,
      phone TEXT,
      last_seen TEXT,
      visited TEXT DEFAULT 'Unvisited',
      latitude REAL,
      longitude REAL,
      location_status TEXT DEFAULT 'Not Updated',
      synced INTEGER DEFAULT 0,
      updated_at TEXT
    );
  `);


  try {
  await db.execAsync(`
    ALTER TABLE customer
    ADD COLUMN customer_rep_id TEXT;
  `);
  console.log("✅ customer_rep_id column added");
} catch (err) {
  console.log("ℹ️ customer_rep_id already exists");
}


  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      type TEXT DEFAULT '',
      image TEXT DEFAULT '',
      stock INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS order_booking (
      booking_id TEXT PRIMARY KEY,
      order_date TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      order_no TEXT NOT NULL,
      created_by_id TEXT,
      created_date TEXT,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS order_booking_line (
      line_id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      order_qty INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (booking_id) REFERENCES order_booking(booking_id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      customer_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'Unvisited',
      FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY,
      last_reset_date TEXT
    );
  `);

  
  await db.execAsync(`
   CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT UNIQUE,
  name TEXT,
  account_type TEXT,
  root_type TEXT,
  is_group INTEGER
);
  `);

  await db.execAsync(`
  CREATE TABLE IF NOT EXISTS customerReceipts (
    id TEXT PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    cash_bank_id TEXT NOT NULL,      -- store bank ID
    cash_bank_name TEXT NOT NULL,    -- store bank name
    amount REAL NOT NULL,
    note TEXT,
    attachment TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    synced INTEGER DEFAULT 0,
    attachment_synced INTEGER DEFAULT 0,
    FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
  )
`);


//   await db.execAsync(`
//    CREATE TABLE IF NOT EXISTS customerReceipts (
//   id TEXT PRIMARY KEY,
//   customer_id INTEGER NOT NULL,
//   cash_bank_id TEXT NOT NULL,   -- change INTEGER → TEXT
//   amount REAL NOT NULL,
//   note TEXT,
//   attachment TEXT,
//   created_at TEXT DEFAULT (datetime('now', 'localtime')),
//   synced INTEGER DEFAULT 0,
//   attachment_synced INTEGER DEFAULT 0,
//   FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
// )
//   `);




  // await db.execAsync(`
  //   CREATE TABLE IF NOT EXISTS customerReceipts (
  //     id TEXT PRIMARY KEY,
  //     customer_id INTEGER NOT NULL,
  //     cash_bank_id TEXT NOT NULL,
  //     amount REAL NOT NULL,
  //     note TEXT,
  //     attachment TEXT,
  //     created_at TEXT DEFAULT (datetime('now', 'localtime')),
  //     synced INTEGER DEFAULT 0,
  //     attachment_synced INTEGER DEFAULT 0,
  //     FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
  //     );
  //     `);
      
      // attachment_synced INTEGER DEFAULT 0,
      
  // recent_activity - optional
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recent_activity (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      customer_name TEXT,
      item_count INTEGER,
      total_amount REAL,
      activity_date TEXT
    );
  `);


  // App Activity
  await db.execAsync(`
  CREATE TABLE IF NOT EXISTS app_activity (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    date_time TEXT NOT NULL,
    synced INTEGER DEFAULT 0
  );
`);

};




// Updated 15-12-2025
// // src/db/dbManager.js
// import * as SQLite from "expo-sqlite";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import * as FileSystem from "expo-file-system/legacy";


// let db = null;
// let currentUserId = null;

// /**
//  * Open (or create) the DB file for a user and initialize schema.
//  * @param {string|number} entityId
//  */

// /* ============================================================
//    1) OPEN DATABASE FOR A SPECIFIC USER
//    ============================================================ */

// //    export const openUserDB = async (entityId, baseUrl = "") => {
// //   if (!entityId) throw new Error("openUserDB: entityId is required");

// //   // normalize string
// //   const idStr = String(entityId);
// //   // Remove protocol and special characters from baseUrl
// //   const sanitizedUrl = baseUrl.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9]/g, "_");
// //   const dbName = `axonerp_${idStr}_${sanitizedUrl}.db`;

// //   // If same user + server already opened, return early
// //   if (db && currentUserId === `${idStr}_${sanitizedUrl}`) return db;

// //   db = SQLite.openDatabaseSync(dbName);
// //   currentUserId = `${idStr}_${sanitizedUrl}`;

// //   await AsyncStorage.setItem("current_user_id", idStr);

// //   await initDBForCurrentDB();

// //   console.log("Opened DB for user:", idStr, "server:", baseUrl);
// //   return db;
// // };

// export const openUserDB = async (entityId) => {
//   if (!entityId) throw new Error("openUserDB: entityId is required");

//   // normalize string
//   const idStr = String(entityId);
//   const dbName = `axonerp_${idStr}.db`;

//   // If same user already opened, return early
//   if (db && currentUserId === idStr) return db;

//   // open database (sync open used in your project)
//   db = SQLite.openDatabaseSync(dbName);
//   currentUserId = idStr;

//   // Save active user id to AsyncStorage
//   await AsyncStorage.setItem("current_user_id", idStr);

//   // Initialize tables in this per-user DB
//   await initDBForCurrentDB();

//   console.log("Opened DB for user:", idStr);
//   return db;
// };

// /* ============================================================
//    2) CLOSE ACTIVE DATABASE
//    ============================================================ */

// /**
//  * Close current DB reference (note: expo-sqlite does not provide explicit close)
//  * We null out the reference so next open will open another file.
//  */
// export const closeUserDB = async () => {
//   db = null;
//   currentUserId = null;
//   await AsyncStorage.removeItem("current_user_id");
//   console.log("Closed user DB");
// };

// export const getDB = () => {
//   if (!db) throw new Error("Database not opened. Call openUserDB(entityId) first.");
//   return db;
// };




// /* ============================================================
//    3) DELETE USER'S SQLITE DATABASE FILE
//    ============================================================ */
// export const deleteUserDB = async (userId) => {
//   try {
//     const dbName = `axonerp_${userId}.db`;   // ✅ correct filename
//     const dbUri = `${FileSystem.documentDirectory}${dbName}`;

//     // ❌ expo-sqlite has no close() → don't try to close it
//     db = null;                 // clear reference
//     currentUserId = null;
//     await AsyncStorage.removeItem("current_user_id");

//     // Check if file exists
//     const fileInfo = await FileSystem.getInfoAsync(dbUri);

//     if (fileInfo.exists) {
//       await FileSystem.deleteAsync(dbUri, { idempotent: true });
//       console.log("Database deleted:", dbUri);
//     } else {
//       console.log("Database file does not exist:", dbUri);
//     }
//   } catch (err) {
//     console.log("Delete DB error:", err);
//   }
// };

// /* ============================================================
//    4) CLEAR USER SESSION DATA
//    ============================================================ */
// export const clearUserSessionData = async (userId) => {
//   await AsyncStorage.removeItem("current_user_id");
//   await AsyncStorage.removeItem(`user_name_${userId}`);
//   await AsyncStorage.removeItem("qr_scanned");
//   console.log("Session cleared for user:", userId);
// };


// export const getCurrentUserId = () => currentUserId;

// /**
//  * Initialize schema for the currently opened DB (tables per user).
//  * Keep schema identical to your previous schema (no user_id columns).
//  */
// const initDBForCurrentDB = async () => {
//   // Use the same schema you already used, adjusted to not include user_id columns.
//   // This uses the execAsync API in your environment.
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


//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS customer (
//       entity_id INTEGER UNIQUE,
//       name TEXT NOT NULL,
//       phone TEXT,
//       last_seen TEXT,
//       visited TEXT DEFAULT 'Unvisited',
//       latitude REAL,
//       longitude REAL,
//       location_status TEXT DEFAULT 'Not Updated',
//       synced INTEGER DEFAULT 0,
//       updated_at TEXT
//     );
//   `);

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

//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS order_booking (
//       booking_id TEXT PRIMARY KEY,
//       order_date TEXT NOT NULL,
//       customer_id INTEGER NOT NULL,
//       order_no TEXT NOT NULL,
//       created_by_id TEXT,
//       created_date TEXT,
//       synced INTEGER DEFAULT 0,
//       FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
//     );
//   `);

//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS order_booking_line (
//       line_id TEXT PRIMARY KEY,
//       booking_id TEXT NOT NULL,
//       item_id TEXT NOT NULL,
//       order_qty INTEGER NOT NULL,
//       unit_price REAL NOT NULL,
//       amount REAL NOT NULL,
//       created_at TEXT DEFAULT (datetime('now')),
//       synced INTEGER DEFAULT 0,
//       FOREIGN KEY (booking_id) REFERENCES order_booking(booking_id),
//       FOREIGN KEY (item_id) REFERENCES items(id)
//     );
//   `);

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

//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS app_settings (
//       id INTEGER PRIMARY KEY,
//       last_reset_date TEXT
//     );
//   `);


//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS customerReceipts (
//       id TEXT PRIMARY KEY,
//       customer_id INTEGER NOT NULL,
//       cash_bank_id TEXT NOT NULL,
//       amount REAL NOT NULL,
//       note TEXT,
//       attachment TEXT,
//       created_at TEXT DEFAULT (datetime('now', 'localtime')),
//       synced INTEGER DEFAULT 0,
//       attachment_synced INTEGER DEFAULT 0,
//       FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
//       );
//       `);
      
//       // attachment_synced INTEGER DEFAULT 0,
      
//   // recent_activity - optional
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS recent_activity (
//       id TEXT PRIMARY KEY,
//       booking_id TEXT,
//       customer_name TEXT,
//       item_count INTEGER,
//       total_amount REAL,
//       activity_date TEXT
//     );
//   `);


//   // App Activity
//   await db.execAsync(`
//   CREATE TABLE IF NOT EXISTS app_activity (
//     id TEXT PRIMARY KEY,
//     user_id TEXT NOT NULL,
//     latitude REAL NOT NULL,
//     longitude REAL NOT NULL,
//     date_time TEXT NOT NULL,
//     synced INTEGER DEFAULT 0
//   );
// `);

// };






// Update the tables to add the synced column if it doesn't exist

// src/db/dbManager.js
// import * as SQLite from "expo-sqlite";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import * as FileSystem from "expo-file-system/legacy";


// let db = null;
// let currentUserId = null;

// /**
//  * Open (or create) the DB file for a user and initialize schema.
//  * @param {string|number} entityId
//  */

// /* ============================================================
//    1) OPEN DATABASE FOR A SPECIFIC USER
//    ============================================================ */
// export const openUserDB = async (entityId) => {
//   if (!entityId) throw new Error("openUserDB: entityId is required");

//   // normalize string
//   const idStr = String(entityId);
//   const dbName = `axonerp_${idStr}.db`;

//   // If same user already opened, return early
//   if (db && currentUserId === idStr) return db;

//   // open database (sync open used in your project)
//   db = SQLite.openDatabaseSync(dbName);
//   currentUserId = idStr;

//   // Save active user id to AsyncStorage
//   await AsyncStorage.setItem("current_user_id", idStr);

//   // Initialize tables in this per-user DB
//   await initDBForCurrentDB();

//   console.log("Opened DB for user:", idStr);
//   return db;
// };

// /* ============================================================
//    2) CLOSE ACTIVE DATABASE
//    ============================================================ */

// /**
//  * Close current DB reference (note: expo-sqlite does not provide explicit close)
//  * We null out the reference so next open will open another file.
//  */
// export const closeUserDB = async () => {
//   db = null;
//   currentUserId = null;
//   await AsyncStorage.removeItem("current_user_id");
//   console.log("Closed user DB");
// };

// export const getDB = () => {
//   if (!db) throw new Error("Database not opened. Call openUserDB(entityId) first.");
//   return db;
// };




// /* ============================================================
//    3) DELETE USER'S SQLITE DATABASE FILE
//    ============================================================ */
// export const deleteUserDB = async (userId) => {
//   try {
//     const dbName = `axonerp_${userId}.db`;   // ✅ correct filename
//     const dbUri = `${FileSystem.documentDirectory}${dbName}`;

//     // ❌ expo-sqlite has no close() → don't try to close it
//     db = null;                 // clear reference
//     currentUserId = null;
//     await AsyncStorage.removeItem("current_user_id");

//     // Check if file exists
//     const fileInfo = await FileSystem.getInfoAsync(dbUri);

//     if (fileInfo.exists) {
//       await FileSystem.deleteAsync(dbUri, { idempotent: true });
//       console.log("Database deleted:", dbUri);
//     } else {
//       console.log("Database file does not exist:", dbUri);
//     }
//   } catch (err) {
//     console.log("Delete DB error:", err);
//   }
// };

// /* ============================================================
//    4) CLEAR USER SESSION DATA
//    ============================================================ */
// export const clearUserSessionData = async (userId) => {
//   await AsyncStorage.removeItem("current_user_id");
//   await AsyncStorage.removeItem(`user_name_${userId}`);
//   await AsyncStorage.removeItem("qr_scanned");
//   console.log("Session cleared for user:", userId);
// };





// export const getCurrentUserId = () => currentUserId;

// /**
//  * Initialize schema for the currently opened DB (tables per user).
//  * Keep schema identical to your previous schema (no user_id columns).
//  */
// const initDBForCurrentDB = async () => {
//   // Use the same schema you already used, adjusted to not include user_id columns.
//   // This uses the execAsync API in your environment.
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

//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS app_settings (
//       id INTEGER PRIMARY KEY,
//       last_reset_date TEXT
//     );
//   `);

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

//   // recent_activity - optional
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS recent_activity (
//       id TEXT PRIMARY KEY,
//       booking_id TEXT,
//       customer_name TEXT,
//       item_count INTEGER,
//       total_amount REAL,
//       activity_date TEXT
//     );
//   `);
// };
