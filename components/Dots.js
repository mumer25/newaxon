import { View } from "react-native";

export default function Dots({ active }) {
  return (
    <View
      style={{
        flexDirection: "row",
        marginTop: 40,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {[0, 1, 2].map((i) => {
        const isActive = active === i;
        return (
          <View
            key={i}
            style={{
              width: isActive ? 20 : 8,
              height: 8,
              borderRadius: 4,
              marginHorizontal: 4,
              backgroundColor: isActive ? "#FFFFFF" : "rgba(255,255,255,0.4)",
            }}
          />
        );
      })}
    </View>
  );
}
