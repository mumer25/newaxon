import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { updateCustomerLocationWithLastSeen } from "../db/database";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function UpdateLocationMapScreen({ route, navigation }) {
  const { customer } = route.params;
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  // GET CURRENT LOCATION
  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location permission is required.");
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (err) {
        console.log("Error getting location:", err);
      }
    };

    fetchLocation();
  }, []);

  // TAP ON MAP TO SELECT LOCATION
  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
  };

  // UPDATE LOCATION
  const handleUpdateLocation = async () => {
    const finalLocation = selectedLocation || currentLocation;

    if (!finalLocation) {
      Alert.alert("Location not available", "Waiting for GPS signal...");
      return;
    }

    try {
      await updateCustomerLocationWithLastSeen(
        customer.entity_id,
        finalLocation.latitude,
        finalLocation.longitude,
        "Updated"
      );

      Alert.alert("Success", `${customer.name}'s location has been updated!`);
      navigation.replace("Update Location", { reload: true });
    } catch (error) {
      console.error("Error updating location:", error);
      Alert.alert("Error", "Failed to update location.");
    }
  };

  if (!currentLocation) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text>Fetching current location...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={handleMapPress} // ✅ Register taps
          >
            {/* CURRENT LOCATION */}
            <Marker
              coordinate={currentLocation}
              title="You are here"
              pinColor="blue"
            />

            {/* CUSTOMER LAST LOCATION */}
            {customer.latitude && customer.longitude && (
              <Marker
                coordinate={{
                  latitude: parseFloat(customer.latitude),
                  longitude: parseFloat(customer.longitude),
                }}
                title={`${customer.name}'s Last Location`}
                pinColor={customer.location_status === "Updated" ? "#cce5ff" : "red"}
              />
            )}

            {/* SELECTED LOCATION */}
            {selectedLocation && (
              <Marker
                coordinate={selectedLocation}
                title="Selected Location"
                pinColor="green"
              />
            )}
          </MapView>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdateLocation}
          >
            <Text style={styles.updateButtonText}>
              {selectedLocation
                ? "Update Selected Location"
                : "Update Current Location"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width, height: height - 100 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 20 : 0,
  },
  updateButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#007bff",
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});






// import React, { useEffect, useState } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   StyleSheet,
//   Alert,
//   Platform,
//   Dimensions,
//   KeyboardAvoidingView,
// } from "react-native";
// import MapView, { Marker } from "react-native-maps";
// import * as Location from "expo-location";
// import { updateCustomerLocationWithLastSeen } from "../database";
// import { SafeAreaView } from "react-native-safe-area-context";

// const { width, height } = Dimensions.get("window");

// export default function UpdateLocationMapScreen({ route, navigation }) {
//   const { customer } = route.params;
//   const [currentLocation, setCurrentLocation] = useState(null);

//   useEffect(() => {
//     const fetchLocation = async () => {
//       try {
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== "granted") {
//           Alert.alert("Permission Denied", "Location permission is required.");
//           return;
//         }

//         const loc = await Location.getCurrentPositionAsync({
//           accuracy: Location.Accuracy.High,
//         });

//         setCurrentLocation({
//           latitude: loc.coords.latitude,
//           longitude: loc.coords.longitude,
//         });
//       } catch (err) {
//         console.log("Error getting location:", err);
//       }
//     };

//     fetchLocation();
//   }, []);

//  const handleUpdateLocation = async () => {
//   if (!currentLocation) {
//     Alert.alert("Location not available", "Waiting for GPS signal...");
//     return;
//   }

//   try {
//     await updateCustomerLocationWithLastSeen(
//       customer.entity_id,
//       currentLocation.latitude,
//       currentLocation.longitude,
//       "Updated" // mark as updated
//     );

//     Alert.alert("Success", `${customer.name}'s location has been updated!`);
    
//     // Pass back a flag to reload data in previous screen
//     navigation.navigate("Update Location", { reload: true });

//   } catch (error) {
//     console.error("Error updating location:", error);
//     Alert.alert("Error", "Failed to update location.");
//   }
// };


//   if (!currentLocation) {
//     return (
//       <SafeAreaView style={styles.loadingContainer}>
//         <Text>Fetching current location...</Text>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{ flex: 1 }} edges={["bottom","left","right"]}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === "ios" ? "padding" : undefined}
//         keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
//       >
//         <View style={styles.container}>
//           <MapView
//             style={styles.map}
//             initialRegion={{
//               latitude: currentLocation.latitude,
//               longitude: currentLocation.longitude,
//               latitudeDelta: 0.01,
//               longitudeDelta: 0.01,
//             }}
//           >
//             {/* Current Location */}
//             <Marker
//               coordinate={currentLocation}
//               title="You are here"
//               pinColor="blue"
//             />

//             {/* Customer's Last Known Location */}
//             {customer.latitude && customer.longitude && (
//               <Marker
//                 coordinate={{
//                   latitude: parseFloat(customer.latitude),
//                   longitude: parseFloat(customer.longitude),
//                 }}
//                 title={`${customer.name}'s Last Location`}
//                 pinColor={customer.location_status === "Updated" ? "#cce5ff" : "red"}
//               />
//             )}
//           </MapView>

//           <TouchableOpacity
//             style={styles.updateButton}
//             onPress={handleUpdateLocation}
//           >
//             <Text style={styles.updateButtonText}>Update Location</Text>
//           </TouchableOpacity>
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   map: { width, height: height - 100 },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     paddingTop: Platform.OS === "android" ? 20 : 0,
//   },
//   updateButton: {
//     position: "absolute",
//     bottom: 20,
//     left: 20,
//     right: 20,
//     backgroundColor: "#007bff",
//     paddingVertical: 14,
//     borderRadius: 10,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   updateButtonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },
// });
