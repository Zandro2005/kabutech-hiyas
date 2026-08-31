import React from 'react';
import Svg, { Path, Defs, LinearGradient, Stop, Ellipse, Circle, G } from 'react-native-svg';

interface RealisticMushroomIconProps {
  size?: number;
  rotate?: string;
}

export default function RealisticMushroomIcon({ size = 36, rotate = '12deg' }: RealisticMushroomIconProps) {
  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none"
      style={{ transform: [{ rotate }] }}
    >
      <Defs>
        {/* Cap 3D Gradient */}
        <LinearGradient id="capGrad" x1="0.3" y1="0" x2="0.7" y2="1">
          <Stop offset="0%" stopColor="#4ade80" />
          <Stop offset="30%" stopColor="#3d8c63" />
          <Stop offset="75%" stopColor="#245c3f" />
          <Stop offset="100%" stopColor="#143b27" />
        </LinearGradient>
        
        {/* Cap Gloss Highlight */}
        <LinearGradient id="highlightGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <Stop offset="40%" stopColor="#86efac" stopOpacity="0.35" />
          <Stop offset="100%" stopColor="#3d8c63" stopOpacity="0" />
        </LinearGradient>

        {/* Under-cap Gills */}
        <LinearGradient id="gillsGrad" x1="0" y1="0.5" x2="1" y2="0.5">
          <Stop offset="0%" stopColor="#143b27" />
          <Stop offset="50%" stopColor="#2d6a4f" />
          <Stop offset="100%" stopColor="#143b27" />
        </LinearGradient>

        {/* Stem Gradient */}
        <LinearGradient id="stemGrad" x1="0" y1="0.5" x2="1" y2="0.5">
          <Stop offset="0%" stopColor="#e2e8f0" />
          <Stop offset="30%" stopColor="#ffffff" />
          <Stop offset="70%" stopColor="#e2e8f0" />
          <Stop offset="100%" stopColor="#94a3b8" />
        </LinearGradient>

        {/* Drop Shadow */}
        <LinearGradient id="shadowGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0%" stopColor="#0f172a" stopOpacity="0.3" />
          <Stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* Soft Ground Shadow */}
      <Ellipse cx="32" cy="58" rx="16" ry="3.5" fill="url(#shadowGrad)" />

      {/* Mushroom Stem */}
      <Path 
        d="M26 34 C26 34, 24.5 48, 23 55 C23 57.5, 41 57.5, 41 55 C39.5 48, 38 34, 38 34 Z" 
        fill="url(#stemGrad)" 
      />
      {/* Stem Ring Details */}
      <Path d="M25 46 Q32 48.5 39 46" stroke="#cbd5e1" strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <Path d="M24 51 Q32 53.5 40 51" stroke="#cbd5e1" strokeWidth="0.8" fill="none" strokeLinecap="round" />

      {/* Under-cap Gills */}
      <Ellipse cx="32" cy="34" rx="22" ry="5.5" fill="url(#gillsGrad)" />
      {/* Fine Gill Lines */}
      <Path d="M16 34.5 L32 35.5 M22 36 L32 35.5 M42 36 L32 35.5 M48 34.5 L32 35.5" stroke="#4ade80" strokeWidth="0.6" strokeOpacity="0.4" />

      {/* Mushroom Cap with 3D curve */}
      <Path 
        d="M10 34 C10 16, 20 8, 32 8 C44 8, 54 16, 54 34 C44 37, 20 37, 10 34 Z" 
        fill="url(#capGrad)" 
      />

      {/* Glossy Top Highlight */}
      <Path 
        d="M16 26 C19 15, 24 11, 32 11 C40 11, 45 15, 48 26 C41 22, 23 22, 16 26 Z" 
        fill="url(#highlightGrad)" 
      />

      {/* Realistic Organic Spots */}
      <Circle cx="24" cy="18" r="2.2" fill="#ffffff" fillOpacity="0.75" />
      <Circle cx="38" cy="19" r="2.8" fill="#ffffff" fillOpacity="0.7" />
      <Circle cx="31" cy="24" r="1.6" fill="#ffffff" fillOpacity="0.6" />
      <Circle cx="44" cy="27" r="1.8" fill="#ffffff" fillOpacity="0.55" />
      <Circle cx="18" cy="27" r="1.5" fill="#ffffff" fillOpacity="0.55" />

      {/* Miniature Fresh Sprouts at base */}
      <Path d="M22 55.5 C19.5 52, 16 52.5, 15.5 54.5 C17 56.5, 20 56.5, 22 55.5 Z" fill="#22c55e" />
      <Path d="M42 55.5 C44.5 52, 48 52.5, 48.5 54.5 C47 56.5, 44 56.5, 42 55.5 Z" fill="#22c55e" />
    </Svg>
  );
}
