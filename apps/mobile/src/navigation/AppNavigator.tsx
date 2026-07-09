import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import LocationGateScreen from "../screens/LocationGateScreen";
import LoginScreen from "../screens/LoginScreen";
import OTPScreen from "../screens/OTPScreen";
import CompleteProfileScreen from "../screens/CompleteProfileScreen";
import HomeScreen from "../screens/HomeScreen";

export type RootStackParamList = {
  LocationGate: undefined;
  Login: undefined;
  OTP: { phone: string };
  CompleteProfile: { phone: string };
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** 启动加载画面 */
const SplashScreen: React.FC = () => (
  <View style={styles.splash}>
    <Text style={styles.splashIcon}>🍽️</Text>
    <Text style={styles.splashTitle}>食堂推荐系统</Text>
    <ActivityIndicator
      size="large"
      color="#4CAF50"
      style={styles.splashLoader}
    />
  </View>
);

const AppNavigator: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      initialRouteName="LocationGate"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#FFFFFF" },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="LocationGate" component={LocationGateScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  splashIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#333",
    marginBottom: 32,
  },
  splashLoader: {
    marginTop: 8,
  },
});

export default AppNavigator;
