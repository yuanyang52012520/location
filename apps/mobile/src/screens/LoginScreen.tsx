import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { API_BASE_URL } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;
type LoginMode = "otp" | "password";

/**
 * 登录/注册页 - 支持验证码登录和密码登录
 */
const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { signInWithBackend } = useAuth();
  const [loginMode, setLoginMode] = useState<LoginMode>("otp");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const pwdRef = useRef<TextInput>(null);

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7)
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7, 11)}`;
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 11);
    setPhone(formatPhone(cleaned));
  };

  const getRawPhone = () => phone.replace(/\s/g, "");

  const isPhoneValid = getRawPhone().length === 11 && /^1[3-9]\d{9}$/.test(getRawPhone());

  /** 获取验证码 */
  const handleSendOTP = async () => {
    if (!isPhoneValid) {
      Alert.alert("提示", "请输入正确的11位手机号");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: getRawPhone() }),
      });
      const data = await response.json();

      if (data.success) {
        navigation.navigate("OTP", { phone: getRawPhone() });
        if (data.devCode) {
          Alert.alert("验证码已发送", `[开发模式] 验证码: ${data.devCode}`);
        }
      } else {
        Alert.alert("发送失败", data.error || "请稍后重试");
      }
    } catch {
      Alert.alert("错误", "网络连接失败，请检查后端服务是否启动");
    } finally {
      setIsLoading(false);
    }
  };

  /** 密码登录 */
  const handlePasswordLogin = async () => {
    if (!isPhoneValid) {
      Alert.alert("提示", "请输入正确的11位手机号");
      return;
    }
    if (!password) {
      Alert.alert("提示", "请输入密码");
      pwdRef.current?.focus();
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: getRawPhone(), password }),
      });
      const data = await response.json();

      if (data.success) {
        await signInWithBackend(data.user);
        navigation.replace("Home");
      } else {
        Alert.alert("登录失败", data.error || "手机号或密码错误");
      }
    } catch {
      Alert.alert("错误", "网络连接失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.replace("Home");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← 返回</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>🍽️</Text>
          </View>
          <Text style={styles.title}>登录</Text>
          <Text style={styles.subtitle}>
            {loginMode === "otp" ? "验证码登录，未注册将自动创建" : "使用密码快速登录"}
          </Text>
        </View>

        {/* 登录方式切换 */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, loginMode === "otp" && styles.tabActive]}
            onPress={() => setLoginMode("otp")}
          >
            <Text style={[styles.tabText, loginMode === "otp" && styles.tabTextActive]}>
              验证码登录
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, loginMode === "password" && styles.tabActive]}
            onPress={() => setLoginMode("password")}
          >
            <Text style={[styles.tabText, loginMode === "password" && styles.tabTextActive]}>
              密码登录
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>手机号</Text>
          <View style={styles.phoneInputContainer}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+86</Text>
            </View>
            <TextInput
              ref={inputRef}
              style={styles.phoneInput}
              placeholder="请输入手机号"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              maxLength={13}
              value={phone}
              onChangeText={handlePhoneChange}
              editable={!isLoading}
            />
          </View>

          {/* 密码输入框（仅密码模式） */}
          {loginMode === "password" && (
            <>
              <Text style={styles.label}>密码</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  ref={pwdRef}
                  style={styles.passwordInput}
                  placeholder="请输入密码"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  maxLength={32}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handlePasswordLogin}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeText}>{showPassword ? "隐藏" : "显示"}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!isPhoneValid || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={loginMode === "otp" ? handleSendOTP : handlePasswordLogin}
            disabled={!isPhoneValid || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.sendButtonText}>
                {loginMode === "otp" ? "获取验证码" : "登录"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>先逛逛，不登录</Text>
          </TouchableOpacity>
          <Text style={styles.footerText}>未注册手机号将自动创建账号</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  /** 登录方式切换标签 */
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 3,
    marginBottom: 28,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  tabTextActive: {
    color: "#4CAF50",
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  countryCode: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: "#E8E8E8",
    backgroundColor: "#FAFAFA",
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  phoneInput: {
    flex: 1,
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#333",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    fontSize: 17,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: "#333",
  },
  eyeButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  eyeText: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
  },
  sendButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: "#A5D6A7",
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    gap: 12,
  },
  skipText: {
    fontSize: 15,
    color: "#4CAF50",
    fontWeight: "500",
  },
  footerText: {
    fontSize: 13,
    color: "#BBB",
  },
});

export default LoginScreen;
