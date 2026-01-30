// components/MapPin.js
import React from "react";
import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";

const MapPin = React.memo(({ color = "#008000", label = "MA" }) => {
  return (
    <Svg width={40} height={40} viewBox="0 0 120 160">
      {/* Outer pin */}
      <Path
        d="M60 0C32 0 10 22 10 50C10 87 60 150 60 150C60 150 110 87 110 50C110 22 88 0 60 0Z"
        fill="#fff"
        stroke={color}
        strokeWidth={2}
      />

      {/* Inner circle */}
      <Circle cx="60" cy="52" r="42" fill={color} />

      {/* Label */}
      <SvgText
        x="60"
        y="65"
        fontSize="28"
        fill="#fff"
        fontWeight="bold"
        textAnchor="middle"
      >
        {label}
      </SvgText>
    </Svg>
  );
});

export default MapPin;




// import React from "react";
// import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";

// export default function MapPin({ color = "#008000", label = "MA" }) {
//   return (
//     <Svg width={50} height={46} viewBox="0 0 120 160" pointerEvents="none">
//       {/* Outer pin */}
//       <Path
//         d="M60 0C32 0 10 22 10 50C10 87 60 150 60 150C60 150 110 87 110 50C110 22 88 0 60 0Z"
//         fill="#fff"
//         stroke={color}
//         strokeWidth={2}
//       />
//       {/* Circle */}
//       <Circle cx="60" cy="52" r="42" fill={color} />
//       {/* Label */}
//       <SvgText
//         x="62"
//         y="62"
//         fontSize="36"
//         fill="#fff"
//         fontWeight="bold"
//         textAnchor="middle"
//       >
//         {label}
//       </SvgText>
//     </Svg>
//   );
// }





// Recently upadated cod

// import React, { memo } from "react";
// import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";

// const MapPin = memo(({ color = "#008000", label = "MA" }) => (
//   <Svg width={50} height={60} viewBox="0 -10 50 160">
//     <Path
//       d="M45 0C23 0 5 18 5 40C5 70 45 120 45 120C45 120 85 70 85 40C85 18 67 0 45 0Z"
//       fill="#ffffff"
//       stroke={color}
//       strokeWidth={10}
//     />
//     <Circle cx="45" cy="42" r="25" fill={color} />
//     <SvgText
//       x="45"
//       y="48"
//       fontSize="22"
//       fill="#ffffff"
//       fontWeight="700"
//       textAnchor="middle"
//     >
//       {label}
//     </SvgText>
//   </Svg>
// ));

// export default MapPin;