import * as SQLite from "expo-sqlite";
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid'; 

// Use openDatabaseSync for modern Expo SDK (persistent DB)
const db = SQLite.openDatabaseSync("customer0DB.db");

// ---------------------- INITIALIZATION ----------------------
export const initDB = async () => {

  // App Config table (holds QR scanned settings)
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
    generated_at TEXT
  );
`);

  // Customer Table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS customer (
      entity_id INTEGER UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      last_seen TEXT,
      visited TEXT DEFAULT 'Unvisited',
      latitude REAL,
      longitude REAL,
      location_status TEXT DEFAULT 'Not Updated'
    );
  `);

  // Items Table
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

  // Order Booking
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS order_booking (
      booking_id TEXT PRIMARY KEY,
      order_date TEXT NOT NULL,
      customer_id INTEGER NOT NULL,
      order_no TEXT NOT NULL,
      created_by_id TEXT,
      created_date TEXT,
      FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
    );
  `);

  // Order Booking Line (Details Table)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS order_booking_line (
      line_id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      order_qty INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (booking_id) REFERENCES order_booking(booking_id),
      FOREIGN KEY (item_id) REFERENCES items(id)
    );
  `);

  // Activity Log Table (daily status)
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

  // App Settings table for reset tracking
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY,
      last_reset_date TEXT
    );
  `);


  // Customer Receipts Table
await db.execAsync(`
  CREATE TABLE IF NOT EXISTS customerReceipts (
    id TEXT PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    cash_bank_id TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT,
    attachment TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
  );
`);



  // Insert dummy customers if empty
  const existingCustomers = await db.getAllAsync(
    "SELECT COUNT(*) as count FROM customer"
  );
  if (existingCustomers?.[0]?.count === 0) {
 await db.runAsync(`
  INSERT OR REPLACE INTO customer (entity_id, name, phone, last_seen, visited, latitude, longitude, location_status) VALUES
  (1, 'Ali Raza', '03001234567', '2025-11-06 10:00', 'Unvisited', NULL, NULL, 'Not Updated'),
  (2, 'Ayesha Khan', '03019876543', '2025-11-05 18:30', 'Unvisited', 31.4220, 73.0954, 'Not Updated'),
  (3, 'Hassan Ahmed', '03025557788', '2025-11-06 09:15', 'Unvisited', NULL, NULL, 'Not Updated'),
  (4, 'Fatima Tariq', '03037778899', '2025-11-04 14:20', 'Unvisited', 31.4325, 73.0899, 'Not Updated'),
  (5, 'Usman Ali', '03041112233', '2025-11-06 08:45', 'Unvisited', NULL, NULL, 'Not Updated'),
  (6, 'Sara Nawaz', '03054445566', '2025-11-03 19:10', 'Unvisited', 31.4263, 73.0821, 'Not Updated'),
  (7, 'Bilal Hussain', '03061114455', '2025-11-06 11:30', 'Unvisited', NULL, NULL, 'Not Updated'),
  (8, 'Zainab Noor', '03075556644', '2025-11-05 16:50', 'Unvisited', 31.4088, 73.0856, 'Not Updated'),
  (9, 'Ahmad Khan', '03082223344', '2025-11-06 07:25', 'Unvisited', NULL, NULL, 'Not Updated'),
  (10, 'Mariam Iqbal', '03093334455', '2025-11-04 12:40', 'Unvisited', 31.4176, 73.0888, 'Not Updated'),
  (11, 'Noman Siddiqui', '03111222333', '2025-11-06 09:50', 'Unvisited', NULL, NULL, 'Not Updated'),
  (12, 'Hina Javed', '03123334455', '2025-11-05 20:05', 'Unvisited', 31.4105, 73.0802, 'Not Updated'),
  (13, 'Kamran Abbas', '03134445566', '2025-11-06 10:15', 'Unvisited', NULL, NULL, 'Not Updated'),
  (14, 'Sadia Imran', '03145556677', '2025-11-03 15:30', 'Unvisited', 31.4277, 73.0866, 'Not Updated'),
  (15, 'Adnan Rafiq', '03156667788', '2025-11-06 08:05', 'Unvisited', NULL, NULL, 'Not Updated'),
  (16, 'Iqra Shah', '03167778899', '2025-11-05 17:25', 'Unvisited', 31.4160, 73.0819, 'Not Updated'),
  (17, 'Rashid Malik', '03178889900', '2025-11-06 07:55', 'Unvisited', NULL, NULL, 'Not Updated'),
  (18, 'Laiba Aslam', '03189990011', '2025-11-04 11:10', 'Unvisited', 31.4099, 73.0788, 'Not Updated'),
  (19, 'Tahir Zafar', '03211223344', '2025-11-06 09:40', 'Unvisited', NULL, NULL, 'Not Updated'),
  (20, 'Nida Farooq', '03223334455', '2025-11-05 18:00', 'Unvisited', 31.4250, 73.0900, 'Not Updated')
`);

  }

 // Insert dummy items if empty
const existingItems = await db.getAllAsync(
  "SELECT COUNT(*) as count FROM items"
);
if (existingItems?.[0]?.count === 0) {
  await db.runAsync(`
  INSERT INTO items (id, name, price, type, image, stock) VALUES
  -- 🧵 Clothing & Textiles
  ('${uuidv4()}', 'Cotton Fabric Roll', 1200, 'Clothing', 'https://images.pexels.com/photos/4502351/pexels-photo-4502351.jpeg', 50),
  ('${uuidv4()}', 'Polyester Yarn', 850, 'Clothing', 'https://images.pexels.com/photos/1105583/pexels-photo-1105583.jpeg', 100),
  ('${uuidv4()}', 'Silk Dupatta', 500, 'Clothing', 'https://images.pexels.com/photos/1435908/pexels-photo-1435908.jpeg', 30),
  ('${uuidv4()}', 'Denim Jeans', 2200, 'Clothing', 'https://images.pexels.com/photos/2983464/pexels-photo-2983464.jpeg', 40),
  ('${uuidv4()}', 'Formal Shirt', 2100, 'Clothing', 'https://images.pexels.com/photos/2983463/pexels-photo-2983463.jpeg', 60),
  ('${uuidv4()}', 'T‑Shirt Pack', 1500, 'Clothing', 'https://images.pexels.com/photos/845434/pexels-photo-845434.jpeg', 80),
  ('${uuidv4()}', 'Winter Jacket', 4500, 'Clothing', 'https://images.pexels.com/photos/428338/pexels-photo-428338.jpeg', 25),

  -- 🛒 Groceries
  ('${uuidv4()}', 'Basmati Rice 5kg', 1700, 'Grocery', 'https://greenvalley.pk/wp-content/uploads/2024/01/guard-ultimate-basmati-rice-5kg.jpg', 200),
  ('${uuidv4()}', 'Cooking Oil 1L', 620, 'Grocery', 'https://images.pexels.com/photos/461198/pexels-photo-461198.jpeg', 150),
  ('${uuidv4()}', 'Sugar 1kg', 180, 'Grocery', 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg', 180),
  ('${uuidv4()}', 'Wheat Flour 10kg', 1650, 'Grocery', 'https://images.pexels.com/photos/461428/pexels-photo-461428.jpeg', 120),
  ('${uuidv4()}', 'Tea Pack 250g', 450, 'Grocery', 'https://images.pexels.com/photos/54524/tea-cup-tea-packet.jpg', 300),
  ('${uuidv4()}', 'Milk Carton 1L', 270, 'Grocery', 'https://images.pexels.com/photos/5539924/pexels-photo-5539924.jpeg', 250),
  ('${uuidv4()}', 'Eggs (Dozen)', 320, 'Grocery', 'https://images.pexels.com/photos/65175/eggs-carton.jpg', 180),

  -- 🧴 Household & Cleaning
  ('${uuidv4()}', 'Washing Powder 1kg', 480, 'Household', 'https://images.pexels.com/photos/3951275/pexels-photo-3951275.jpeg', 100),
  ('${uuidv4()}', 'Dishwashing Liquid 500ml', 350, 'Household', 'https://images.pexels.com/photos/374887/pexels-photo-374887.jpeg', 120),
  ('${uuidv4()}', 'Bath Soap 3‑Pack', 250, 'Household', 'https://images.pexels.com/photos/301920/pexels-photo-301920.jpeg', 150),
  ('${uuidv4()}', 'Shampoo 400ml', 600, 'Household', 'https://images.pexels.com/photos/356854/pexels-photo-356854.jpeg', 90),
  ('${uuidv4()}', 'Toothpaste 150g', 200, 'Household', 'https://images.pexels.com/photos/3965669/pexels-photo-3965669.jpeg', 200),

  -- 💻 Electronics
  ('${uuidv4()}', 'LED Bulb 12W', 350, 'Electronics', 'https://images.pexels.com/photos/5082573/pexels-photo-5082573.jpeg', 80),
  ('${uuidv4()}', 'Power Bank 10000mAh', 2800, 'Electronics', 'https://images.pexels.com/photos/574542/pexels-photo-574542.jpeg', 50),
  ('${uuidv4()}', 'Bluetooth Earbuds', 4200, 'Electronics', 'https://images.pexels.com/photos/373945/pexels-photo-373945.jpeg', 40),
  ('${uuidv4()}', 'USB Cable Type‑C', 350, 'Electronics', 'https://images.pexels.com/photos/5082572/pexels-photo-5082572.jpeg', 100),
  ('${uuidv4()}', 'Mobile Charger', 950, 'Electronics', 'https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg', 70),

  -- 🏠 Home & Kitchen
  ('${uuidv4()}', 'Plastic Chair', 1200, 'Home & Kitchen', 'https://images.pexels.com/photos/276528/pexels-photo-276528.jpeg', 60),
  ('${uuidv4()}', 'Stainless Steel Pan', 2100, 'Home & Kitchen', 'https://images.pexels.com/photos/97050/pexels-photo-97050.jpeg', 40),
  ('${uuidv4()}', 'Curtain Set', 2500, 'Home & Kitchen', 'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg', 30),
  ('${uuidv4()}', 'Wall Clock', 1450, 'Home & Kitchen', 'https://images.pexels.com/photos/357338/pexels-photo-357338.jpeg', 50),
  ('${uuidv4()}', 'Floor Mat', 850, 'Home & Kitchen', 'https://images.pexels.com/photos/290615/pexels-photo-290615.jpeg', 70)
`);
}


   // Initialize daily activity log
  await initDailyActivityLog();
};

// ---------------------- CUSTOMER FUNCTIONS ----------------------
export const getAllCustomers = async () => {
  return await db.getAllAsync("SELECT * FROM customer ORDER BY entity_id DESC");
};

export const searchCustomers = async (query) => {
  return await db.getAllAsync(
    "SELECT * FROM customer WHERE name LIKE ? ORDER BY entity_id DESC",
    [`%${query}%`]
  );
};

export const updateVisited = async (id, visited) => {
  const status = visited ? "Yes" : "No";
  await db.runAsync(
    "UPDATE customer SET visited = ? WHERE entity_id = ?",
    [status, id]
  );
};

export const addCustomer = async (name, phone, last_seen, visited = "Unvisited") => {
  const maxIdRow = await db.getFirstAsync("SELECT MAX(entity_id) as maxId FROM customer");
  const newId = (maxIdRow?.maxId || 0) + 1;
  await db.runAsync(
    "INSERT INTO customer (entity_id, name, phone, last_seen, visited) VALUES (?, ?, ?, ?, ?)",
    [newId, name, phone, last_seen, visited]
  );
};



// ---------------------- DAILY ACTIVITY LOG FUNCTIONS ----------------------


// Initialize activity log for all customers today
export const initDailyActivityLog = async () => {
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
    await db.runAsync("UPDATE customer SET visited = 'Unvisited'");

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
  const today = new Date().toISOString().split("T")[0];
  await db.runAsync(
    "UPDATE customer SET visited = 'Visited' WHERE entity_id = ?",
    [customer_id]
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
  const today = new Date().toISOString().split("T")[0];
  return await db.getAllAsync(
    "SELECT * FROM activity_log WHERE date = ? ORDER BY customer_name ASC",
    [today]
  );
};


// Update last_seen for a customer
export const updateCustomerLastSeen = async (customer_id, last_seen) => {
  await db.runAsync(
    "UPDATE customer SET last_seen = ? WHERE entity_id = ?",
    [last_seen, customer_id]
  );
};


// ---------------------- ITEM FUNCTIONS ----------------------
export const getItems = async (query = "") => {
  return await db.getAllAsync(
    "SELECT * FROM items WHERE name LIKE ? ORDER BY name ASC",
    [`%${query}%`]
  );
};

export const addItem = async (name, price, image, stock = "") => {
  const id = uuidv4();
  await db.runAsync("INSERT INTO items (id, name, price, image, stock) VALUES (?, ?, ?, ?, ?)", [
    id,
    name,
    price,
    image,
    stock,
  ]);
  return id;
};

// ---------------------- ORDER BOOKING FUNCTIONS ----------------------

// Helper to get current local datetime
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



// export const addOrderBooking = async (order) => {
//   const bookingId = uuidv4();
//   const result = await db.runAsync(
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

//    const bookingId = result.lastInsertRowId;
// Add main order (returns booking_id)
export const addOrderBooking = async (order) => {
  const bookingId = uuidv4();
  await db.runAsync(
    `INSERT INTO order_booking (booking_id, order_date, customer_id, order_no, created_by_id, created_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      bookingId,
      order.order_date,
      order.customer_id,
      order.order_no,
      order.created_by_id,
      order.created_date,
    ]
  );


  // ✅ Get current local datetime
  const now = getCurrentDateTime();
  const today = now.split(" ")[0]; // extract YYYY-MM-DD for activity_log

  // Automatically mark customer as visited and update last_seen
  await db.runAsync(
    "UPDATE customer SET visited = 'Visited', last_seen = ? WHERE entity_id = ?",
    [now, order.customer_id]
  );

  // Update daily activity log
  // Ensure there's a row in activity_log
  const existing = await db.getFirstAsync(
    "SELECT id FROM activity_log WHERE customer_id = ? AND date = ?",
    [order.customer_id, today]
  );

  if (!existing) {
    await db.runAsync(
      `INSERT INTO activity_log 
        (id, customer_id, customer_name, date, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        order.customer_id,
        order.customer_name,
        today,
        "Visited",
      ]
    );
  } else {
    await db.runAsync(
      "UPDATE activity_log SET status = 'Visited' WHERE customer_id = ? AND date = ?",
      [order.customer_id, today]
    );
  }

  return bookingId;
};

// Add order booking line — fixed to ensure data is committed
export const addOrderBookingLine = async (line) => {
  const lineId = uuidv4();
  await db.execAsync("BEGIN TRANSACTION;");
  try {
    await db.runAsync(
      `INSERT INTO order_booking_line (line_id, booking_id, item_id, order_qty, unit_price, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
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

// Fetch all orders summary
export const getAllOrders = async () => {
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
    GROUP BY ob.booking_id
    ORDER BY ob.order_date DESC;
  `);
};

// Fetch single order details
export const getOrderDetails = async (bookingId) => {
  return await db.getAllAsync(
    `
    SELECT 
      obl.line_id, 
      i.name AS item_name, 
      obl.order_qty, 
      obl.unit_price, 
      obl.amount
    FROM order_booking_line obl
    JOIN items i ON obl.item_id = i.id
    WHERE obl.booking_id = ?
    `,
    [bookingId]
  );
};

// ---------------------- ORDER BOOKING LINE HELPERS ----------------------

// Get existing order line by booking and item
export const getOrderLineByBookingAndItem = async (bookingId, itemId) => {
  return await db.getAllAsync(
    `SELECT * FROM order_booking_line WHERE booking_id = ? AND item_id = ?`,
    [bookingId, itemId]
  );
};

// Update an existing order line
export const updateOrderBookingLine = async (lineId, data) => {
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

// ---------------------- RECENT ACTIVITY ----------------------

export const initRecentActivityTable = async () => {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recent_activity (
        id TEXT PRIMARY KEY,
        booking_id TEXT,
        customer_name TEXT,
        item_count INTEGER,
        total_amount REAL,
        activity_date TEXT
      )
    `);
    console.log("Recent activity table initialized.");
  } catch (error) {
    console.error("Error creating recent_activity table:", error);
  }
};

export const addRecentActivity = async ({
  booking_id,
  customer_name,
  item_count,
  total_amount,
}) => {
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
  return await db.getAllAsync(`
    SELECT * FROM recent_activity
    ORDER BY activity_date DESC
  `);
};

// ---------------------- CUSTOMER LOCATION UPDATE ----------------------

// Update latitude and longitude for a customer
export const updateCustomerLocation = async (customer_id, latitude, longitude) => {
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
export const updateCustomerLocationWithLastSeen = async (customer_id, latitude, longitude, status) => {
  const last_seen = new Date().toISOString();
  try {
    await db.runAsync(
      `UPDATE customer 
       SET latitude = ?, longitude = ?, location_status = ? 
       WHERE entity_id = ?`,
      [latitude, longitude, status, customer_id]
    );
    console.log(`Customer ${customer_id} location, last_seen, and status updated.`);
  } catch (error) {
    console.error("Error updating customer location, last_seen, and status:", error);
  }
};


export const addCustomerReceipt = async ({ customer_id, cash_bank_id, amount, note, attachment }) => {
  const id = uuidv4();
  return await db.runAsync(
    `INSERT INTO customerReceipts (id, customer_id, cash_bank_id, amount, note, attachment)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, customer_id, cash_bank_id, amount, note, attachment]
  );
  return id;
};

export const getAllCustomerReceipts = async () => {
  return await db.getAllAsync(`
    SELECT cr.id, cr.customer_id, cr.cash_bank_id, cr.amount, cr.note, cr.attachment, cr.created_at,
           c.name AS customerName
    FROM customerReceipts cr
    LEFT JOIN customer c ON cr.customer_id = c.entity_id
    ORDER BY cr.created_at DESC
  `, []);
};



// Fetch orders for a specific customer with summary info
export const getOrdersByCustomer = async (customerId) => {
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
  const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

  const result = await db.getFirstAsync(
    `SELECT SUM(amount) AS total FROM order_booking_line WHERE DATE(created_at) = ?`,
    [today]
  );

  return result?.total || 0;
};


export const getLastMonthSales = async () => {
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

// ✅ Save QR config into SQLite
export const saveQRConfig = async (data) => {
  const entity = data?.entity || {};
  const qr = data?.qr_payload || {};

  await db.runAsync(
    `INSERT OR REPLACE INTO app_config 
     (id, entity_id, name, email, baseUrl, check_connection_url, sync_url, signature, generated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entity.entity_id || null,
      entity.name || null,
      entity.email || null,
      qr.baseUrl || null,
      qr.check_connection_url || null,
      qr.sync_url || null,
      qr.signature || null,
      qr.generated_at || null,
    ]
  );
};

// ---------------------- SYNC HELPER FUNCTIONS ----------------------

// Helper to ensure UUID
const ensureUUID = (record, key) => {
  if (!record[key]) record[key] = uuidv4();
  return record;
};

// Get all customers (used in incremental sync)
export const getAllCustomersForSync = async () => {
  const rows = await db.getAllAsync(`
    SELECT entity_id, name, phone, last_seen, visited, latitude, longitude, location_status
    FROM customer
    ORDER BY entity_id ASC
  `);

  // Ensure UUIDs and remove duplicates by entity_id
  const deduped = Object.values(
    rows.reduce((acc, c) => {
      c = ensureUUID(c, "entity_id");
      acc[c.entity_id] = c;
      return acc;
    }, {})
  );

  return deduped;
};

// Get all items (used in incremental sync)
export const getAllItems = async () => {
  const rows = await db.getAllAsync(`
    SELECT id, name, price, type, image, stock
    FROM items
    ORDER BY id ASC
  `);

  const deduped = Object.values(
    rows.reduce((acc, i) => {
      i = ensureUUID(i, "id");
      acc[i.id] = i;
      return acc;
    }, {})
  );

  return deduped;
};

// Get all order bookings (used in incremental sync)
export const getAllOrderBookings = async () => {
  const rows = await db.getAllAsync(`
    SELECT booking_id, order_date, customer_id, order_no, created_by_id, created_date
    FROM order_booking
    ORDER BY booking_id ASC
  `);

  const deduped = Object.values(
    rows.reduce((acc, b) => {
      b = ensureUUID(b, "booking_id");
      acc[b.booking_id] = b;
      return acc;
    }, {})
  );

  return deduped;
};

// Get all order booking lines (used in incremental sync)
export const getAllOrderBookingLines = async () => {
  const rows = await db.getAllAsync(`
    SELECT line_id, booking_id, item_id, order_qty, unit_price, amount, created_at
    FROM order_booking_line
    ORDER BY line_id ASC
  `);

  const deduped = Object.values(
    rows.reduce((acc, l) => {
      l = ensureUUID(l, "line_id");
      acc[l.line_id] = l;
      return acc;
    }, {})
  );

  return deduped;
};

// Get all customer receipts for incremental sync
export const getAllCustomerReceiptsForSync = async () => {
  const rows = await db.getAllAsync(`
    SELECT id, customer_id, cash_bank_id, amount, note, attachment, created_at
    FROM customerReceipts
    ORDER BY id ASC
  `);

  const deduped = Object.values(
    rows.reduce((acc, r) => {
      r = ensureUUID(r, "id");
      acc[r.id] = r;
      return acc;
    }, {})
  );

  return deduped;
};






















// ---------------------- INITIAL SETUP ----------------------

// import * as SQLite from "expo-sqlite";

// // Use openDatabaseSync for modern Expo SDK (persistent DB)
// const db = SQLite.openDatabaseSync("customer0DB.db");

// // ---------------------- INITIALIZATION ----------------------
// export const initDB = async () => {
//   // Customer Table
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS customer (
//       entity_id INTEGER PRIMARY KEY AUTOINCREMENT,
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
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL,
//       price REAL NOT NULL,
//       type TEXT DEFAULT '',
//       image TEXT DEFAULT '',
//       stock INTEGER DEFAULT 0
//     );
//   `);

//   // Order Booking
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS order_booking (
//       booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
//       order_date TEXT NOT NULL,
//       customer_id INTEGER NOT NULL,
//       order_no TEXT NOT NULL,
//       created_by_id INTEGER,
//       created_date TEXT,
//       FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
//     );
//   `);

//   // Order Booking Line (Details Table)
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS order_booking_line (
//       line_id INTEGER PRIMARY KEY AUTOINCREMENT,
//       booking_id INTEGER NOT NULL,
//       item_id INTEGER NOT NULL,
//       order_qty INTEGER NOT NULL,
//       unit_price REAL NOT NULL,
//       amount REAL NOT NULL,
//       FOREIGN KEY (booking_id) REFERENCES order_booking(booking_id),
//       FOREIGN KEY (item_id) REFERENCES items(id)
//     );
//   `);

//   // Activity Log Table (daily status)
//   await db.execAsync(`
//     CREATE TABLE IF NOT EXISTS activity_log (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       customer_id INTEGER NOT NULL,
//       customer_name TEXT NOT NULL,
//       date TEXT NOT NULL,
//       status TEXT DEFAULT 'Unvisited',
//       FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
//     );
//   `);


//   // Customer Receipts Table
// await db.execAsync(`
//   CREATE TABLE IF NOT EXISTS customerReceipts (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     customer_id INTEGER NOT NULL,
//     cash_bank_id TEXT NOT NULL,
//     amount REAL NOT NULL,
//     note TEXT,
//     attachment TEXT,
//     created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//     FOREIGN KEY (customer_id) REFERENCES customer(entity_id)
//   );
// `);


//   // Insert dummy customers if empty
//   const existingCustomers = await db.getAllAsync(
//     "SELECT COUNT(*) as count FROM customer"
//   );
//   if (existingCustomers?.[0]?.count === 0) {
//     await db.runAsync(`
//       INSERT INTO customer (name, phone, last_seen, visited, latitude, longitude,location_status) VALUES
//   ('Ali Raza', '03001234567', '2025-11-06 10:00', 'Unvisited', 31.4182, 73.0791, 'Not Updated'),
//   ('Ayesha Khan', '03019876543', '2025-11-05 18:30','Unvisited', 31.4220, 73.0954, 'Not Updated'),
//   ('Hassan Ahmed', '03025557788', '2025-11-06 09:15', 'Unvisited', 31.4068, 73.1015, 'Not Updated'),
//   ('Fatima Tariq', '03037778899', '2025-11-04 14:20', 'Unvisited', 31.4325, 73.0899, 'Not Updated'),
//   ('Usman Ali', '03041112233', '2025-11-06 08:45', 'Unvisited', 31.4120, 73.0752,'Not Updated'),
//   ('Sara Nawaz', '03054445566', '2025-11-03 19:10','Unvisited', 31.4263, 73.0821,'Not Updated'),
//   ('Bilal Hussain', '03061114455', '2025-11-06 11:30', 'Unvisited', 31.4155, 73.0972,'Not Updated'),
//   ('Zainab Noor', '03075556644', '2025-11-05 16:50', 'Unvisited', 31.4088, 73.0856,'Not Updated'),
//   ('Ahmad Khan', '03082223344', '2025-11-06 07:25', 'Unvisited', 31.4204, 73.0913,'Not Updated'),
//   ('Mariam Iqbal', '03093334455', '2025-11-04 12:40', 'Unvisited', 31.4176, 73.0888,'Not Updated'),
//   ('Noman Siddiqui', '03111222333', '2025-11-06 09:50', 'Unvisited', 31.4290, 73.0944,'Not Updated'),
//   ('Hina Javed', '03123334455', '2025-11-05 20:05', 'Unvisited', 31.4105, 73.0802,'Not Updated'),
//   ('Kamran Abbas', '03134445566', '2025-11-06 10:15', 'Unvisited', 31.4188, 73.1005,'Not Updated'),
//   ('Sadia Imran', '03145556677', '2025-11-03 15:30', 'Unvisited', 31.4277, 73.0866,'Not Updated'),
//   ('Adnan Rafiq', '03156667788', '2025-11-06 08:05', 'Unvisited', 31.4142, 73.0924,'Not Updated'),
//   ('Iqra Shah', '03167778899', '2025-11-05 17:25', 'Unvisited', 31.4160, 73.0819,'Not Updated'),
//   ('Rashid Malik', '03178889900', '2025-11-06 07:55', 'Unvisited', 31.4244, 73.0961,'Not Updated'),
//   ('Laiba Aslam', '03189990011', '2025-11-04 11:10', 'Unvisited', 31.4099, 73.0788,'Not Updated'),
//   ('Tahir Zafar', '03211223344', '2025-11-06 09:40', 'Unvisited', 31.4231, 73.0842,'Not Updated'),
//   ('Nida Farooq', '03223334455', '2025-11-05 18:00', 'Unvisited', 31.4152, 73.0895,'Not Updated')
//     `);
//   }

//  // Insert dummy items if empty
// const existingItems = await db.getAllAsync(
//   "SELECT COUNT(*) as count FROM items"
// );
// if (existingItems?.[0]?.count === 0) {
//   await db.runAsync(`
//     INSERT INTO items (name, price, type, image) VALUES
//     -- 🧵 Clothing & Textiles
//     ('Cotton Fabric Roll', 1200, 'Clothing', ''),
//     ('Polyester Yarn', 850, 'Clothing', ''),
//     ('Silk Dupatta', 500, 'Clothing', ''),
//     ('Denim Jeans', 2200, 'Clothing', ''),
//     ('Formal Shirt', 2100, 'Clothing', ''),
//     ('T-Shirt Pack', 1500, 'Clothing', ''),
//     ('Winter Jacket', 4500, 'Clothing', ''),

//     -- 🛒 Groceries
//     ('Basmati Rice 5kg', 1700, 'Grocery', ''),
//     ('Cooking Oil 1L', 620, 'Grocery', ''),
//     ('Sugar 1kg', 180, 'Grocery', ''),
//     ('Wheat Flour 10kg', 1650, 'Grocery', ''),
//     ('Tea Pack 250g', 450, 'Grocery', ''),
//     ('Milk Carton 1L', 270, 'Grocery', ''),
//     ('Eggs (Dozen)', 320, 'Grocery', ''),

//     -- 🧴 Household & Cleaning
//     ('Washing Powder 1kg', 480, 'Household', ''),
//     ('Dishwashing Liquid 500ml', 350, 'Household', ''),
//     ('Bath Soap 3-Pack', 250, 'Household', ''),
//     ('Shampoo 400ml', 600, 'Household', ''),
//     ('Toothpaste 150g', 200, 'Household', ''),

//     -- 💻 Electronics
//     ('LED Bulb 12W', 350, 'Electronics', ''),
//     ('Power Bank 10000mAh', 2800, 'Electronics', ''),
//     ('Bluetooth Earbuds', 4200, 'Electronics', ''),
//     ('USB Cable Type-C', 350, 'Electronics', ''),
//     ('Mobile Charger', 950, 'Electronics', ''),

//     -- 🏠 Home & Kitchen
//     ('Plastic Chair', 1200, 'Home & Kitchen', ''),
//     ('Stainless Steel Pan', 2100, 'Home & Kitchen', ''),
//     ('Curtain Set', 2500, 'Home & Kitchen', ''),
//     ('Wall Clock', 1450, 'Home & Kitchen', ''),
//     ('Floor Mat', 850, 'Home & Kitchen', '')
//   `);
// }


//    // Initialize daily activity log
//   await initDailyActivityLog();
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

// export const addCustomer = async (name, phone, last_seen, visited = "Unvisited") => {
//   await db.runAsync(
//     "INSERT INTO customer (name, phone, last_seen, visited) VALUES (?, ?, ?, ?)",
//     [name, phone, last_seen, visited]
//   );
// };


// // ---------------------- DAILY ACTIVITY LOG FUNCTIONS ----------------------

// // Initialize activity log for all customers today
// export const initDailyActivityLog = async () => {
//   const today = new Date().toISOString().split("T")[0];
//   const customers = await getAllCustomers();

//   for (let customer of customers) {
//     const exists = await db.getAllAsync(
//       "SELECT * FROM activity_log WHERE customer_id = ? AND date = ?",
//       [customer.entity_id, today]
//     );
//     if (exists.length === 0) {
//       await db.runAsync(
//         "INSERT INTO activity_log (customer_id, customer_name, date) VALUES (?, ?, ?)",
//         [customer.entity_id, customer.name, today]
//       );
//     }
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

// // Optional: reset all customers to 'Unvisited' at the start of a new day
// export const resetDailyCustomerStatus = async () => {
//   await db.runAsync("UPDATE customer SET visited = 'Unvisited'");
//   await initDailyActivityLog();
// };

// // Get activity log for today
// export const getTodayActivityLog = async () => {
//   const today = new Date().toISOString().split("T")[0];
//   return await db.getAllAsync(
//     "SELECT * FROM activity_log WHERE date = ? ORDER BY customer_id ASC",
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


// // ---------------------- ITEM FUNCTIONS ----------------------
// export const getItems = async (query = "") => {
//   return await db.getAllAsync(
//     "SELECT * FROM items WHERE name LIKE ? ORDER BY id DESC",
//     [`%${query}%`]
//   );
// };

// export const addItem = async (name, price, image = "") => {
//   await db.runAsync("INSERT INTO items (name, price, image) VALUES (?, ?, ?)", [
//     name,
//     price,
//     image,
//   ]);
// };

// // ---------------------- ORDER BOOKING FUNCTIONS ----------------------

// // Helper to get current local datetime
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

// // Add main order (returns booking_id)
// export const addOrderBooking = async (order) => {
//   const result = await db.runAsync(
//     `INSERT INTO order_booking (order_date, customer_id, order_no, created_by_id, created_date)
//      VALUES (?, ?, ?, ?, ?)`,
//     [
//       order.order_date,
//       order.customer_id,
//       order.order_no,
//       order.created_by_id,
//       order.created_date,
//     ]
//   );

//    const bookingId = result.lastInsertRowId;

//   // ✅ Get current local datetime
//   const now = getCurrentDateTime();
//   const today = now.split(" ")[0]; // extract YYYY-MM-DD for activity_log

//   // Automatically mark customer as visited and update last_seen
//   await db.runAsync(
//     "UPDATE customer SET visited = 'Visited', last_seen = ? WHERE entity_id = ?",
//     [now, order.customer_id]
//   );

//   // Update daily activity log
//   await db.runAsync(
//     "UPDATE activity_log SET status = 'Visited' WHERE customer_id = ? AND date = ?",
//     [order.customer_id, today]
//   );

//   return bookingId;
// };

// // Add order booking line — fixed to ensure data is committed
// export const addOrderBookingLine = async (line) => {
//   await db.execAsync("BEGIN TRANSACTION;");
//   try {
//     await db.runAsync(
//       `INSERT INTO order_booking_line (booking_id, item_id, order_qty, unit_price, amount)
//        VALUES (?, ?, ?, ?, ?)`,
//       [
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
//     ORDER BY ob.booking_id DESC;
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
//   await db.runAsync(
//     `UPDATE order_booking_line 
//      SET order_qty = ?, amount = ?
//      WHERE line_id = ?`,
//     [data.order_qty, data.amount, lineId]
//   );
// };

// // ---------------------- DELETE ORDER LINE ----------------------
// export const deleteOrderBookingLine = async (booking_line_id) => {
//   await db.runAsync("DELETE FROM order_booking_line WHERE line_id = ?", [
//     booking_line_id,
//   ]);
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

// // ---------------------- RECENT ACTIVITY ----------------------

// export const initRecentActivityTable = async () => {
//   try {
//     await db.execAsync(`
//       CREATE TABLE IF NOT EXISTS recent_activity (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         booking_id INTEGER,
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
//   const date = new Date().toISOString();
//   await db.runAsync(
//     `INSERT INTO recent_activity (booking_id, customer_name, item_count, total_amount, activity_date)
//      VALUES (?, ?, ?, ?, ?)`,
//     [booking_id, customer_name, item_count, total_amount, date]
//   );
// };


// // Get all recent activities (latest first)
// export const getRecentActivities = async () => {
//   return await db.getAllAsync(`
//     SELECT * FROM recent_activity
//     ORDER BY id ASC
//   `);
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
//        SET latitude = ?, longitude = ?, last_seen = ?, location_status = ? 
//        WHERE entity_id = ?`,
//       [latitude, longitude, last_seen, status, customer_id]
//     );
//     console.log(`Customer ${customer_id} location, last_seen, and status updated.`);
//   } catch (error) {
//     console.error("Error updating customer location, last_seen, and status:", error);
//   }
// };


// export const addCustomerReceipt = async ({ customer_id, cash_bank_id, amount, note, attachment }) => {
//   return await db.runAsync(
//     `INSERT INTO customerReceipts (customer_id, cash_bank_id, amount, note, attachment)
//      VALUES (?, ?, ?, ?, ?)`,
//     [customer_id, cash_bank_id, amount, note, attachment]
//   );
// };








