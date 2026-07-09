import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "../contexts/LocationContext";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { backendUser, signOut } = useAuth();
  const { matchedSchool, matchedCampus, canteens, address, status, nearbySchools } =
    useLocation();

  const handleLogout = () => {
    Alert.alert("退出登录", "确定要退出登录吗?", [
      { text: "取消", style: "cancel" },
      {
        text: "确定",
        style: "destructive",
        onPress: async () => {
          await signOut();
          navigation.reset({
            index: 0,
            routes: [{ name: "LocationGate" }],
          });
        },
      },
    ]);
  };

  const handleRelocate = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "LocationGate" }],
    });
  };

  const displayName = backendUser?.phone
    ? `${backendUser.phone.slice(0, 3)}****${backendUser.phone.slice(-4)}`
    : "游客";

  // 未登录 + 无位置
  if (!backendUser && status === "denied") {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>未获取位置信息</Text>
          <Text style={styles.emptyDesc}>
            开启定位权限以发现附近大学食堂
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRelocate}
          >
            <Text style={styles.primaryButtonText}>开启定位</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: "Login" }],
              })
            }
          >
            <Text style={styles.secondaryButtonText}>登录账号</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>
              {backendUser ? "欢迎回来" : "你好"}
            </Text>
            <Text style={styles.userName}>
              {matchedSchool
                ? matchedCampus
                  ? `${matchedSchool.name} · ${matchedCampus.name}`
                  : matchedSchool.name
                : displayName}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <Text style={styles.logoutBtnText}>退出</Text>
          </TouchableOpacity>
        </View>

        {/* 定位信息 */}
        {address && (
          <View style={styles.locationBar}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {address.formattedAddress}
            </Text>
          </View>
        )}

        {/* 重新定位 */}
        <TouchableOpacity
          style={styles.relocateLink}
          onPress={handleRelocate}
        >
          <Text style={styles.relocateText}>重新定位</Text>
        </TouchableOpacity>
      </View>

      {/* 食堂列表 */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        {matchedSchool && (
          <View style={styles.schoolCard}>
            <Text style={styles.schoolCardIcon}>🏫</Text>
            <View style={styles.schoolCardInfo}>
              <Text style={styles.schoolCardName}>{matchedSchool.name}</Text>
              {matchedSchool.distance > 0 && (
                <Text style={styles.schoolCardDistance}>
                  距您 {matchedSchool.distance} 米
                </Text>
              )}
              {matchedCampus && (
                <Text style={styles.campusHint}>
                  📍 {matchedCampus.name}
                </Text>
              )}
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>推荐食堂</Text>

        {canteens.length === 0 ? (
          <View style={styles.emptyCanteens}>
            <Text style={styles.emptyCanteensIcon}>🍴</Text>
            <Text style={styles.emptyCanteensText}>
              {matchedSchool
                ? `${matchedSchool.name}暂无食堂数据`
                : "请先完成定位以获取食堂推荐"}
            </Text>
            {!matchedSchool && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleRelocate}
              >
                <Text style={styles.primaryButtonText}>开始定位</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          canteens.map((canteen) => (
            <View key={canteen.id} style={styles.canteenCard}>
              <View style={styles.canteenHeader}>
                <Text style={styles.canteenName}>{canteen.name}</Text>
                {canteen.rating > 0 && (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>
                      ★ {canteen.rating}
                    </Text>
                  </View>
                )}
              </View>
              {canteen.description && (
                <Text style={styles.canteenDesc}>
                  {canteen.description}
                </Text>
              )}
            </View>
          ))
        )}

        {/* 附近发现的学校 */}
        {nearbySchools && nearbySchools.length > 0 && canteens.length === 0 && (
          <View style={styles.nearbySection}>
            <Text style={styles.sectionTitle}>附近发现</Text>
            {nearbySchools.map((s, i) => (
              <View key={i} style={styles.nearbySchoolItem}>
                <Text style={styles.nearbySchoolName}>{s.name}</Text>
                <Text style={styles.nearbySchoolDist}>
                  {s.distance > 0 ? `${s.distance}米` : "附近"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  // 头部
  header: {
    backgroundColor: "#4CAF50",
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFF",
    marginTop: 2,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  logoutBtnText: {
    color: "#FFF",
    fontSize: 13,
  },
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  locationText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    flex: 1,
  },
  relocateLink: {
    alignSelf: "flex-end",
    marginTop: 6,
  },
  relocateText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    textDecorationLine: "underline",
  },
  // 内容
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // 学校卡片
  schoolCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  schoolCardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  schoolCardInfo: {
    flex: 1,
  },
  schoolCardName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#333",
  },
  schoolCardDistance: {
    fontSize: 13,
    color: "#4CAF50",
    marginTop: 2,
  },
  campusHint: {
    fontSize: 13,
    color: "#4CAF50",
    marginTop: 2,
  },
  // 推荐标题
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  // 食堂卡片
  canteenCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  canteenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  canteenName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  ratingBadge: {
    backgroundColor: "#FFF8E1",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ratingText: {
    fontSize: 13,
    color: "#FF9800",
    fontWeight: "600",
  },
  canteenDesc: {
    fontSize: 13,
    color: "#999",
    marginTop: 6,
    lineHeight: 18,
  },
  // 空状态
  emptyCanteens: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyCanteensIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyCanteensText: {
    fontSize: 15,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
  },
  // 空状态 (无位置+未登录)
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
  },
  secondaryButtonText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "600",
  },
  // 附近学校
  nearbySection: {
    marginTop: 8,
  },
  nearbySchoolItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  nearbySchoolName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  nearbySchoolDist: {
    fontSize: 13,
    color: "#4CAF50",
  },
  bottomPadding: {
    height: 40,
  },
});

export default HomeScreen;
