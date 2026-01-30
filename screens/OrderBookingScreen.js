import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function OrderBookingScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Main Big Button */}
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.shadowWrapper} 
        onPress={() => navigation.navigate("Products")}
      >
        <LinearGradient
          colors={["#57C785", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mainButton}
        >
          <Text style={styles.mainButtonText}>Order Now</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Two Smaller Buttons */}
      <View style={styles.subButtonContainer}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.shadowWrapperSmall}
          onPress={() => navigation.navigate("AddItem")}
        >
          <LinearGradient
            colors={["#8B5CF6", "#3B82F6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.subButton}
          >
            <Text style={styles.subButtonText}>Add Items</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.shadowWrapperSmall}
          onPress={() => navigation.navigate("AddCustomer")}
        >
          <LinearGradient
            colors={["#8B5CF6", "#3B82F6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.subButton}
          >
            <Text style={styles.subButtonText}>Add Customer</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  /** MAIN BUTTON **/
  shadowWrapper: {
    borderRadius: 16,
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    marginBottom: 40,
  },
  mainButton: {
    width: 300,
    paddingVertical: 26,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  mainButtonText: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: 0.8,
    fontStyle: "italic",
  },

  /** SUB BUTTONS **/
  subButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginBottom: 50,
  },
  shadowWrapperSmall: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  subButton: {
    width: 130,
    paddingVertical: 22,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  subButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  /** BACK **/
  backButton: {
    marginTop: 50,
  },
  backText: {
    color: "#1E3A8A",
    fontWeight: "600",
    fontSize: 16,
  },
});
