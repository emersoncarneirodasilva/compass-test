import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  Alert,
  Vibration,
  ImageBackground,
} from "react-native";
import Svg, {
  Circle,
  Line,
  Text as SvgText,
  G,
  Path,
  Defs,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { Magnetometer, MagnetometerMeasurement } from "expo-sensors";
import * as Location from "expo-location";
import MagVar from "magvar";

const WINDOW_WIDTH = Dimensions.get("window").width;
const COMPASS_SIZE = WINDOW_WIDTH * 0.8;
const CENTER = COMPASS_SIZE / 2;
const NEEDLE_LENGTH = CENTER - 40;
const WIND_ROSE_RADIUS = CENTER - 30;

export default function Index() {
  const [degree, setDegree] = useState(0);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [magneticDeclination, setMagneticDeclination] = useState<number>(0);
  const [lastVibratedCardinal, setLastVibratedCardinal] = useState<
    string | null
  >(null);

  // Location and magnetometer effects remain the same
  useEffect(() => {
    const fetchLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permissão Negada",
          "Ative a permissão de localização nas configurações."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
    };

    fetchLocation();
  }, []);

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      try {
        const declination = MagVar.get(latitude, longitude);
        setMagneticDeclination(declination);
      } catch (error) {
        console.error("Erro ao calcular declinação magnética:", error);
        setMagneticDeclination(0);
      }
    }
  }, [latitude, longitude]);

  useEffect(() => {
    let subscription: { remove: () => void };

    const subscribe = () => {
      subscription = Magnetometer.addListener(
        ({ x, y }: MagnetometerMeasurement) => {
          if (magneticDeclination !== null) {
            let angle = Math.atan2(-x, y) * (180 / Math.PI);
            angle = angle < 0 ? angle + 360 : angle;

            let correctedAngle = angle - magneticDeclination;
            if (correctedAngle < 0) {
              correctedAngle += 360;
            } else if (correctedAngle >= 360) {
              correctedAngle -= 360;
            }

            setDegree(correctedAngle);
          }
        }
      );

      Magnetometer.setUpdateInterval(100);
    };

    subscribe();

    return () => {
      subscription?.remove();
    };
  }, [magneticDeclination]);

  const renderWindRose = () => {
    const rays = [];

    // Círculos decorativos com gradiente
    rays.push(
      <Circle
        key="outer-circle"
        cx={CENTER}
        cy={CENTER}
        r={WIND_ROSE_RADIUS}
        fill="url(#compassGradient)"
        stroke="#8B4513"
        strokeWidth="2"
      />,
      <Circle
        key="inner-circle-1"
        cx={CENTER}
        cy={CENTER}
        r={WIND_ROSE_RADIUS * 0.8}
        stroke="#8B4513"
        strokeWidth="0.5"
        fill="none"
      />,
      <Circle
        key="inner-circle-2"
        cx={CENTER}
        cy={CENTER}
        r={WIND_ROSE_RADIUS * 0.6}
        stroke="#8B4513"
        strokeWidth="0.5"
        fill="none"
      />,
      <Circle
        key="inner-circle-3"
        cx={CENTER}
        cy={CENTER}
        r={WIND_ROSE_RADIUS * 0.4}
        stroke="#8B4513"
        strokeWidth="0.5"
        fill="none"
      />
    );

    // Raios principais (N, S, E, W)
    for (let i = 0; i < 4; i++) {
      const angle = i * 90;
      rays.push(
        <Path
          key={`main-ray-${i}`}
          d={`
            M ${CENTER} ${CENTER}
            L ${CENTER + WIND_ROSE_RADIUS * Math.sin((angle * Math.PI) / 180)} 
              ${CENTER - WIND_ROSE_RADIUS * Math.cos((angle * Math.PI) / 180)}
          `}
          stroke="#8B4513"
          strokeWidth="2"
        />
      );
    }

    // Raios secundários ornamentados (NE, SE, SW, NW)
    for (let i = 0; i < 4; i++) {
      const angle = 45 + i * 90;
      const midPoint = WIND_ROSE_RADIUS * 0.7;

      rays.push(
        <Path
          key={`secondary-ray-${i}`}
          d={`
            M ${CENTER} ${CENTER}
            L ${CENTER + midPoint * Math.sin((angle * Math.PI) / 180)} 
              ${CENTER - midPoint * Math.cos((angle * Math.PI) / 180)}
          `}
          stroke="#8B4513"
          strokeWidth="1.5"
        />
      );
    }

    // Padrão decorativo adicional
    for (let i = 0; i < 32; i++) {
      const angle = i * 11.25;
      const innerRadius = WIND_ROSE_RADIUS * 0.4;
      const outerRadius = WIND_ROSE_RADIUS * 0.5;

      rays.push(
        <Path
          key={`decorative-ray-${i}`}
          d={`
            M ${CENTER + innerRadius * Math.sin((angle * Math.PI) / 180)} 
              ${CENTER - innerRadius * Math.cos((angle * Math.PI) / 180)}
            L ${CENTER + outerRadius * Math.sin((angle * Math.PI) / 180)}
              ${CENTER - outerRadius * Math.cos((angle * Math.PI) / 180)}
          `}
          stroke="#8B4513"
          strokeWidth="0.5"
          opacity="0.6"
        />
      );
    }

    return rays;
  };

  const renderCompassPoints = () => {
    const points = [
      { angle: 0, label: "N" },
      { angle: 45, label: "NE" },
      { angle: 90, label: "E" },
      { angle: 135, label: "SE" },
      { angle: 180, label: "S" },
      { angle: 225, label: "SW" },
      { angle: 270, label: "W" },
      { angle: 315, label: "NW" },
    ];

    const tolerance = 5;

    return points.map((point) => {
      const isActive =
        Math.abs(degree - point.angle) <= tolerance ||
        Math.abs(degree - (point.angle + 360)) <= tolerance;

      if (isActive && lastVibratedCardinal !== point.label) {
        Vibration.vibrate(100);
        setLastVibratedCardinal(point.label);
      }

      const fontSize = point.label.length === 1 ? 20 : 14;
      const distance = point.label.length === 1 ? 30 : 32;

      return (
        <G
          key={point.angle}
          rotation={point.angle}
          origin={`${CENTER}, ${CENTER}`}
        >
          <Line
            x1={CENTER}
            y1={40}
            x2={CENTER}
            y2={60}
            stroke={isActive ? "#CD853F" : "#8B4513"}
            strokeWidth={point.label.length === 1 ? "2.5" : "1.5"}
          />
          <SvgText
            x={CENTER}
            y={distance}
            textAnchor="middle"
            fill={isActive ? "#CD853F" : "#8B4513"}
            fontSize={fontSize}
            fontWeight={point.label.length === 1 ? "bold" : "normal"}
            fontFamily="serif"
          >
            {point.label}
          </SvgText>
        </G>
      );
    });
  };

  const renderDegreeMarkers = () => {
    return Array.from({ length: 72 }).map((_, i) => (
      <Line
        key={i}
        x1={CENTER}
        y1={10}
        x2={CENTER}
        y2={i % 2 === 0 ? 20 : 15}
        stroke="#8B4513"
        strokeWidth={i % 2 === 0 ? "1" : "0.5"}
        transform={`rotate(${i * 5} ${CENTER} ${CENTER})`}
      />
    ));
  };

  const renderNeedle = () => {
    const baseWidth = 16;
    const tipWidth = 1;
    const midPoint = NEEDLE_LENGTH * 0.3;

    return (
      <Svg width={COMPASS_SIZE} height={COMPASS_SIZE} style={styles.needle}>
        {/* Norte (Vermelho) */}
        <Path
          d={`
            M ${CENTER - baseWidth / 2} ${CENTER}
            L ${CENTER - baseWidth / 3} ${CENTER - midPoint}
            Q ${CENTER - tipWidth} ${CENTER - NEEDLE_LENGTH * 0.7}
              ${CENTER} ${CENTER - NEEDLE_LENGTH}
            Q ${CENTER + tipWidth} ${CENTER - NEEDLE_LENGTH * 0.7}
              ${CENTER + baseWidth / 3} ${CENTER - midPoint}
            L ${CENTER + baseWidth / 2} ${CENTER}
            Z
          `}
          fill="#8B0000"
          stroke="#660000"
          strokeWidth="1"
        />

        {/* Sul (Azul) */}
        <Path
          d={`
            M ${CENTER - baseWidth / 2} ${CENTER}
            L ${CENTER - baseWidth / 3} ${CENTER + midPoint}
            Q ${CENTER - tipWidth} ${CENTER + NEEDLE_LENGTH * 0.7}
              ${CENTER} ${CENTER + NEEDLE_LENGTH}
            Q ${CENTER + tipWidth} ${CENTER + NEEDLE_LENGTH * 0.7}
              ${CENTER + baseWidth / 3} ${CENTER + midPoint}
            L ${CENTER + baseWidth / 2} ${CENTER}
            Z
          `}
          fill="#00008B"
          stroke="#000066"
          strokeWidth="1"
        />

        {/* Centro ornamentado */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={12}
          fill="url(#centerGradient)"
          stroke="#8B4513"
          strokeWidth="1"
        />
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={8}
          fill="url(#innerCenterGradient)"
          stroke="#8B4513"
          strokeWidth="0.5"
        />
        <Circle cx={CENTER} cy={CENTER} r={3} fill="#4A4A4A" />
      </Svg>
    );
  };

  return (
    <ImageBackground
      source={require("@/assets/images/bgImg.png")}
      resizeMode="cover"
      style={styles.container}
    >
      <View style={styles.overlay} />

      <Text style={styles.titulo}>My Compass</Text>

      <View style={styles.compassContainer}>
        <Svg
          width={COMPASS_SIZE}
          height={COMPASS_SIZE}
          style={[styles.compass, { transform: [{ rotate: `${-degree}deg` }] }]}
        >
          <Defs>
            <RadialGradient id="compassGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFF8DC" />
              <Stop offset="80%" stopColor="#FFF8DC" />
              <Stop offset="100%" stopColor="#DEB887" />
            </RadialGradient>
            <RadialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFE4B5" />
              <Stop offset="100%" stopColor="#DEB887" />
            </RadialGradient>
            <RadialGradient id="innerCenterGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FFF8DC" />
              <Stop offset="100%" stopColor="#DEB887" />
            </RadialGradient>
          </Defs>

          <Circle
            cx={CENTER}
            cy={CENTER}
            r={CENTER - 5}
            stroke="#8B4513"
            strokeWidth="3"
            fill="url(#compassGradient)"
          />
          {renderWindRose()}
          {renderDegreeMarkers()}
          {renderCompassPoints()}
        </Svg>
        {renderNeedle()}
      </View>

      <Text style={styles.degrees}>{Math.round(degree)}°</Text>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    // backgroundColor: "#F5DEB3",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  titulo: {
    textAlign: "center",
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 50,
    color: "#8B4513",
  },
  compassContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: COMPASS_SIZE,
    height: COMPASS_SIZE,
  },
  compass: {
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  needle: {
    position: "absolute",
    zIndex: 1,
  },
  degrees: {
    fontFamily: "serif",
    fontWeight: "bold",
    fontSize: 32,
    marginTop: 20,
    color: "#8B4513",
  },
});
