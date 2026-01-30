import React, { useState } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Home, BarChart2, Menu } from "lucide-react-native"; // icons

export default function CustomBottomTab({ navigation }) {
  const [activeTab, setActiveTab] = useState("Home");

  const handleTabPress = (tabName, screen) => {
    setActiveTab(tabName);
    navigation.navigate(screen);
  };

  return (
    <View style={styles.container}>
      {/* Analytics Tab */}
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => handleTabPress("Analytics", "AnalyticsScreen")}
      >
        <BarChart2
          size={20}
          color={activeTab === "Analytics" ? "#fff" : "#999"}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === "Analytics" && styles.activeText,
          ]}
        >
          Analytics
        </Text>
      </TouchableOpacity>

      {/* Home Tab */}
      <TouchableOpacity
        style={[styles.tabButton, styles.middleTab]}
        onPress={() => handleTabPress("Home", "Home")}
      >
        <Home size={24} color={activeTab === "Home" ? "#fff" : "#999"} />
        <Text
          style={[styles.tabText, activeTab === "Home" && styles.activeText]}
        >
          Home
        </Text>
      </TouchableOpacity>

      {/* Profile Tab */}
      <TouchableOpacity
        style={styles.tabButton}
        onPress={() => handleTabPress("Profile", "ProfileScreen")}
      >
        <Menu size={20} color={activeTab === "Profile" ? "#fff" : "#999"} />
        <Text
          style={[
            styles.tabText,
            activeTab === "Profile" && styles.activeText,
          ]}
        >
          Profile
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute", // fixed at bottom
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    backgroundColor: "rgba(30, 41, 59, 0.8)", // same dark color but 80% transparent
    borderRadius: 30,
    paddingVertical: 8,
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
  },
  middleTab: {
    backgroundColor: "#3b82f6", // same blue highlight
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  tabText: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  activeText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
