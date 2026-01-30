import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/HomeScreen";
import { Home, QrCode } from "lucide-react-native";
// import ScanQRScreen from "../screens/QRScanScreen";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1E90FF",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: { height: 95 },
      }}
    >
      <Tab.Screen
        name="TabHome"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={22} />,
          tabBarStyle: { display: "none" },
        }}
      />

      {/* <Tab.Screen
        name="QR Scan"
        component={ScanQRScreen}
        options={{
          tabBarLabel: "QR Scan",
          tabBarIcon: ({ color }) => (
            <QrCode color={color} size={22} />
          ),
        }}
      /> */}
    </Tab.Navigator>
  );
}
