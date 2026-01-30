import AsyncStorage from "@react-native-async-storage/async-storage";

export const sendStatusToBackend = async (status) => {
  try {
    const baseUrl = await AsyncStorage.getItem("dynamic_connection_url");
    const entityId = await AsyncStorage.getItem("current_user_id");

    if (!baseUrl || !entityId) {
      console.log("⚠️ Missing baseUrl or entityId");
      return;
    }

    const payload = {
      entity_id: entityId,
      status, // "active" | "inactive"
      last_seen: new Date().toISOString(),
      source: "mobile_app",
    };

    console.log("📤 Sending status to backend:", payload);

    const res = await fetch(
      `${baseUrl}/api/order-booking/check-connection`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const result = await res.json();
    console.log("📥 Status response:", result);
  } catch (error) {
    console.log("❌ Failed to send status:", error.message);
  }
};
