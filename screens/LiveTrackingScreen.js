
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Keyboard,
  Dimensions,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import haversine from "haversine";
import PolylineDecoder from "@mapbox/polyline";
import { getAllCustomers, searchCustomers, getAllOrders } from "../db/database";
import { SafeAreaView } from "react-native-safe-area-context";
import MapPin from "../components/MapPin";

const GOOGLE_MAPS_API_KEY = "AIzaSyCpXDv4FldOMug08hNGFwAn7fGcviuLHF4";
const { height } = Dimensions.get("window");

export default function LiveTrackingScreen({ route }) {
  const mapRef = useRef(null);
  const passedCustomer = route?.params?.customer || null;
  const passedCustomerUsed = useRef(false);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedCustomerOrders, setSelectedCustomerOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [distance, setDistance] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [tracking, setTracking] = useState(false);

  // ----------------------- Location Setup -----------------------
  useEffect(() => {
    let subscription;

    const initLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission Denied",
            "App requires location permission to work properly."
          );
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        // Watch location for live updates
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, distanceInterval: 5 },
          (locUpdate) => {
            const newLoc = {
              latitude: locUpdate.coords.latitude,
              longitude: locUpdate.coords.longitude,
            };
            setCurrentLocation(newLoc);

            // Update route if tracking
            if (tracking && selectedCustomer) {
              const customerLoc = {
                latitude: parseFloat(selectedCustomer.latitude),
                longitude: parseFloat(selectedCustomer.longitude),
              };
              fetchRoute(newLoc, customerLoc);
              updateDistance(newLoc, customerLoc);
            }
          }
        );
      } catch (err) {
        console.log("Location error:", err);
      }
    };

    initLocation();

    return () => {
      if (subscription) subscription.remove();
    };
  }, [tracking, selectedCustomer]);

  // ----------------------- Fetch Customers -----------------------
  useEffect(() => {
    const fetchCustomers = async () => {
      const data = await getAllCustomers();
      setCustomers(data);
      setFilteredCustomers(data);
    };
    fetchCustomers();
  }, []);

  // ----------------------- Handle Passed Customer -----------------------
  useEffect(() => {
    if (passedCustomer && !passedCustomerUsed.current && currentLocation) {
      if (passedCustomer.latitude != null && passedCustomer.longitude != null) {
        passedCustomerUsed.current = true;
        setSelectedCustomer(passedCustomer);
        setTracking(true);

        const customerLoc = {
          latitude: parseFloat(passedCustomer.latitude),
          longitude: parseFloat(passedCustomer.longitude),
        };

        fetchRoute(currentLocation, customerLoc);
        updateDistance(currentLocation, customerLoc);

        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: customerLoc.latitude,
              longitude: customerLoc.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            1000
          );
        }
      }
    }
  }, [passedCustomer, currentLocation]);

  // ----------------------- Fetch Customer Orders on Selection -----------------------
  useEffect(() => {
    const fetchCustomerOrders = async () => {
      if (!selectedCustomer) {
        setSelectedCustomerOrders([]);
        return;
      }

      const allOrders = await getAllOrders();
      const customerOrders = allOrders.filter(
        (order) => order.customer_name === selectedCustomer.name
      );
      setSelectedCustomerOrders(customerOrders);
    };

    fetchCustomerOrders();
  }, [selectedCustomer]);

  // ----------------------- Search Customers -----------------------
  const handleSearch = async (text) => {
    setSearchQuery(text);
    if (text.trim() === "") {
      setFilteredCustomers(customers);
      setSelectedCustomer(null);
      setRouteCoords([]);
      setTracking(false);
    } else {
      const data = await searchCustomers(text);
      setFilteredCustomers(data);

      if (
        data.length === 1 &&
        data[0].latitude != null &&
        data[0].longitude != null
      ) {
        const customer = data[0];
        setSelectedCustomer(customer);
        setTracking(true);

        const customerLoc = {
          latitude: parseFloat(customer.latitude),
          longitude: parseFloat(customer.longitude),
        };

        updateDistance(currentLocation, customerLoc);
        fetchRoute(currentLocation, customerLoc);

        if (mapRef.current) {
          mapRef.current.animateToRegion(
            {
              latitude: customerLoc.latitude,
              longitude: customerLoc.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            },
            1000
          );
        }
      } else {
        setSelectedCustomer(null);
      }
    }
  };

  // ----------------------- Fetch Route -----------------------
  const fetchRoute = async (origin, destination) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes.length) {
        const points = PolylineDecoder.decode(
          data.routes[0].overview_polyline.points
        );
        const coords = points.map((point) => ({
          latitude: point[0],
          longitude: point[1],
        }));
        setRouteCoords(coords);
      }
    } catch (error) {
      console.log("Directions error:", error);
    }
  };

  // ----------------------- Update Distance -----------------------
  const updateDistance = (origin, destination) => {
    const dist = haversine(origin, destination, { unit: "km" }).toFixed(2);
    setDistance(dist);
  };

  // ----------------------- Track Customer -----------------------
  const handleTrack = async () => {
    if (!selectedCustomer) {
      Alert.alert("Select Customer", "Please select a customer to track.");
      return;
    }

    if (!currentLocation) {
      Alert.alert(
        "Location not available",
        "Waiting for GPS signal. Try again in a moment."
      );
      return;
    }

    setTracking(true);

    const customerLoc = {
      latitude: parseFloat(selectedCustomer.latitude),
      longitude: parseFloat(selectedCustomer.longitude),
    };

    updateDistance(currentLocation, customerLoc);
    fetchRoute(currentLocation, customerLoc);

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: customerLoc.latitude,
          longitude: customerLoc.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }

    Keyboard.dismiss();
  };

  // ----------------------- Clear Tracking -----------------------
  const clearTracking = () => {
    setSelectedCustomer(null);
    setRouteCoords([]);
    setDistance(null);
    setTracking(false);
    setFilteredCustomers(customers);
    setSearchQuery("");
    passedCustomerUsed.current = true;

    if (mapRef.current && currentLocation) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000
      );
    }
  };

  // ----------------------- Marker Press -----------------------
  const handleMarkerPress = (cust) => {
    setSelectedCustomer(cust);
    setTracking(true);
    const customerLoc = {
      latitude: parseFloat(cust.latitude),
      longitude: parseFloat(cust.longitude),
    };

    if (currentLocation) {
      updateDistance(currentLocation, customerLoc);
      fetchRoute(currentLocation, customerLoc);
    }

    if (mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: customerLoc.latitude,
          longitude: customerLoc.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  };

  // ----------------------- Render -----------------------
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* Top Search Bar */}
          {/* <View style={styles.topBar}>
            <View style={styles.searchSection}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search customer..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={handleSearch}
              />
              <TouchableOpacity
                style={[
                  styles.trackButton,
                  { backgroundColor: selectedCustomer ? "#007bff" : "#ccc" },
                ]}
                onPress={handleTrack}
                disabled={!selectedCustomer}
              >
                <Text style={styles.trackText}>Track</Text>
              </TouchableOpacity>
            </View>
          </View> */}

          <View style={styles.topBar}>
  <View style={styles.searchSection}>
    <TextInput
      style={styles.searchInput}
      placeholder="Search customer..."
      placeholderTextColor="#999"
      value={searchQuery}
      onChangeText={handleSearch}
    />

    {/* Clear Icon (inside the TextInput area on right) */}
    {searchQuery.length > 0 && (
      <TouchableOpacity
        style={styles.clearSearchBtn}
        onPress={() => handleSearch("")}
      >
        <Text onPress={clearTracking} style={styles.clearSearchText}>✕</Text>
      </TouchableOpacity>
    )}

    {/* Track Button */}
    <TouchableOpacity
      style={[
        styles.trackButton,
        { backgroundColor: selectedCustomer ? "#007bff" : "#ccc" },
      ]}
      onPress={handleTrack}
      disabled={!selectedCustomer}
    >
      <Text style={styles.trackText}>Track</Text>
    </TouchableOpacity>
  </View>
</View>


          {/* Customer List */}
          {searchQuery.length > 0 && filteredCustomers.length > 0 && (
            <FlatList
              data={filteredCustomers}
              keyExtractor={(item, index) =>
                item?.entity_id ? item.entity_id.toString() : `dummy-${index}`
              }
              renderItem={({ item }) =>
                item ? (
                  <TouchableOpacity
                    style={styles.customerItem}
                    onPress={() => {
                      setSelectedCustomer(item);
                      setSearchQuery("");
                      setFilteredCustomers([item]);
                      Keyboard.dismiss();

                      if (currentLocation && item.latitude && item.longitude) {
                        setTracking(true);

                        const customerLoc = {
                          latitude: parseFloat(item.latitude),
                          longitude: parseFloat(item.longitude),
                        };

                        updateDistance(currentLocation, customerLoc);
                        fetchRoute(currentLocation, customerLoc);

                        if (mapRef.current) {
                          mapRef.current.animateToRegion(
                            {
                              latitude: customerLoc.latitude,
                              longitude: customerLoc.longitude,
                              latitudeDelta: 0.01,
                              longitudeDelta: 0.01,
                            },
                            1000
                          );
                        }
                      }
                    }}
                  >
                    <Text style={styles.customerName}>{item.name}</Text>
                  </TouchableOpacity>
                ) : null
              }
              style={styles.customerList}
            />
          )}

        {/* Map */}
{currentLocation ? (
  <MapView
    ref={mapRef}
    style={styles.map}
    showsUserLocation
    showsMyLocationButton
    initialRegion={{
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }}
  >
    {/* {(selectedCustomer ? [selectedCustomer] : filteredCustomers).map((cust) => { */}

  {(selectedCustomer
  ? [selectedCustomer]
  : filteredCustomers.slice(0, 100) // limit marker count
).map((cust) => {
  if (!cust?.latitude || !cust?.longitude) return null;

  const lat = parseFloat(cust.latitude);
  const lng = parseFloat(cust.longitude);
  const key = String(cust.entity_id ?? cust.name);

 // Select image based on status
  let pinImage;
  if (selectedCustomer?.entity_id === cust.entity_id) {
    pinImage = require("../assets/MapPins/blue.png");
  } else if (cust.visited === "Visited") {
    pinImage = require("../assets/MapPins/green.png");
  } else {
    pinImage = require("../assets/MapPins/red.png");
  }

  return (

     <Marker
      key={key}
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={() => handleMarkerPress(cust)}
      image={pinImage}  // <-- use custom PNG
    />

    /* <Marker
      key={key}
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={() => handleMarkerPress(cust)}
      pinColor={
        selectedCustomer?.entity_id === cust.entity_id
          ? "#007bff"       // Blue for selected customer
          : cust.visited === "Visited"
          ? "#008000"       // Green for visited
          : "#FF0000"       // Red for not visited
      }
    /> */
  );
})}


    {routeCoords.length > 0 && (
      <Polyline
        coordinates={routeCoords}
        strokeColor="#007bff"
        strokeWidth={4}
      />
    )}
  </MapView>
) : (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingText}>Getting your location...</Text>
  </View>
)}

          {/* ------------------ Info Box ------------------ */}
      {distance && selectedCustomer && (
  <View style={styles.infoBox}>
    {/* Clear Button at top-right */}
    <TouchableOpacity onPress={clearTracking} style={styles.clearBtn}>
      <Text style={styles.clearText}>✕</Text>
    </TouchableOpacity>

    <View style={styles.infoContent}>
      {/* Customer Info */}
      <Text style={styles.infoTitle}>Tracking Customer</Text>
      <Text style={styles.infoTextName}>{selectedCustomer.name}</Text>

      {/* Stats */}
      <View style={styles.infoStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Orders</Text>
          <Text style={styles.statValue}>{selectedCustomerOrders.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Amount</Text>
          <Text style={styles.statValue}>
            Rs.{" "}
            {selectedCustomerOrders
              .reduce((sum, o) => sum + parseFloat(o.total_amount), 0)
              .toFixed(2)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Last Visit</Text>
          {selectedCustomerOrders.length > 0 ? (
            <>
              <Text style={styles.statValue}>
                {new Date(selectedCustomerOrders[0].order_date).toLocaleDateString()}
              </Text>
              <Text style={styles.statValueTime}>
                {new Date(selectedCustomerOrders[0].order_date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </>
          ) : (
            <Text style={styles.statValue}>N/A</Text>
          )}
        </View>
      </View>

      {/* Distance */}
      <Text style={styles.infoDistance}>Distance: {distance} km away</Text>
    </View>
  </View>
)}


        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ----------------------- Styles -----------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  topBar: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    width: "100%",
    paddingHorizontal: 15,
    zIndex: 20,
  },
  searchSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#f3f3f3",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    color: "#333",
  },
  trackButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  clearSearchBtn: {
  position: "absolute",
  right: 90, // adjust to not overlap with Track button
  height: "100%",
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 8,
  zIndex: 10,
},
clearSearchText: {
  fontSize: 18,
  color: "#999",
  fontWeight: "600",
},

  trackText: { color: "#fff", fontWeight: "bold" },
  customerList: {
    position: "absolute",
    top: Platform.OS === "ios" ? 100 : 80,
    left: 15,
    right: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    maxHeight: height * 0.25,
    zIndex: 30,
  },
  customerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  customerName: { fontSize: 16, color: "#333" },
  map: { flex: 1 },
  infoBox: {
  position: "absolute",
  bottom: 20,
  left: 15,
  right: 15,
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 16,
  shadowColor: "#000",
  shadowOpacity: 0.2,
  shadowOffset: { width: 0, height: 5 },
  shadowRadius: 8,
  elevation: 8,
},
infoContent: {
  flexDirection: "column",
  marginTop: 12, // leave space for button
},
clearBtn: {
  position: "absolute",
  top: 10,
  right: 10,
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: "#eee",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 10,
},
clearText: { fontSize: 18, color: "#555", fontWeight: "700" },
infoTitle: {
  fontSize: 14,
  color: "#555",
  marginBottom: 4,
  textTransform: "uppercase",
  fontWeight: "600",
},
infoTextName: {
  fontSize: 20,
  fontWeight: "700",
  color: "#007bff",
  marginBottom: 12,
},
infoStats: {
  flexDirection: "row",
  flexWrap: "wrap", // allows wrapping on small screens
  justifyContent: "space-between",
  marginBottom: 8,
},
statItem: {
  flex: 1,
  minWidth: "28%", // allows 3 items per row on larger screens, wraps on smaller
  marginHorizontal: 4,
  marginVertical: 4,
  paddingVertical: 10,
  backgroundColor: "#f3f6fb",
  borderRadius: 12,
  alignItems: "center",
},
statLabel: {
  fontSize: 12,
  color: "#888",
  marginBottom: 4,
  fontWeight: "500",
  textAlign: "center",
},
statValue: {
  fontSize: 12,
  fontWeight: "600",
  color: "#333",
  textAlign: "center",
},
statValueTime: {
  fontSize: 12,
  fontWeight: "500",
  color: "#555",
  textAlign: "center",
  marginTop: 2,
},
infoDistance: {
  fontSize: 14,
  color: "#007bff",
  fontWeight: "600",
  marginTop: 8,
  textAlign: "center",
},

  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#333" },
});



// // updated 08-12-2025

// import React, { useEffect, useState, useRef } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   FlatList,
//   Keyboard,
//   Dimensions,
//   Platform,
//   Alert,
//   KeyboardAvoidingView,
// } from "react-native";
// import MapView, { Marker, Polyline } from "react-native-maps";
// import * as Location from "expo-location";
// import haversine from "haversine";
// import PolylineDecoder from "@mapbox/polyline";
// import { getAllCustomers, searchCustomers, getAllOrders } from "../db/database";
// import { SafeAreaView } from "react-native-safe-area-context";
// import MapPin from "../components/MapPin";

// const GOOGLE_MAPS_API_KEY = "AIzaSyCpXDv4FldOMug08hNGFwAn7fGcviuLHF4";
// const { height } = Dimensions.get("window");

// export default function LiveTrackingScreen({ route }) {
//   const mapRef = useRef(null);
//   const passedCustomer = route?.params?.customer || null;
//   const passedCustomerUsed = useRef(false);

//   const [currentLocation, setCurrentLocation] = useState(null);
//   const [customers, setCustomers] = useState([]);
//   const [filteredCustomers, setFilteredCustomers] = useState([]);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);
//   const [selectedCustomerOrders, setSelectedCustomerOrders] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [distance, setDistance] = useState(null);
//   const [routeCoords, setRouteCoords] = useState([]);
//   const [tracking, setTracking] = useState(false);

//   // ----------------------- Location Setup -----------------------
//   useEffect(() => {
//     let subscription;

//     const initLocation = async () => {
//       try {
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== "granted") {
//           Alert.alert(
//             "Permission Denied",
//             "App requires location permission to work properly."
//           );
//           return;
//         }

//         const loc = await Location.getCurrentPositionAsync({
//           accuracy: Location.Accuracy.High,
//         });

//         setCurrentLocation({
//           latitude: loc.coords.latitude,
//           longitude: loc.coords.longitude,
//         });

//         // Watch location for live updates
//         subscription = await Location.watchPositionAsync(
//           { accuracy: Location.Accuracy.High, distanceInterval: 5 },
//           (locUpdate) => {
//             const newLoc = {
//               latitude: locUpdate.coords.latitude,
//               longitude: locUpdate.coords.longitude,
//             };
//             setCurrentLocation(newLoc);

//             // Update route if tracking
//             if (tracking && selectedCustomer) {
//               const customerLoc = {
//                 latitude: parseFloat(selectedCustomer.latitude),
//                 longitude: parseFloat(selectedCustomer.longitude),
//               };
//               fetchRoute(newLoc, customerLoc);
//               updateDistance(newLoc, customerLoc);
//             }
//           }
//         );
//       } catch (err) {
//         console.log("Location error:", err);
//       }
//     };

//     initLocation();

//     return () => {
//       if (subscription) subscription.remove();
//     };
//   }, [tracking, selectedCustomer]);

//   // ----------------------- Fetch Customers -----------------------
//   useEffect(() => {
//     const fetchCustomers = async () => {
//       const data = await getAllCustomers();
//       setCustomers(data);
//       setFilteredCustomers(data);
//     };
//     fetchCustomers();
//   }, []);

//   // ----------------------- Handle Passed Customer -----------------------
//   useEffect(() => {
//     if (passedCustomer && !passedCustomerUsed.current && currentLocation) {
//       if (passedCustomer.latitude != null && passedCustomer.longitude != null) {
//         passedCustomerUsed.current = true;
//         setSelectedCustomer(passedCustomer);
//         setTracking(true);

//         const customerLoc = {
//           latitude: parseFloat(passedCustomer.latitude),
//           longitude: parseFloat(passedCustomer.longitude),
//         };

//         fetchRoute(currentLocation, customerLoc);
//         updateDistance(currentLocation, customerLoc);

//         if (mapRef.current) {
//           mapRef.current.animateToRegion(
//             {
//               latitude: customerLoc.latitude,
//               longitude: customerLoc.longitude,
//               latitudeDelta: 0.01,
//               longitudeDelta: 0.01,
//             },
//             1000
//           );
//         }
//       }
//     }
//   }, [passedCustomer, currentLocation]);

//   // ----------------------- Fetch Customer Orders on Selection -----------------------
//   useEffect(() => {
//     const fetchCustomerOrders = async () => {
//       if (!selectedCustomer) {
//         setSelectedCustomerOrders([]);
//         return;
//       }

//       const allOrders = await getAllOrders();
//       const customerOrders = allOrders.filter(
//         (order) => order.customer_name === selectedCustomer.name
//       );
//       setSelectedCustomerOrders(customerOrders);
//     };

//     fetchCustomerOrders();
//   }, [selectedCustomer]);

//   // ----------------------- Search Customers -----------------------
//   const handleSearch = async (text) => {
//     setSearchQuery(text);
//     if (text.trim() === "") {
//       setFilteredCustomers(customers);
//       setSelectedCustomer(null);
//       setRouteCoords([]);
//       setTracking(false);
//     } else {
//       const data = await searchCustomers(text);
//       setFilteredCustomers(data);

//       if (
//         data.length === 1 &&
//         data[0].latitude != null &&
//         data[0].longitude != null
//       ) {
//         const customer = data[0];
//         setSelectedCustomer(customer);
//         setTracking(true);

//         const customerLoc = {
//           latitude: parseFloat(customer.latitude),
//           longitude: parseFloat(customer.longitude),
//         };

//         updateDistance(currentLocation, customerLoc);
//         fetchRoute(currentLocation, customerLoc);

//         if (mapRef.current) {
//           mapRef.current.animateToRegion(
//             {
//               latitude: customerLoc.latitude,
//               longitude: customerLoc.longitude,
//               latitudeDelta: 0.01,
//               longitudeDelta: 0.01,
//             },
//             1000
//           );
//         }
//       } else {
//         setSelectedCustomer(null);
//       }
//     }
//   };

//   // ----------------------- Fetch Route -----------------------
//   const fetchRoute = async (origin, destination) => {
//     try {
//       const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
//       const response = await fetch(url);
//       const data = await response.json();

//       if (data.routes.length) {
//         const points = PolylineDecoder.decode(
//           data.routes[0].overview_polyline.points
//         );
//         const coords = points.map((point) => ({
//           latitude: point[0],
//           longitude: point[1],
//         }));
//         setRouteCoords(coords);
//       }
//     } catch (error) {
//       console.log("Directions error:", error);
//     }
//   };

//   // ----------------------- Update Distance -----------------------
//   const updateDistance = (origin, destination) => {
//     const dist = haversine(origin, destination, { unit: "km" }).toFixed(2);
//     setDistance(dist);
//   };

//   // ----------------------- Track Customer -----------------------
//   const handleTrack = async () => {
//     if (!selectedCustomer) {
//       Alert.alert("Select Customer", "Please select a customer to track.");
//       return;
//     }

//     if (!currentLocation) {
//       Alert.alert(
//         "Location not available",
//         "Waiting for GPS signal. Try again in a moment."
//       );
//       return;
//     }

//     setTracking(true);

//     const customerLoc = {
//       latitude: parseFloat(selectedCustomer.latitude),
//       longitude: parseFloat(selectedCustomer.longitude),
//     };

//     updateDistance(currentLocation, customerLoc);
//     fetchRoute(currentLocation, customerLoc);

//     if (mapRef.current) {
//       mapRef.current.animateToRegion(
//         {
//           latitude: customerLoc.latitude,
//           longitude: customerLoc.longitude,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         },
//         1000
//       );
//     }

//     Keyboard.dismiss();
//   };

//   // ----------------------- Clear Tracking -----------------------
//   const clearTracking = () => {
//     setSelectedCustomer(null);
//     setRouteCoords([]);
//     setDistance(null);
//     setTracking(false);
//     setFilteredCustomers(customers);
//     setSearchQuery("");
//     passedCustomerUsed.current = true;

//     if (mapRef.current && currentLocation) {
//       mapRef.current.animateToRegion(
//         {
//           latitude: currentLocation.latitude,
//           longitude: currentLocation.longitude,
//           latitudeDelta: 0.05,
//           longitudeDelta: 0.05,
//         },
//         1000
//       );
//     }
//   };

//   // ----------------------- Marker Press -----------------------
//   const handleMarkerPress = (cust) => {
//     setSelectedCustomer(cust);
//     setTracking(true);
//     const customerLoc = {
//       latitude: parseFloat(cust.latitude),
//       longitude: parseFloat(cust.longitude),
//     };

//     if (currentLocation) {
//       updateDistance(currentLocation, customerLoc);
//       fetchRoute(currentLocation, customerLoc);
//     }

//     if (mapRef.current) {
//       mapRef.current.animateToRegion(
//         {
//           latitude: customerLoc.latitude,
//           longitude: customerLoc.longitude,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         },
//         1000
//       );
//     }
//   };

//   // ----------------------- Render -----------------------
//   return (
//     <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === "ios" ? "padding" : undefined}
//       >
//         <View style={styles.container}>
//           {/* Top Search Bar */}
//           {/* <View style={styles.topBar}>
//             <View style={styles.searchSection}>
//               <TextInput
//                 style={styles.searchInput}
//                 placeholder="Search customer..."
//                 placeholderTextColor="#999"
//                 value={searchQuery}
//                 onChangeText={handleSearch}
//               />
//               <TouchableOpacity
//                 style={[
//                   styles.trackButton,
//                   { backgroundColor: selectedCustomer ? "#007bff" : "#ccc" },
//                 ]}
//                 onPress={handleTrack}
//                 disabled={!selectedCustomer}
//               >
//                 <Text style={styles.trackText}>Track</Text>
//               </TouchableOpacity>
//             </View>
//           </View> */}

//           <View style={styles.topBar}>
//   <View style={styles.searchSection}>
//     <TextInput
//       style={styles.searchInput}
//       placeholder="Search customer..."
//       placeholderTextColor="#999"
//       value={searchQuery}
//       onChangeText={handleSearch}
//     />

//     {/* Clear Icon (inside the TextInput area on right) */}
//     {searchQuery.length > 0 && (
//       <TouchableOpacity
//         style={styles.clearSearchBtn}
//         onPress={() => handleSearch("")}
//       >
//         <Text onPress={clearTracking} style={styles.clearSearchText}>✕</Text>
//       </TouchableOpacity>
//     )}

//     {/* Track Button */}
//     <TouchableOpacity
//       style={[
//         styles.trackButton,
//         { backgroundColor: selectedCustomer ? "#007bff" : "#ccc" },
//       ]}
//       onPress={handleTrack}
//       disabled={!selectedCustomer}
//     >
//       <Text style={styles.trackText}>Track</Text>
//     </TouchableOpacity>
//   </View>
// </View>


//           {/* Customer List */}
//           {searchQuery.length > 0 && filteredCustomers.length > 0 && (
//             <FlatList
//               data={filteredCustomers}
//               keyExtractor={(item, index) =>
//                 item?.entity_id ? item.entity_id.toString() : `dummy-${index}`
//               }
//               renderItem={({ item }) =>
//                 item ? (
//                   <TouchableOpacity
//                     style={styles.customerItem}
//                     onPress={() => {
//                       setSelectedCustomer(item);
//                       setSearchQuery("");
//                       setFilteredCustomers([item]);
//                       Keyboard.dismiss();

//                       if (currentLocation && item.latitude && item.longitude) {
//                         setTracking(true);

//                         const customerLoc = {
//                           latitude: parseFloat(item.latitude),
//                           longitude: parseFloat(item.longitude),
//                         };

//                         updateDistance(currentLocation, customerLoc);
//                         fetchRoute(currentLocation, customerLoc);

//                         if (mapRef.current) {
//                           mapRef.current.animateToRegion(
//                             {
//                               latitude: customerLoc.latitude,
//                               longitude: customerLoc.longitude,
//                               latitudeDelta: 0.01,
//                               longitudeDelta: 0.01,
//                             },
//                             1000
//                           );
//                         }
//                       }
//                     }}
//                   >
//                     <Text style={styles.customerName}>{item.name}</Text>
//                   </TouchableOpacity>
//                 ) : null
//               }
//               style={styles.customerList}
//             />
//           )}

//         {/* Map */}
// {currentLocation ? (
//   <MapView
//     ref={mapRef}
//     style={styles.map}
//     showsUserLocation
//     showsMyLocationButton
//     initialRegion={{
//       latitude: currentLocation.latitude,
//       longitude: currentLocation.longitude,
//       latitudeDelta: 0.05,
//       longitudeDelta: 0.05,
//     }}
//   >
//     {(selectedCustomer ? [selectedCustomer] : filteredCustomers).map((cust) => {
//       if (!cust?.latitude || !cust?.longitude) return null;

//       const lat = parseFloat(cust.latitude);
//       const lng = parseFloat(cust.longitude);

//       // Stable unique key
//       const key = cust.entity_id?.toString() || `${cust.name}_${lat}_${lng}`;

//       return (
//         <Marker
//           key={key}
//           coordinate={{ latitude: lat, longitude: lng }}
//           onPress={() => {
//             try {
//               handleMarkerPress(cust);
//             } catch (err) {
//               console.error("Marker press error:", err);
//             }
//           }}
//           anchor={{ x: 0.5, y: 1 }}
//           centerOffset={{ x: 0, y: -40 }}
//         >
//           <MapPin
//             color={
//               selectedCustomer?.entity_id === cust.entity_id
//                 ? "#007bff"       // Blue (selected customer)
//                 : cust.visited === "Visited"
//                 ? "#008000"       // Green (visited)
//                 : "#FF0000"       // Red (not visited)
//             }
//             label={
//               cust.short_code
//                 ? cust.short_code.toUpperCase()
//                 : (cust.name?.substring(0, 2) || "").toUpperCase()
//             }
//           />
//         </Marker>
//       );
//     })}

//     {routeCoords.length > 0 && (
//       <Polyline
//         coordinates={routeCoords}
//         strokeColor="#007bff"
//         strokeWidth={4}
//       />
//     )}
//   </MapView>
// ) : (
//   <View style={styles.loadingContainer}>
//     <Text style={styles.loadingText}>Getting your location...</Text>
//   </View>
// )}

//           {/* ------------------ Info Box ------------------ */}
//       {distance && selectedCustomer && (
//   <View style={styles.infoBox}>
//     {/* Clear Button at top-right */}
//     <TouchableOpacity onPress={clearTracking} style={styles.clearBtn}>
//       <Text style={styles.clearText}>✕</Text>
//     </TouchableOpacity>

//     <View style={styles.infoContent}>
//       {/* Customer Info */}
//       <Text style={styles.infoTitle}>Tracking Customer</Text>
//       <Text style={styles.infoTextName}>{selectedCustomer.name}</Text>

//       {/* Stats */}
//       <View style={styles.infoStats}>
//         <View style={styles.statItem}>
//           <Text style={styles.statLabel}>Orders</Text>
//           <Text style={styles.statValue}>{selectedCustomerOrders.length}</Text>
//         </View>
//         <View style={styles.statItem}>
//           <Text style={styles.statLabel}>Amount</Text>
//           <Text style={styles.statValue}>
//             Rs.{" "}
//             {selectedCustomerOrders
//               .reduce((sum, o) => sum + parseFloat(o.total_amount), 0)
//               .toFixed(2)}
//           </Text>
//         </View>
//         <View style={styles.statItem}>
//           <Text style={styles.statLabel}>Last Visit</Text>
//           {selectedCustomerOrders.length > 0 ? (
//             <>
//               <Text style={styles.statValue}>
//                 {new Date(selectedCustomerOrders[0].order_date).toLocaleDateString()}
//               </Text>
//               <Text style={styles.statValueTime}>
//                 {new Date(selectedCustomerOrders[0].order_date).toLocaleTimeString([], {
//                   hour: "2-digit",
//                   minute: "2-digit",
//                 })}
//               </Text>
//             </>
//           ) : (
//             <Text style={styles.statValue}>N/A</Text>
//           )}
//         </View>
//       </View>

//       {/* Distance */}
//       <Text style={styles.infoDistance}>Distance: {distance} km away</Text>
//     </View>
//   </View>
// )}


//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// // ----------------------- Styles -----------------------
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#f9f9f9" },
//   topBar: {
//     position: "absolute",
//     top: Platform.OS === "ios" ? 50 : 30,
//     width: "100%",
//     paddingHorizontal: 15,
//     zIndex: 20,
//   },
//   searchSection: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     shadowColor: "#000",
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 2 },
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   searchInput: {
//     flex: 1,
//     backgroundColor: "#f3f3f3",
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     height: 40,
//     color: "#333",
//   },
//   trackButton: {
//     marginLeft: 8,
//     paddingHorizontal: 16,
//     paddingVertical: 9,
//     borderRadius: 8,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   clearSearchBtn: {
//   position: "absolute",
//   right: 90, // adjust to not overlap with Track button
//   height: "100%",
//   justifyContent: "center",
//   alignItems: "center",
//   paddingHorizontal: 8,
//   zIndex: 10,
// },
// clearSearchText: {
//   fontSize: 18,
//   color: "#999",
//   fontWeight: "600",
// },

//   trackText: { color: "#fff", fontWeight: "bold" },
//   customerList: {
//     position: "absolute",
//     top: Platform.OS === "ios" ? 100 : 80,
//     left: 15,
//     right: 15,
//     backgroundColor: "#fff",
//     borderRadius: 10,
//     elevation: 4,
//     shadowColor: "#000",
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 2 },
//     shadowRadius: 4,
//     maxHeight: height * 0.25,
//     zIndex: 30,
//   },
//   customerItem: {
//     padding: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//   },
//   customerName: { fontSize: 16, color: "#333" },
//   map: { flex: 1 },
//   infoBox: {
//   position: "absolute",
//   bottom: 20,
//   left: 15,
//   right: 15,
//   backgroundColor: "#fff",
//   borderRadius: 16,
//   padding: 16,
//   shadowColor: "#000",
//   shadowOpacity: 0.2,
//   shadowOffset: { width: 0, height: 5 },
//   shadowRadius: 8,
//   elevation: 8,
// },
// infoContent: {
//   flexDirection: "column",
//   marginTop: 12, // leave space for button
// },
// clearBtn: {
//   position: "absolute",
//   top: 10,
//   right: 10,
//   width: 36,
//   height: 36,
//   borderRadius: 18,
//   backgroundColor: "#eee",
//   justifyContent: "center",
//   alignItems: "center",
//   zIndex: 10,
// },
// clearText: { fontSize: 18, color: "#555", fontWeight: "700" },
// infoTitle: {
//   fontSize: 14,
//   color: "#555",
//   marginBottom: 4,
//   textTransform: "uppercase",
//   fontWeight: "600",
// },
// infoTextName: {
//   fontSize: 20,
//   fontWeight: "700",
//   color: "#007bff",
//   marginBottom: 12,
// },
// infoStats: {
//   flexDirection: "row",
//   flexWrap: "wrap", // allows wrapping on small screens
//   justifyContent: "space-between",
//   marginBottom: 8,
// },
// statItem: {
//   flex: 1,
//   minWidth: "28%", // allows 3 items per row on larger screens, wraps on smaller
//   marginHorizontal: 4,
//   marginVertical: 4,
//   paddingVertical: 10,
//   backgroundColor: "#f3f6fb",
//   borderRadius: 12,
//   alignItems: "center",
// },
// statLabel: {
//   fontSize: 12,
//   color: "#888",
//   marginBottom: 4,
//   fontWeight: "500",
//   textAlign: "center",
// },
// statValue: {
//   fontSize: 12,
//   fontWeight: "600",
//   color: "#333",
//   textAlign: "center",
// },
// statValueTime: {
//   fontSize: 12,
//   fontWeight: "500",
//   color: "#555",
//   textAlign: "center",
//   marginTop: 2,
// },
// infoDistance: {
//   fontSize: 14,
//   color: "#007bff",
//   fontWeight: "600",
//   marginTop: 8,
//   textAlign: "center",
// },

//   loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
//   loadingText: { fontSize: 16, color: "#333" },
// });





// import React, { useEffect, useState, useRef } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   FlatList,
//   Keyboard,
//   Dimensions,
//   Platform,
//   Alert,
//   KeyboardAvoidingView,
// } from "react-native";
// import MapView, { Marker, Polyline } from "react-native-maps";
// import * as Location from "expo-location";
// import haversine from "haversine";
// import PolylineDecoder from "@mapbox/polyline";
// import { getAllCustomers, searchCustomers, getAllOrders } from "../database";
// import { SafeAreaView } from "react-native-safe-area-context";
// import MapPin from "../components/MapPin";

// const GOOGLE_MAPS_API_KEY = "AIzaSyCpXDv4FldOMug08hNGFwAn7fGcviuLHF4";
// const { height } = Dimensions.get("window");

// export default function LiveTrackingScreen({ route }) {
//   const mapRef = useRef(null);
//   const passedCustomer = route?.params?.customer || null;
//   const passedCustomerUsed = useRef(false);

//   const [currentLocation, setCurrentLocation] = useState(null);
//   const [customers, setCustomers] = useState([]);
//   const [filteredCustomers, setFilteredCustomers] = useState([]);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);
//   const [selectedCustomerOrders, setSelectedCustomerOrders] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [distance, setDistance] = useState(null);
//   const [routeCoords, setRouteCoords] = useState([]);
//   const [tracking, setTracking] = useState(false);

//   // ----------------------- Location Setup -----------------------
//   useEffect(() => {
//     let subscription;

//     const initLocation = async () => {
//       try {
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== "granted") {
//           Alert.alert(
//             "Permission Denied",
//             "App requires location permission to work properly."
//           );
//           return;
//         }

//         const loc = await Location.getCurrentPositionAsync({
//           accuracy: Location.Accuracy.High,
//         });

//         setCurrentLocation({
//           latitude: loc.coords.latitude,
//           longitude: loc.coords.longitude,
//         });

//         subscription = await Location.watchPositionAsync(
//           { accuracy: Location.Accuracy.High, distanceInterval: 5 },
//           (locUpdate) => {
//             const newLoc = {
//               latitude: locUpdate.coords.latitude,
//               longitude: locUpdate.coords.longitude,
//             };
//             setCurrentLocation(newLoc);

//             if (tracking && selectedCustomer) {
//               const custLat = parseFloat(selectedCustomer.latitude);
//               const custLng = parseFloat(selectedCustomer.longitude);

//               if (!isNaN(custLat) && !isNaN(custLng)) {
//                 const customerLoc = { latitude: custLat, longitude: custLng };
//                 fetchRoute(newLoc, customerLoc);
//                 updateDistance(newLoc, customerLoc);
//               }
//             }
//           }
//         );
//       } catch (err) {
//         console.log("Location error:", err);
//       }
//     };

//     initLocation();

//     return () => {
//       if (subscription) subscription.remove();
//     };
//   }, [tracking, selectedCustomer]);

//   // ----------------------- Fetch Customers -----------------------
//   useEffect(() => {
//     const fetchCustomers = async () => {
//       try {
//         const data = await getAllCustomers();
//         setCustomers(data);
//         setFilteredCustomers(data);
//       } catch (err) {
//         console.log("Fetch customers error:", err);
//       }
//     };
//     fetchCustomers();
//   }, []);

//   // ----------------------- Handle Passed Customer -----------------------
//   useEffect(() => {
//     if (
//       passedCustomer &&
//       !passedCustomerUsed.current &&
//       currentLocation &&
//       passedCustomer.latitude &&
//       passedCustomer.longitude
//     ) {
//       passedCustomerUsed.current = true;
//       safeSelectCustomer(passedCustomer);
//     }
//   }, [passedCustomer, currentLocation]);

//   // ----------------------- Fetch Customer Orders on Selection -----------------------
//   useEffect(() => {
//     const fetchCustomerOrders = async () => {
//       if (!selectedCustomer) {
//         setSelectedCustomerOrders([]);
//         return;
//       }

//       try {
//         const allOrders = await getAllOrders();
//         const customerOrders = allOrders.filter(
//           (order) => order.customer_name === selectedCustomer.name
//         );
//         setSelectedCustomerOrders(customerOrders);
//       } catch (err) {
//         console.log("Fetch orders error:", err);
//       }
//     };

//     fetchCustomerOrders();
//   }, [selectedCustomer]);

//   // ----------------------- Search Customers -----------------------
//   const handleSearch = async (text) => {
//     setSearchQuery(text);
//     if (text.trim() === "") {
//       setFilteredCustomers(customers);
//       setSelectedCustomer(null);
//       setRouteCoords([]);
//       setTracking(false);
//       return;
//     }

//     try {
//       const data = await searchCustomers(text);
//       setFilteredCustomers(data);

//       if (
//         data.length === 1 &&
//         data[0].latitude &&
//         data[0].longitude
//       ) {
//         safeSelectCustomer(data[0]);
//       } else {
//         setSelectedCustomer(null);
//       }
//     } catch (err) {
//       console.log("Search customers error:", err);
//     }
//   };

//   // ----------------------- Safe Select Customer -----------------------
//   const safeSelectCustomer = (cust) => {
//     const lat = parseFloat(cust.latitude);
//     const lng = parseFloat(cust.longitude);
//     if (isNaN(lat) || isNaN(lng)) return;

//     setSelectedCustomer(cust);
//     setTracking(true);

//     const customerLoc = { latitude: lat, longitude: lng };
//     if (currentLocation) {
//       updateDistance(currentLocation, customerLoc);
//       fetchRoute(currentLocation, customerLoc);
//     }

//     if (mapRef.current) {
//       mapRef.current.animateToRegion(
//         {
//           latitude: lat,
//           longitude: lng,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         },
//         1000
//       );
//     }
//   };

//   // ----------------------- Fetch Route -----------------------
//   const fetchRoute = async (origin, destination) => {
//     if (!origin || !destination) return;

//     try {
//       const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
//       const response = await fetch(url);
//       const data = await response.json();

//       if (data?.routes?.length && data.routes[0]?.overview_polyline?.points) {
//         const points = PolylineDecoder.decode(
//           data.routes[0].overview_polyline.points
//         );
//         const coords = points.map((point) => ({
//           latitude: point[0],
//           longitude: point[1],
//         }));
//         setRouteCoords(coords);
//       } else {
//         setRouteCoords([]);
//       }
//     } catch (error) {
//       console.log("Directions error:", error);
//     }
//   };

//   // ----------------------- Update Distance -----------------------
//   const updateDistance = (origin, destination) => {
//     if (!origin || !destination) return;
//     const dist = haversine(origin, destination, { unit: "km" }).toFixed(2);
//     setDistance(dist);
//   };

//   // ----------------------- Track Customer -----------------------
//   const handleTrack = () => {
//     if (!selectedCustomer) {
//       Alert.alert("Select Customer", "Please select a customer to track.");
//       return;
//     }
//     safeSelectCustomer(selectedCustomer);
//     Keyboard.dismiss();
//   };

//   // ----------------------- Clear Tracking -----------------------
//   const clearTracking = () => {
//     setSelectedCustomer(null);
//     setRouteCoords([]);
//     setDistance(null);
//     setTracking(false);
//     setFilteredCustomers(customers);
//     setSearchQuery("");
//     passedCustomerUsed.current = true;

//     if (mapRef.current && currentLocation) {
//       mapRef.current.animateToRegion(
//         {
//           latitude: currentLocation.latitude,
//           longitude: currentLocation.longitude,
//           latitudeDelta: 0.05,
//           longitudeDelta: 0.05,
//         },
//         1000
//       );
//     }
//   };

//   // ----------------------- Marker Press -----------------------
//   const handleMarkerPress = (cust) => {
//     if (!cust?.latitude || !cust?.longitude) return;
//     safeSelectCustomer(cust);
//   };

//   // ----------------------- Render -----------------------
//   return (
//     <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === "ios" ? "padding" : undefined}
//       >
//         <View style={styles.container}>
//           {/* Top Search Bar */}
//           <View style={styles.topBar}>
//             <View style={styles.searchSection}>
//               <TextInput
//                 style={styles.searchInput}
//                 placeholder="Search customer..."
//                 placeholderTextColor="#999"
//                 value={searchQuery}
//                 onChangeText={handleSearch}
//               />
//               <TouchableOpacity
//                 style={[
//                   styles.trackButton,
//                   { backgroundColor: selectedCustomer ? "#007bff" : "#ccc" },
//                 ]}
//                 onPress={handleTrack}
//                 disabled={!selectedCustomer}
//               >
//                 <Text style={styles.trackText}>Track</Text>
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* Customer List */}
//           {searchQuery.length > 0 && filteredCustomers.length > 0 && (
//             <FlatList
//               data={filteredCustomers}
//               keyExtractor={(item, index) =>
//                 item?.entity_id?.toString() || `dummy-${index}`
//               }
//               renderItem={({ item }) =>
//                 item ? (
//                   <TouchableOpacity
//                     style={styles.customerItem}
//                     onPress={() => {
//                       safeSelectCustomer(item);
//                       setSearchQuery("");
//                       setFilteredCustomers([item]);
//                       Keyboard.dismiss();
//                     }}
//                   >
//                     <Text style={styles.customerName}>{item.name}</Text>
//                   </TouchableOpacity>
//                 ) : null
//               }
//               style={styles.customerList}
//             />
//           )}

//           {/* Map */}
//           {currentLocation ? (
//             <MapView
//               ref={mapRef}
//               style={styles.map}
//               showsUserLocation
//               showsMyLocationButton
//               initialRegion={{
//                 latitude: currentLocation.latitude,
//                 longitude: currentLocation.longitude,
//                 latitudeDelta: 0.05,
//                 longitudeDelta: 0.05,
//               }}
//             >
//               {(selectedCustomer ? [selectedCustomer] : filteredCustomers).map((cust) => {
//                 if (!cust?.latitude || !cust?.longitude) return null;

//                 const lat = parseFloat(cust.latitude);
//                 const lng = parseFloat(cust.longitude);
//                 if (isNaN(lat) || isNaN(lng)) return null;

//                 const key = cust.entity_id?.toString() || `${cust.name || "NA"}_${lat}_${lng}`;

//                 return (
//                   <Marker
//                     key={key}
//                     coordinate={{ latitude: lat, longitude: lng }}
//                     onPress={() => handleMarkerPress(cust)}
//                     anchor={{ x: 0.5, y: 1 }}
//                     centerOffset={{ x: 0, y: -40 }}
//                   >
//                     <MapPin
//                       color={
//                         selectedCustomer?.entity_id === cust.entity_id
//                           ? "#007bff"
//                           : cust.visited === "Visited"
//                           ? "#008000"
//                           : "#FF0000"
//                       }
//                       label={cust.short_code ? cust.short_code.toUpperCase() : (cust.name?.substring(0, 2) || "NA").toUpperCase()}
//                     />
//                   </Marker>
//                 );
//               })}

//               {routeCoords.length > 0 && (
//                 <Polyline
//                   coordinates={routeCoords}
//                   strokeColor="#007bff"
//                   strokeWidth={4}
//                 />
//               )}
//             </MapView>
//           ) : (
//             <View style={styles.loadingContainer}>
//               <Text style={styles.loadingText}>Getting your location...</Text>
//             </View>
//           )}

//           {/* Info Box */}
//           {distance && selectedCustomer && (
//             <View style={styles.infoBox}>
//               <TouchableOpacity onPress={clearTracking} style={styles.clearBtn}>
//                 <Text style={styles.clearText}>✕</Text>
//               </TouchableOpacity>

//               <View style={styles.infoContent}>
//                 <Text style={styles.infoTitle}>Tracking Customer</Text>
//                 <Text style={styles.infoTextName}>{selectedCustomer.name}</Text>

//                 <View style={styles.infoStats}>
//                   <View style={styles.statItem}>
//                     <Text style={styles.statLabel}>Orders</Text>
//                     <Text style={styles.statValue}>{selectedCustomerOrders.length}</Text>
//                   </View>
//                   <View style={styles.statItem}>
//                     <Text style={styles.statLabel}>Amount</Text>
//                     <Text style={styles.statValue}>
//                       Rs.{" "}
//                       {selectedCustomerOrders
//                         .reduce((sum, o) => sum + parseFloat(o.total_amount), 0)
//                         .toFixed(2)}
//                     </Text>
//                   </View>
//                   <View style={styles.statItem}>
//                     <Text style={styles.statLabel}>Last Seen</Text>
//                     {selectedCustomerOrders.length > 0 ? (
//                       <>
//                         <Text style={styles.statValue}>
//                           {new Date(selectedCustomerOrders[0].order_date).toLocaleDateString()}
//                         </Text>
//                         <Text style={styles.statValueTime}>
//                           {new Date(selectedCustomerOrders[0].order_date).toLocaleTimeString([], {
//                             hour: "2-digit",
//                             minute: "2-digit",
//                           })}
//                         </Text>
//                       </>
//                     ) : (
//                       <Text style={styles.statValue}>N/A</Text>
//                     )}
//                   </View>
//                 </View>

//                 <Text style={styles.infoDistance}>Distance: {distance} km away</Text>
//               </View>
//             </View>
//           )}
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// // ----------------------- Styles -----------------------
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#f9f9f9" },
//   topBar: {
//     position: "absolute",
//     top: Platform.OS === "ios" ? 50 : 30,
//     width: "100%",
//     paddingHorizontal: 15,
//     zIndex: 20,
//   },
//   searchSection: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     shadowColor: "#000",
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 2 },
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   searchInput: {
//     flex: 1,
//     backgroundColor: "#f3f3f3",
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     height: 40,
//     color: "#333",
//   },
//   trackButton: {
//     marginLeft: 8,
//     paddingHorizontal: 16,
//     paddingVertical: 9,
//     borderRadius: 8,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   trackText: { color: "#fff", fontWeight: "bold" },
//   customerList: {
//     position: "absolute",
//     top: Platform.OS === "ios" ? 100 : 80,
//     left: 15,
//     right: 15,
//     backgroundColor: "#fff",
//     borderRadius: 10,
//     elevation: 4,
//     shadowColor: "#000",
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 2 },
//     shadowRadius: 4,
//     maxHeight: height * 0.25,
//     zIndex: 30,
//   },
//   customerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
//   customerName: { fontSize: 16, color: "#333" },
//   map: { flex: 1 },
//   loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
//   loadingText: { fontSize: 16, color: "#333" },
//   infoBox: {
//     position: "absolute",
//     bottom: 20,
//     left: 15,
//     right: 15,
//     backgroundColor: "#fff",
//     borderRadius: 16,
//     padding: 16,
//     shadowColor: "#000",
//     shadowOpacity: 0.2,
//     shadowOffset: { width: 0, height: 5 },
//     shadowRadius: 8,
//     elevation: 8,
//   },
//   infoContent: { flexDirection: "column", marginTop: 12 },
//   clearBtn: {
//     position: "absolute",
//     top: 10,
//     right: 10,
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: "#eee",
//     justifyContent: "center",
//     alignItems: "center",
//     zIndex: 10,
//   },
//   clearText: { fontSize: 18, color: "#555", fontWeight: "700" },
//   infoTitle: { fontSize: 14, color: "#555", marginBottom: 4, textTransform: "uppercase", fontWeight: "600" },
//   infoTextName: { fontSize: 20, fontWeight: "700", color: "#007bff", marginBottom: 12 },
//   infoStats: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 8 },
//   statItem: { flex: 1, minWidth: "28%", marginHorizontal: 4, marginVertical: 4, paddingVertical: 10, backgroundColor: "#f3f6fb", borderRadius: 12, alignItems: "center" },
//   statLabel: { fontSize: 12, color: "#888", marginBottom: 4, fontWeight: "500", textAlign: "center" },
//   statValue: { fontSize: 12, fontWeight: "600", color: "#333", textAlign: "center" },
//   statValueTime: { fontSize: 12, fontWeight: "500", color: "#555", textAlign: "center", marginTop: 2 },
//   infoDistance: { fontSize: 14, color: "#007bff", fontWeight: "600", marginTop: 8, textAlign: "center" },
// });










// recent update


// import React, { useEffect, useState, useRef } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   FlatList,
//   Keyboard,
//   Dimensions,
//   Platform,
//   Alert,
//   KeyboardAvoidingView,
// } from "react-native";
// import MapView, { Marker, Polyline } from "react-native-maps";
// import * as Location from "expo-location";
// import haversine from "haversine";
// import PolylineDecoder from "@mapbox/polyline";
// import { getAllCustomers, searchCustomers, getAllOrders } from "../database";
// import { SafeAreaView } from "react-native-safe-area-context";

// const GOOGLE_MAPS_API_KEY = "AIzaSyCpXDv4FldOMug08hNGFwAn7fGcviuLHF4";
// const { height } = Dimensions.get("window");

// export default function LiveTrackingScreen({ route }) {
//   const mapRef = useRef(null);
//   const passedCustomer = route?.params?.customer || null;
//   const passedCustomerUsed = useRef(false);

//   const [currentLocation, setCurrentLocation] = useState(null);
//   const [customers, setCustomers] = useState([]);
//   const [filteredCustomers, setFilteredCustomers] = useState([]);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);
//   const [selectedCustomerOrders, setSelectedCustomerOrders] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [distance, setDistance] = useState(null);
//   const [routeCoords, setRouteCoords] = useState([]);
//   const [tracking, setTracking] = useState(false);

//   // ----------------------- Location Setup -----------------------
//   useEffect(() => {
//     let subscription;

//     const initLocation = async () => {
//       try {
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== "granted") {
//           Alert.alert(
//             "Permission Denied",
//             "App requires location permission to work properly."
//           );
//           return;
//         }

//         const loc = await Location.getCurrentPositionAsync({
//           accuracy: Location.Accuracy.High,
//         });

//         setCurrentLocation({
//           latitude: loc.coords.latitude,
//           longitude: loc.coords.longitude,
//         });

//         // Watch location for live updates
//         subscription = await Location.watchPositionAsync(
//           { accuracy: Location.Accuracy.High, distanceInterval: 5 },
//           (locUpdate) => {
//             const newLoc = {
//               latitude: locUpdate.coords.latitude,
//               longitude: locUpdate.coords.longitude,
//             };
//             setCurrentLocation(newLoc);

//             // Update route if tracking
//             if (tracking && selectedCustomer) {
//               const customerLoc = {
//                 latitude: parseFloat(selectedCustomer.latitude),
//                 longitude: parseFloat(selectedCustomer.longitude),
//               };
//               fetchRoute(newLoc, customerLoc);
//               updateDistance(newLoc, customerLoc);
//             }
//           }
//         );
//       } catch (err) {
//         console.log("Location error:", err);
//       }
//     };

//     initLocation();

//     return () => {
//       if (subscription) subscription.remove();
//     };
//   }, [tracking, selectedCustomer]);

//   // ----------------------- Fetch Customers -----------------------
//   useEffect(() => {
//     const fetchCustomers = async () => {
//       const data = await getAllCustomers();
//       setCustomers(data);
//       setFilteredCustomers(data);
//     };
//     fetchCustomers();
//   }, []);

//   // ----------------------- Handle Passed Customer -----------------------
//   useEffect(() => {
//     if (passedCustomer && !passedCustomerUsed.current && currentLocation) {
//       if (passedCustomer.latitude != null && passedCustomer.longitude != null) {
//         passedCustomerUsed.current = true;
//         setSelectedCustomer(passedCustomer);
//         setTracking(true);

//         const customerLoc = {
//           latitude: parseFloat(passedCustomer.latitude),
//           longitude: parseFloat(passedCustomer.longitude),
//         };

//         fetchRoute(currentLocation, customerLoc);
//         updateDistance(currentLocation, customerLoc);

//         if (mapRef.current) {
//           mapRef.current.animateToRegion(
//             {
//               latitude: customerLoc.latitude,
//               longitude: customerLoc.longitude,
//               latitudeDelta: 0.01,
//               longitudeDelta: 0.01,
//             },
//             1000
//           );
//         }
//       }
//     }
//   }, [passedCustomer, currentLocation]);

//   // ----------------------- Fetch Customer Orders on Selection -----------------------
//   useEffect(() => {
//     const fetchCustomerOrders = async () => {
//       if (!selectedCustomer) {
//         setSelectedCustomerOrders([]);
//         return;
//       }

//       const allOrders = await getAllOrders();
//       const customerOrders = allOrders.filter(
//         (order) => order.customer_name === selectedCustomer.name
//       );
//       setSelectedCustomerOrders(customerOrders);
//     };

//     fetchCustomerOrders();
//   }, [selectedCustomer]);

//   // ----------------------- Search Customers -----------------------
//   const handleSearch = async (text) => {
//     setSearchQuery(text);
//     if (text.trim() === "") {
//       setFilteredCustomers(customers);
//       setSelectedCustomer(null);
//       setRouteCoords([]);
//       setTracking(false);
//     } else {
//       const data = await searchCustomers(text);
//       setFilteredCustomers(data);

//       if (
//         data.length === 1 &&
//         data[0].latitude != null &&
//         data[0].longitude != null
//       ) {
//         const customer = data[0];
//         setSelectedCustomer(customer);
//         setTracking(true);

//         const customerLoc = {
//           latitude: parseFloat(customer.latitude),
//           longitude: parseFloat(customer.longitude),
//         };

//         updateDistance(currentLocation, customerLoc);
//         fetchRoute(currentLocation, customerLoc);

//         if (mapRef.current) {
//           mapRef.current.animateToRegion(
//             {
//               latitude: customerLoc.latitude,
//               longitude: customerLoc.longitude,
//               latitudeDelta: 0.01,
//               longitudeDelta: 0.01,
//             },
//             1000
//           );
//         }
//       } else {
//         setSelectedCustomer(null);
//       }
//     }
//   };

//   // ----------------------- Fetch Route -----------------------
//   const fetchRoute = async (origin, destination) => {
//     try {
//       const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
//       const response = await fetch(url);
//       const data = await response.json();

//       if (data.routes.length) {
//         const points = PolylineDecoder.decode(
//           data.routes[0].overview_polyline.points
//         );
//         const coords = points.map((point) => ({
//           latitude: point[0],
//           longitude: point[1],
//         }));
//         setRouteCoords(coords);
//       }
//     } catch (error) {
//       console.log("Directions error:", error);
//     }
//   };

//   // ----------------------- Update Distance -----------------------
//   const updateDistance = (origin, destination) => {
//     const dist = haversine(origin, destination, { unit: "km" }).toFixed(2);
//     setDistance(dist);
//   };

//   // ----------------------- Track Customer -----------------------
//   const handleTrack = async () => {
//     if (!selectedCustomer) {
//       Alert.alert("Select Customer", "Please select a customer to track.");
//       return;
//     }

//     if (!currentLocation) {
//       Alert.alert(
//         "Location not available",
//         "Waiting for GPS signal. Try again in a moment."
//       );
//       return;
//     }

//     setTracking(true);

//     const customerLoc = {
//       latitude: parseFloat(selectedCustomer.latitude),
//       longitude: parseFloat(selectedCustomer.longitude),
//     };

//     updateDistance(currentLocation, customerLoc);
//     fetchRoute(currentLocation, customerLoc);

//     if (mapRef.current) {
//       mapRef.current.animateToRegion(
//         {
//           latitude: customerLoc.latitude,
//           longitude: customerLoc.longitude,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         },
//         1000
//       );
//     }

//     Keyboard.dismiss();
//   };

//   // ----------------------- Clear Tracking -----------------------
//   const clearTracking = () => {
//     setSelectedCustomer(null);
//     setRouteCoords([]);
//     setDistance(null);
//     setTracking(false);
//     setFilteredCustomers(customers);
//     setSearchQuery("");
//     passedCustomerUsed.current = true;

//     if (mapRef.current && currentLocation) {
//       mapRef.current.animateToRegion(
//         {
//           latitude: currentLocation.latitude,
//           longitude: currentLocation.longitude,
//           latitudeDelta: 0.05,
//           longitudeDelta: 0.05,
//         },
//         1000
//       );
//     }
//   };

//   // ----------------------- Marker Press -----------------------
//   const handleMarkerPress = (cust) => {
//     setSelectedCustomer(cust);
//     setTracking(true);
//     const customerLoc = {
//       latitude: parseFloat(cust.latitude),
//       longitude: parseFloat(cust.longitude),
//     };

//     if (currentLocation) {
//       updateDistance(currentLocation, customerLoc);
//       fetchRoute(currentLocation, customerLoc);
//     }

//     if (mapRef.current) {
//       mapRef.current.animateToRegion(
//         {
//           latitude: customerLoc.latitude,
//           longitude: customerLoc.longitude,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         },
//         1000
//       );
//     }
//   };

//   // ----------------------- Render -----------------------
//   return (
//     <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === "ios" ? "padding" : undefined}
//       >
//         <View style={styles.container}>
//           {/* Top Search Bar */}
//           <View style={styles.topBar}>
//             <View style={styles.searchSection}>
//               <TextInput
//                 style={styles.searchInput}
//                 placeholder="Search customer..."
//                 placeholderTextColor="#999"
//                 value={searchQuery}
//                 onChangeText={handleSearch}
//               />
//               <TouchableOpacity
//                 style={[
//                   styles.trackButton,
//                   { backgroundColor: selectedCustomer ? "#007bff" : "#ccc" },
//                 ]}
//                 onPress={handleTrack}
//                 disabled={!selectedCustomer}
//               >
//                 <Text style={styles.trackText}>Track</Text>
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* Customer List */}
//           {searchQuery.length > 0 && filteredCustomers.length > 0 && (
//             <FlatList
//               data={filteredCustomers}
//               keyExtractor={(item, index) =>
//                 item?.entity_id ? item.entity_id.toString() : `dummy-${index}`
//               }
//               renderItem={({ item }) =>
//                 item ? (
//                   <TouchableOpacity
//                     style={styles.customerItem}
//                     onPress={() => {
//                       setSelectedCustomer(item);
//                       setSearchQuery("");
//                       setFilteredCustomers([item]);
//                       Keyboard.dismiss();

//                       if (currentLocation && item.latitude && item.longitude) {
//                         setTracking(true);

//                         const customerLoc = {
//                           latitude: parseFloat(item.latitude),
//                           longitude: parseFloat(item.longitude),
//                         };

//                         updateDistance(currentLocation, customerLoc);
//                         fetchRoute(currentLocation, customerLoc);

//                         if (mapRef.current) {
//                           mapRef.current.animateToRegion(
//                             {
//                               latitude: customerLoc.latitude,
//                               longitude: customerLoc.longitude,
//                               latitudeDelta: 0.01,
//                               longitudeDelta: 0.01,
//                             },
//                             1000
//                           );
//                         }
//                       }
//                     }}
//                   >
//                     <Text style={styles.customerName}>{item.name}</Text>
//                   </TouchableOpacity>
//                 ) : null
//               }
//               style={styles.customerList}
//             />
//           )}

//           {/* Map */}
//           {currentLocation ? (
//             <MapView
//               ref={mapRef}
//               style={styles.map}
//               showsUserLocation
//               showsMyLocationButton
//               initialRegion={{
//                 latitude: currentLocation.latitude,
//                 longitude: currentLocation.longitude,
//                 latitudeDelta: 0.05,
//                 longitudeDelta: 0.05,
//               }}
//             >
//               {(selectedCustomer ? [selectedCustomer] : filteredCustomers).map(
//                 (cust, index) =>
//                   cust?.latitude != null && cust?.longitude != null ? (
//                     <Marker
//                       key={
//                         cust.entity_id
//                           ? cust.entity_id.toString()
//                           : `marker-${index}`
//                       }
//                       coordinate={{
//                         latitude: parseFloat(cust.latitude),
//                         longitude: parseFloat(cust.longitude),
//                       }}
//                       title={cust.name}
//                       pinColor={
//                         selectedCustomer?.entity_id === cust.entity_id
//                           ? "#007bff"
//                           : cust.visited === "Visited"
//                           ? "green"
//                           : "red"
//                       }
//                       onPress={() => handleMarkerPress(cust)}
//                     />
//                   ) : null
//               )}

//               {routeCoords.length > 0 && (
//                 <Polyline
//                   coordinates={routeCoords}
//                   strokeColor="#007bff"
//                   strokeWidth={4}
//                 />
//               )}
//             </MapView>
//           ) : (
//             <View style={styles.loadingContainer}>
//               <Text style={styles.loadingText}>Getting your location...</Text>
//             </View>
//           )}

//           {/* ------------------ Info Box ------------------ */}
//       {distance && selectedCustomer && (
//   <View style={styles.infoBox}>
//     {/* Clear Button at top-right */}
//     <TouchableOpacity onPress={clearTracking} style={styles.clearBtn}>
//       <Text style={styles.clearText}>✕</Text>
//     </TouchableOpacity>

//     <View style={styles.infoContent}>
//       {/* Customer Info */}
//       <Text style={styles.infoTitle}>Tracking Customer</Text>
//       <Text style={styles.infoTextName}>{selectedCustomer.name}</Text>

//       {/* Stats */}
//       <View style={styles.infoStats}>
//         <View style={styles.statItem}>
//           <Text style={styles.statLabel}>Orders</Text>
//           <Text style={styles.statValue}>{selectedCustomerOrders.length}</Text>
//         </View>
//         <View style={styles.statItem}>
//           <Text style={styles.statLabel}>Amount</Text>
//           <Text style={styles.statValue}>
//             Rs.{" "}
//             {selectedCustomerOrders
//               .reduce((sum, o) => sum + parseFloat(o.total_amount), 0)
//               .toFixed(2)}
//           </Text>
//         </View>
//         <View style={styles.statItem}>
//           <Text style={styles.statLabel}>Last Seen</Text>
//           {selectedCustomerOrders.length > 0 ? (
//             <>
//               <Text style={styles.statValue}>
//                 {new Date(selectedCustomerOrders[0].order_date).toLocaleDateString()}
//               </Text>
//               <Text style={styles.statValueTime}>
//                 {new Date(selectedCustomerOrders[0].order_date).toLocaleTimeString([], {
//                   hour: "2-digit",
//                   minute: "2-digit",
//                 })}
//               </Text>
//             </>
//           ) : (
//             <Text style={styles.statValue}>N/A</Text>
//           )}
//         </View>
//       </View>

//       {/* Distance */}
//       <Text style={styles.infoDistance}>Distance: {distance} km away</Text>
//     </View>
//   </View>
// )}


//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// // ----------------------- Styles -----------------------
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#f9f9f9" },
//   topBar: {
//     position: "absolute",
//     top: Platform.OS === "ios" ? 50 : 30,
//     width: "100%",
//     paddingHorizontal: 15,
//     zIndex: 20,
//   },
//   searchSection: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     shadowColor: "#000",
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 2 },
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   searchInput: {
//     flex: 1,
//     backgroundColor: "#f3f3f3",
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     height: 40,
//     color: "#333",
//   },
//   trackButton: {
//     marginLeft: 8,
//     paddingHorizontal: 16,
//     paddingVertical: 9,
//     borderRadius: 8,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   trackText: { color: "#fff", fontWeight: "bold" },
//   customerList: {
//     position: "absolute",
//     top: Platform.OS === "ios" ? 100 : 80,
//     left: 15,
//     right: 15,
//     backgroundColor: "#fff",
//     borderRadius: 10,
//     elevation: 4,
//     shadowColor: "#000",
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 2 },
//     shadowRadius: 4,
//     maxHeight: height * 0.25,
//     zIndex: 30,
//   },
//   customerItem: {
//     padding: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//   },
//   customerName: { fontSize: 16, color: "#333" },
//   map: { flex: 1 },
//   infoBox: {
//   position: "absolute",
//   bottom: 20,
//   left: 15,
//   right: 15,
//   backgroundColor: "#fff",
//   borderRadius: 16,
//   padding: 16,
//   shadowColor: "#000",
//   shadowOpacity: 0.2,
//   shadowOffset: { width: 0, height: 5 },
//   shadowRadius: 8,
//   elevation: 8,
// },
// infoContent: {
//   flexDirection: "column",
//   marginTop: 12, // leave space for button
// },
// clearBtn: {
//   position: "absolute",
//   top: 10,
//   right: 10,
//   width: 36,
//   height: 36,
//   borderRadius: 18,
//   backgroundColor: "#eee",
//   justifyContent: "center",
//   alignItems: "center",
//   zIndex: 10,
// },
// clearText: { fontSize: 18, color: "#555", fontWeight: "700" },
// infoTitle: {
//   fontSize: 14,
//   color: "#555",
//   marginBottom: 4,
//   textTransform: "uppercase",
//   fontWeight: "600",
// },
// infoTextName: {
//   fontSize: 20,
//   fontWeight: "700",
//   color: "#007bff",
//   marginBottom: 12,
// },
// infoStats: {
//   flexDirection: "row",
//   flexWrap: "wrap", // allows wrapping on small screens
//   justifyContent: "space-between",
//   marginBottom: 8,
// },
// statItem: {
//   flex: 1,
//   minWidth: "28%", // allows 3 items per row on larger screens, wraps on smaller
//   marginHorizontal: 4,
//   marginVertical: 4,
//   paddingVertical: 10,
//   backgroundColor: "#f3f6fb",
//   borderRadius: 12,
//   alignItems: "center",
// },
// statLabel: {
//   fontSize: 12,
//   color: "#888",
//   marginBottom: 4,
//   fontWeight: "500",
//   textAlign: "center",
// },
// statValue: {
//   fontSize: 12,
//   fontWeight: "600",
//   color: "#333",
//   textAlign: "center",
// },
// statValueTime: {
//   fontSize: 12,
//   fontWeight: "500",
//   color: "#555",
//   textAlign: "center",
//   marginTop: 2,
// },
// infoDistance: {
//   fontSize: 14,
//   color: "#007bff",
//   fontWeight: "600",
//   marginTop: 8,
//   textAlign: "center",
// },

//   loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
//   loadingText: { fontSize: 16, color: "#333" },
// });






// import React, { useEffect, useState, useRef } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   TextInput,
//   FlatList,
//   Keyboard,
//   Dimensions,
//   Platform,
//   Alert,
//   KeyboardAvoidingView,
// } from "react-native";
// import MapView, { Marker, Polyline } from "react-native-maps";
// import * as Location from "expo-location";
// import haversine from "haversine";
// import PolylineDecoder from "@mapbox/polyline";
// import { getAllCustomers, searchCustomers } from "../database";
// import { SafeAreaView } from "react-native-safe-area-context";

// const GOOGLE_MAPS_API_KEY = "AIzaSyCpXDv4FldOMug08hNGFwAn7fGcviuLHF4";
// const { height } = Dimensions.get("window");

// export default function LiveTrackingScreen({ route }) {
//   const mapRef = useRef(null);
//   const passedCustomer = route?.params?.customer || null;
//   const passedCustomerUsed = useRef(false);

//   const [currentLocation, setCurrentLocation] = useState(null);
//   const [customers, setCustomers] = useState([]);
//   const [filteredCustomers, setFilteredCustomers] = useState([]);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [distance, setDistance] = useState(null);
//   const [routeCoords, setRouteCoords] = useState([]);
//   const [tracking, setTracking] = useState(false);

//   // ----------------------- Location Setup -----------------------
//   useEffect(() => {
//     let subscription;

//     const initLocation = async () => {
//       try {
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== "granted") {
//           Alert.alert(
//             "Permission Denied",
//             "App requires location permission to work properly."
//           );
//           return;
//         }

//         const loc = await Location.getCurrentPositionAsync({
//           accuracy: Location.Accuracy.High,
//         });

//         setCurrentLocation({
//           latitude: loc.coords.latitude,
//           longitude: loc.coords.longitude,
//         });

//         // Watch location for live updates
//         subscription = await Location.watchPositionAsync(
//           { accuracy: Location.Accuracy.High, distanceInterval: 5 },
//           (locUpdate) => {
//             const newLoc = {
//               latitude: locUpdate.coords.latitude,
//               longitude: locUpdate.coords.longitude,
//             };
//             setCurrentLocation(newLoc);

//             // Update route if tracking
//             if (tracking && selectedCustomer) {
//               const customerLoc = {
//                 latitude: parseFloat(selectedCustomer.latitude),
//                 longitude: parseFloat(selectedCustomer.longitude),
//               };
//               fetchRoute(newLoc, customerLoc);
//               updateDistance(newLoc, customerLoc);
//             }
//           }
//         );
//       } catch (err) {
//         console.log("Location error:", err);
//       }
//     };

//     initLocation();

//     return () => {
//       if (subscription) subscription.remove();
//     };
//   }, [tracking, selectedCustomer]);

//   // ----------------------- Fetch Customers -----------------------
//   useEffect(() => {
//     const fetchCustomers = async () => {
//       const data = await getAllCustomers();
//       setCustomers(data);
//       setFilteredCustomers(data);
//     };
//     fetchCustomers();
//   }, []);

//   // ----------------------- Handle Passed Customer -----------------------

//   useEffect(() => {
//   if (passedCustomer && !passedCustomerUsed.current && currentLocation) {
//     if (passedCustomer.latitude != null && passedCustomer.longitude != null) {
//       passedCustomerUsed.current = true;
//       setSelectedCustomer(passedCustomer);
//       setTracking(true);

//       const customerLoc = {
//         latitude: parseFloat(passedCustomer.latitude),
//         longitude: parseFloat(passedCustomer.longitude),
//       };

//       fetchRoute(currentLocation, customerLoc);
//       updateDistance(currentLocation, customerLoc);

//       if (mapRef.current) {
//         mapRef.current.animateToRegion(
//           {
//             latitude: customerLoc.latitude,
//             longitude: customerLoc.longitude,
//             latitudeDelta: 0.01,
//             longitudeDelta: 0.01,
//           },
//           1000
//         );
//       }
//     }
//   }
// }, [passedCustomer, currentLocation]);

//   // useEffect(() => {
//   //   if (passedCustomer && !passedCustomerUsed.current) {
//   //     passedCustomerUsed.current = true;
//   //     setSelectedCustomer(passedCustomer);

//   //     const customerLoc = {
//   //       latitude: parseFloat(passedCustomer.latitude),
//   //       longitude: parseFloat(passedCustomer.longitude),
//   //     };

//   //     if (mapRef.current) {
//   //       mapRef.current.animateToRegion(
//   //         {
//   //           latitude: customerLoc.latitude,
//   //           longitude: customerLoc.longitude,
//   //           latitudeDelta: 0.01,
//   //           longitudeDelta: 0.01,
//   //         },
//   //         1000
//   //       );
//   //     }

//   //     if (currentLocation) {
//   //       setTracking(true);
//   //       updateDistance(currentLocation, customerLoc);
//   //       fetchRoute(currentLocation, customerLoc);
//   //     }
//   //   }
//   // }, [passedCustomer, currentLocation]);

//   // ----------------------- Search Customers -----------------------
//   // ----------------------- Search Customers -----------------------
//   const handleSearch = async (text) => {
//   setSearchQuery(text);
//   if (text.trim() === "") {
//     setFilteredCustomers(customers);
//     setSelectedCustomer(null);
//     setRouteCoords([]);
//     setTracking(false);
//   } else {
//     const data = await searchCustomers(text);
//     setFilteredCustomers(data);

//     // Auto-track only if customer has valid location
//     if (data.length === 1 && data[0].latitude != null && data[0].longitude != null) {
//       const customer = data[0];
//       setSelectedCustomer(customer);
//       setTracking(true);

//       const customerLoc = {
//         latitude: parseFloat(customer.latitude),
//         longitude: parseFloat(customer.longitude),
//       };

//       updateDistance(currentLocation, customerLoc);
//       fetchRoute(currentLocation, customerLoc);

//       if (mapRef.current) {
//         mapRef.current.animateToRegion(
//           {
//             latitude: customerLoc.latitude,
//             longitude: customerLoc.longitude,
//             latitudeDelta: 0.01,
//             longitudeDelta: 0.01,
//           },
//           1000
//         );
//       }
//     } else {
//       setSelectedCustomer(null);
//     }
//   }
// };

//   // ----------------------- Fetch Route -----------------------
//   const fetchRoute = async (origin, destination) => {
//     try {
//       const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
//       const response = await fetch(url);
//       const data = await response.json();

//       if (data.routes.length) {
//         const points = PolylineDecoder.decode(
//           data.routes[0].overview_polyline.points
//         );
//         const coords = points.map((point) => ({
//           latitude: point[0],
//           longitude: point[1],
//         }));
//         setRouteCoords(coords);
//       }
//     } catch (error) {
//       console.log("Directions error:", error);
//     }
//   };

//   // ----------------------- Update Distance -----------------------
//   const updateDistance = (origin, destination) => {
//     const dist = haversine(origin, destination, { unit: "km" }).toFixed(2);
//     setDistance(dist);
//   };

//   // ----------------------- Track Customer -----------------------
//   const handleTrack = async () => {
//     if (!selectedCustomer) {
//       Alert.alert("Select Customer", "Please select a customer to track.");
//       return;
//     }

//     if (!currentLocation) {
//       Alert.alert(
//         "Location not available",
//         "Waiting for GPS signal. Try again in a moment."
//       );
//       return;
//     }

//     setTracking(true);

//     const customerLoc = {
//       latitude: parseFloat(selectedCustomer.latitude),
//       longitude: parseFloat(selectedCustomer.longitude),
//     };

//     updateDistance(currentLocation, customerLoc);
//     fetchRoute(currentLocation, customerLoc);

//     if (mapRef.current) {
//       mapRef.current.animateToRegion(
//         {
//           latitude: customerLoc.latitude,
//           longitude: customerLoc.longitude,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         },
//         1000
//       );
//     }

//     Keyboard.dismiss();
//   };

//   // ----------------------- Clear Tracking -----------------------
//   const clearTracking = () => {
//     setSelectedCustomer(null);
//     setRouteCoords([]);
//     setDistance(null);
//     setTracking(false);
//     setFilteredCustomers(customers);
//     setSearchQuery("");
//     passedCustomerUsed.current = true;

//     if (mapRef.current && currentLocation) {
//       mapRef.current.animateToRegion(
//         {
//           latitude: currentLocation.latitude,
//           longitude: currentLocation.longitude,
//           latitudeDelta: 0.05,
//           longitudeDelta: 0.05,
//         },
//         1000
//       );
//     }
//   };

//   // ----------------------- Auto Track when Marker Pressed -----------------------
//   const handleMarkerPress = (cust) => {
//     setSelectedCustomer(cust);
//     setTracking(true);
//     const customerLoc = {
//       latitude: parseFloat(cust.latitude),
//       longitude: parseFloat(cust.longitude),
//     };

//     if (currentLocation) {
//       updateDistance(currentLocation, customerLoc);
//       fetchRoute(currentLocation, customerLoc);
//     }

//     if (mapRef.current) {
//       mapRef.current.animateToRegion(
//         {
//           latitude: customerLoc.latitude,
//           longitude: customerLoc.longitude,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         },
//         1000
//       );
//     }
//   };

//   // ----------------------- Render -----------------------
//   return (
//     <SafeAreaView style={{ flex: 1 }} edges={["bottom", "left", "right"]}>
//       <KeyboardAvoidingView
//         style={{ flex: 1 }}
//         behavior={Platform.OS === "ios" ? "padding" : undefined}
//       >
//         <View style={styles.container}>
//           {/* Top Search Bar + Track */}
//           <View style={styles.topBar}>
//             <View style={styles.searchSection}>
//               <TextInput
//                 style={styles.searchInput}
//                 placeholder="Search customer..."
//                 placeholderTextColor="#999"
//                 value={searchQuery}
//                 onChangeText={handleSearch}
//               />
//               <TouchableOpacity
//                 style={[
//                   styles.trackButton,
//                   { backgroundColor: selectedCustomer ? "#007bff" : "#ccc" },
//                 ]}
//                 onPress={handleTrack}
//                 disabled={!selectedCustomer}
//               >
//                 <Text style={styles.trackText}>Track</Text>
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* Customer List */}
//           {searchQuery.length > 0 && filteredCustomers.length > 0 && (
//             <FlatList
//               data={filteredCustomers}
//               keyExtractor={(item, index) =>
//                 item?.entity_id ? item.entity_id.toString() : `dummy-${index}`
//               }
//               renderItem={({ item }) =>
//                 item ? (
//                   <TouchableOpacity
//                     style={styles.customerItem}
//                     onPress={() => {
//                       setSelectedCustomer(item);
//                       setSearchQuery("");
//                       setFilteredCustomers([item]);
//                       Keyboard.dismiss();

//                       if (currentLocation && item.latitude && item.longitude) {
//                         setTracking(true);

//                         const customerLoc = {
//                           latitude: parseFloat(item.latitude),
//                           longitude: parseFloat(item.longitude),
//                         };

//                         updateDistance(currentLocation, customerLoc);
//                         fetchRoute(currentLocation, customerLoc);

//                         if (mapRef.current) {
//                           mapRef.current.animateToRegion(
//                             {
//                               latitude: customerLoc.latitude,
//                               longitude: customerLoc.longitude,
//                               latitudeDelta: 0.01,
//                               longitudeDelta: 0.01,
//                             },
//                             1000
//                           );
//                         }
//                       }
//                     }}
//                   >
//                     <Text style={styles.customerName}>{item.name}</Text>
//                   </TouchableOpacity>
//                 ) : null
//               }
//               style={styles.customerList}
//             />
//           )}

//           {/* Map */}
//           {currentLocation ? (
//             <MapView
//               ref={mapRef}
//               style={styles.map}
//               showsUserLocation
//               showsMyLocationButton
//               initialRegion={{
//                 latitude: currentLocation.latitude,
//                 longitude: currentLocation.longitude,
//                 latitudeDelta: 0.05,
//                 longitudeDelta: 0.05,
//               }}
//             >
              
//               {(selectedCustomer ? [selectedCustomer] : filteredCustomers).map(
//   (cust, index) =>
//     cust?.latitude != null && cust?.longitude != null ? (
//       <Marker
//         key={cust.entity_id ? cust.entity_id.toString() : `marker-${index}`}
//         coordinate={{
//           latitude: parseFloat(cust.latitude),
//           longitude: parseFloat(cust.longitude),
//         }}
//         title={cust.name}
//         pinColor={
//           selectedCustomer?.entity_id === cust.entity_id
//             ? "#007bff"
//             : cust.visited === "Visited"
//             ? "green"
//             : "red"
//         }
//         onPress={() => handleMarkerPress(cust)}
//       />
//     ) : null
// )}


//               {routeCoords.length > 0 && (
//                 <Polyline
//                   coordinates={routeCoords}
//                   strokeColor="#007bff"
//                   strokeWidth={4}
//                 />
//               )}
//             </MapView>
//           ) : (
//             <View style={styles.loadingContainer}>
//               <Text style={styles.loadingText}>Getting your location...</Text>
//             </View>
//           )}

//           {/* Distance Info */}
//           {distance && selectedCustomer && (
//             <View style={styles.infoBox}>
//               <View style={styles.infoContent}>
//                 <View style={{ flex: 1 }}>
//                   <Text style={styles.infoTitle}>Tracking Customer</Text>
//                   <Text style={styles.infoText}>{selectedCustomer.name}</Text>
//                   <Text style={styles.infoDistance}>{distance} km away</Text>
//                 </View>
//                 <TouchableOpacity
//                   onPress={clearTracking}
//                   style={styles.clearBtn}
//                 >
//                   <Text style={styles.clearText}>✕</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           )}
//         </View>
//       </KeyboardAvoidingView>
//     </SafeAreaView>
//   );
// }

// // ----------------------- Styles -----------------------
// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#f9f9f9" },
//   topBar: {
//     position: "absolute",
//     top: Platform.OS === "ios" ? 50 : 30,
//     width: "100%",
//     paddingHorizontal: 15,
//     zIndex: 20,
//   },
//   searchSection: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     shadowColor: "#000",
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 2 },
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   searchInput: {
//     flex: 1,
//     backgroundColor: "#f3f3f3",
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     height: 40,
//     color: "#333",
//   },
//   trackButton: {
//     marginLeft: 8,
//     paddingHorizontal: 16,
//     paddingVertical: 9,
//     borderRadius: 8,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   trackText: { color: "#fff", fontWeight: "bold" },
//   customerList: {
//     position: "absolute",
//     top: Platform.OS === "ios" ? 100 : 80,
//     left: 15,
//     right: 15,
//     backgroundColor: "#fff",
//     borderRadius: 10,
//     elevation: 4,
//     shadowColor: "#000",
//     shadowOpacity: 0.1,
//     shadowOffset: { width: 0, height: 2 },
//     shadowRadius: 4,
//     maxHeight: height * 0.25,
//     zIndex: 30,
//   },
//   customerItem: {
//     padding: 12,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//   },
//   customerName: { fontSize: 16, color: "#333" },
//   map: { flex: 1 },
//   infoBox: {
//     position: "absolute",
//     bottom: 30,
//     left: 20,
//     right: 20,
//     backgroundColor: "#fff",
//     borderRadius: 12,
//     padding: 10,
//     shadowColor: "#000",
//     shadowOpacity: 0.15,
//     shadowOffset: { width: 0, height: 3 },
//     shadowRadius: 6,
//     elevation: 6,
//   },
//   infoContent: { flexDirection: "row", alignItems: "center" },
//   infoTitle: { fontSize: 14, color: "#888", marginBottom: 4 },
//   infoText: { fontSize: 16, fontWeight: "600", color: "#333" },
//   infoDistance: { fontSize: 15, color: "#007bff", marginTop: 3 },
//   clearBtn: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: "#eee",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   clearText: { fontSize: 18, color: "#555" },
//   loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
//   loadingText: { fontSize: 16, color: "#333" },
// });