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

export const handleSync = async (onOrderSynced, navigation) => {
  const db = getDB();

  console.log("🔍 handleSync called with navigation:", navigation ? "✅ Available" : "❌ Not available");

  const logout = async () => {
    try {
      // Clear session ID from DB
      await logoutDB();
      console.log("✅ DB session cleared");

      // Clear AsyncStorage
      await AsyncStorage.multiRemove([
        "logged_in",
        "qr_scanned",
        "session_id",
        "current_user_id",
        "user_name",
        "dynamic_connection_url",
      ]);
      console.log("✅ AsyncStorage cleared");

      // Update login status in your app
      await setLoginStatus(false);
      console.log("✅ Login status set to false");

      // Close user DB
      await closeUserDB();
      console.log("✅ User DB closed");

      // Navigate to QR Scan screen
      if (navigation) {
        console.log("🔄 Navigating to QRScan...");
        navigation.reset({ index: 0, routes: [{ name: "QRScan" }] });
        console.log("✅ Navigation reset to QRScan");
      } else {
        console.warn("⚠️ Navigation object not available - cannot navigate to QRScan");
      }
    } catch (logoutError) {
      console.error("❌ Error during logout:", logoutError);
    }
  };

  try {
    // 🔐 Get session info
    const session = await getSessionID();
    if (!session?.session_id) {
      // Session missing → logout
      console.log("❌ Session expired, logging out...");
      await logout();
      return {
        success: false,
        message: "Session expired. Please login again.",
        syncedCount: 0,
      };
    }

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

    // 🔐 CHECK FOR SESSION MISMATCH
    if (
      result.error?.includes("Session mismatch") ||
      result.error?.includes("session_id") ||
      result.sessionValid === false
    ) {
      console.log("❌ Session ID mismatch detected! Logging out...");
      await logout();
      return {
        success: false,
        message: "Session ID mismatch. Please login again.",
        syncedCount: 0,
        sessionMismatch: true,
      };
    }

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
