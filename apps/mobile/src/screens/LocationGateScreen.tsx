import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useLocation } from "../contexts/LocationContext";
import { API_BASE_URL } from "../lib/supabase";

type Props = NativeStackScreenProps<RootStackParamList, "LocationGate">;

/**
 * 地理位置门控页面
 * ----------------
 * 1. 首次进入 -> 请求定位权限
 * 2. 授权 -> 获取GPS -> 调用后端逆地理编码 -> 匹配学校 -> 进入首页
 * 3. 拒绝 -> 显示空白页 + "点击开始登录" 按钮
 */
const LocationGateScreen: React.FC<Props> = ({ navigation }) => {
  const { status, setLocationData, matchedSchool, canteens, address } =
    useLocation();
  const [localStatus, setLocalStatus] = useState<
    "idle" | "requesting" | "loading" | "denied" | "done"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // 页面加载时自动请求定位
  useEffect(() => {
    requestLocation();
  }, []);

  // 定位成功后自动跳转
  useEffect(() => {
    if (localStatus === "done" && matchedSchool) {
      navigation.replace("Home");
    }
  }, [localStatus, matchedSchool, navigation]);

  const requestLocation = async () => {
    setLocalStatus("requesting");
    setErrorMsg("");

    try {
      // 1. 请求前台定位权限
      const { status: permStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (permStatus !== "granted") {
        // 用户拒绝授权 -> 显示空白页面
        setLocalStatus("denied");
        setLocationData({ status: "denied" });
        return;
      }

      // 2. 获取 GPS 坐标
      setLocalStatus("loading");
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude: lat, longitude: lng } = pos.coords;
      setLocationData({
        status: "loading",
        location: { lat, lng },
      });

      // 3. 调用后端逆地理编码
      const response = await fetch(`${API_BASE_URL}/location/geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "定位服务异常");
      }

      // 4. 更新定位上下文
      setLocationData({
        status: data.matchedSchool ? "granted" : "no_school",
        location: { lat, lng },
        address: data.address
          ? {
              formattedAddress: data.address.formattedAddress,
              province: data.address.province,
              city: data.address.city,
              district: data.address.district,
            }
          : undefined,
        matchedSchool: data.matchedSchool || undefined,
        matchedCampus: data.matchedCampus || undefined,
        canteens: data.canteens || [],
        nearbySchools: data.nearbySchools || [],
      });

      setLocalStatus("done");

      // 如果没有匹配到学校，停留页面并提示
      if (!data.matchedSchool) {
        setErrorMsg("未匹配到附近的注册学校");
        // 仍然可以手动去首页
        setTimeout(() => {
          navigation.replace("Home");
        }, 2000);
      }
    } catch (error: any) {
      console.error("[定位失败]", error);
      setErrorMsg(error.message || "定位失败，请稍后重试");
      setLocalStatus("denied");
      setLocationData({ status: "denied" });
    }
  };

  // 重新请求定位
  const handleRetry = () => {
    requestLocation();
  };

  // 点击空白 -> 进入登录
  const handleGoToLogin = () => {
    navigation.replace("Login");
  };

  // ========== 渲染 ==========

  // 定位加载中
  if (localStatus === "requesting" || localStatus === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>
          {localStatus === "requesting"
            ? "请求定位权限..."
            : "正在获取位置信息..."}
        </Text>
        <Text style={styles.loadingSubText}>需要您的位置来发现附近食堂</Text>
      </View>
    );
  }

  // 同意授权 -> 定位成功 -> 自动跳转 Home
  if (localStatus === "done" && matchedSchool) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>定位成功!</Text>
        <Text style={styles.schoolName}>{matchedSchool.name}</Text>
        <Text style={styles.loadingSubText}>正在进入食堂推荐...</Text>
      </View>
    );
  }

  // 同意授权但未匹配到学校
  if (localStatus === "done" && !matchedSchool) {
    return (
      <View style={styles.container}>
        <Text style={styles.locateIcon}>📍</Text>
        <Text style={styles.title}>已获取位置</Text>
        {address && (
          <Text style={styles.addressText}>{address.formattedAddress}</Text>
        )}
        <Text style={styles.errorText}>{errorMsg}</Text>
        <Text style={styles.hintText}>将为您展示所有食堂</Text>
      </View>
    );
  }

  // 拒绝授权 -> 空白页面
  return (
    <View style={styles.container}>
      <View style={styles.blankContent}>
        <Text style={styles.locationIcon}>🌍</Text>
        <Text style={styles.blankTitle}>位置服务未开启</Text>
        <Text style={styles.blankDesc}>
          开启位置权限可发现附近大学食堂
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={handleRetry}
          activeOpacity={0.7}
        >
          <Text style={styles.retryButtonText}>重新授权定位</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleGoToLogin}
          activeOpacity={0.7}
        >
          <Text style={styles.loginButtonText}>跳过定位，直接进入 →</Text>
        </TouchableOpacity>

        <Text style={styles.skipHint}>登录后获得更好体验</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  // 加载中
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
  },
  loadingSubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
  schoolName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4CAF50",
    marginTop: 12,
  },
  // 定位成功无学校
  locateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 15,
    color: "#FF6B35",
    marginBottom: 8,
  },
  hintText: {
    fontSize: 14,
    color: "#999",
  },
  // 拒绝授权 - 空白页
  blankContent: {
    alignItems: "center",
    width: "100%",
  },
  locationIcon: {
    fontSize: 72,
    marginBottom: 20,
  },
  blankTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  blankDesc: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 20,
  },
  retryButton: {
    borderWidth: 1.5,
    borderColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  retryButtonText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  skipHint: {
    fontSize: 12,
    color: "#BBB",
    marginTop: 16,
  },
});

export default LocationGateScreen;
