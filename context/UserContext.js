import React, { createContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    loadName();
  }, []);

  const loadName = async () => {
    const saved = await AsyncStorage.getItem("user_name");
    if (saved) setUserName(saved);
  };

  const updateUserName = async (newName) => {
    setUserName(newName);               // 🔥 Updates UI immediately
    await AsyncStorage.setItem("user_name", newName); // save to storage
  };

  return (
    <UserContext.Provider value={{ userName, updateUserName }}>
      {children}
    </UserContext.Provider>
  );
};
