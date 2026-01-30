import { getDB, getCurrentUserId } from "./dbManager"; // adjust path
import { v4 as uuidv4 } from "uuid";

// ---------------------- SAVE APP ACTIVITY ----------------------
export const saveAppActivity = async (lat, lng) => {
  try {
    const db = getDB();                  
    const userId = await getCurrentUserId();   // ✅ Await the Promise
    if (!userId) throw new Error("User ID not found");
    const id = uuidv4();
    const dateTime = new Date().toISOString();

    // Log full activity for debugging
    console.log("Saving activity:", {
      id,
      userId,
      latitude: lat,
      longitude: lng,
      date_time: dateTime,
    });

    // Save into DB
    await db.runAsync(
      `
      INSERT INTO app_activity 
      (id, user_id, latitude, longitude, date_time, synced)
      VALUES (?, ?, ?, ?, ?, 0)
      `,
      [id, userId, lat, lng, dateTime]
    );

    console.log("✅ Activity saved:", id);
  } catch (err) {
    console.log("❌ Error saving activity:", err);
  }
};

// ---------------------- SHOW APP ACTIVITY LOGS ----------------------
export const showAppActivityLogs = async () => {
  try {
    const db = getDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM app_activity ORDER BY date_time ASC"
    );

    console.log("======== APP ACTIVITY LOGS ========");
    if (!rows || rows.length === 0) {
      console.log("No activity found.");
    } else {
      rows.forEach((row, index) => {
        // Make sure user_id is a string/number, not a Promise or object
        const safeUserId =
          typeof row.user_id === "object" && row.user_id !== null
            ? JSON.stringify(row.user_id)
            : row.user_id;

        console.log(
          `${index + 1}. User: ${safeUserId} | Lat: ${row.latitude} | Long: ${row.longitude} | Time: ${row.date_time}`
        );
      });
    }
    console.log("===============================================");

    return rows;
  } catch (error) {
    console.log("❌ Error reading app_activity:", error);
  }
};




// Updated 15-12-2025
// import { getDB, getCurrentUserId } from "./dbManager"; // adjust path
// import { v4 as uuidv4 } from "uuid";

// // App Activity Status
// export const saveAppActivity = async (lat, lng) => {
//   try {
//     const db = getDB();                  // ensures DB is opened
//     const userId = getCurrentUserId();   // get current logged-in user
//     const id = uuidv4();
//     const dateTime = new Date().toISOString();

//     // Log full activity
//     console.log("Saving activity:", {
//       id,
//       userId,
//       latitude: lat,
//       longitude: lng,
//       date_time: dateTime,
//     });

//     // Save into DB
//     await db.runAsync(
//       `
//       INSERT INTO app_activity 
//       (id, user_id, latitude, longitude, date_time, synced)
//       VALUES (?, ?, ?, ?, ?, 0)
//       `,
//       [id, userId, lat, lng, dateTime]
//     );

//     console.log("Activity saved:", id);
//   } catch (err) {
//     console.log("Error saving activity:", err);
//   }
// };

// // Show logs
// export const showAppActivityLogs = async () => {
//   try {
//     const db = getDB();
//     const rows = await db.getAllAsync(
//       "SELECT * FROM app_activity ORDER BY date_time ASC"
//     );

//     console.log("======== APP ACTIVITY LOGS ========");
//     if (rows.length === 0) {
//       console.log("No activity found.");
//     } else {
//       rows.forEach((row, index) => {
//         console.log(
//           `${index + 1}. User: ${row.user_id} | Lat: ${row.latitude} | Long: ${row.longitude} | Time: ${row.date_time}`
//         );
//       });
//     }
//     console.log("==================================================================================");

//     return rows;
//   } catch (error) {
//     console.log("Error reading app_activity:", error);
//   }
// };