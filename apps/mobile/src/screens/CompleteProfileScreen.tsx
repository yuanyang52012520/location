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
  ScrollView,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { API_BASE_URL } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "CompleteProfile">;

/**
 * 首次注册后 - 设置个人信息和登录密码
 */
const CompleteProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phone } = route.params;
  const { signInWithBackend } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const nameRef = useRef<TextInput>(null);
  const pwdRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    // 校验昵称
    const name = displayName.trim();
    if (!name) {
      Alert.alert("提示", "请输入昵称");
      nameRef.current?.focus();
      return;
    }

    // 校验密码
    if (password.length < 6) {
      Alert.alert("提示", "密码长度至少6位");
      pwdRef.current?.focus();
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("提示", "两次输入的密码不一致");
      confirmRef.current?.focus();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          password,
          display_name: name,
        }),
      });
      const data = await response.json();

      if (data.success) {
        await signInWithBackend(data.user);
        Alert.alert("成功", "个人信息设置完毕", [
          { text: "进入首页", onPress: () => navigation.replace("Home") },
        ]);
      } else {
        Alert.alert("设置失败", data.error || "请稍后重试");
      }
    } catch {
      Alert.alert("错误", "网络连接失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert("跳过设置", "您可以在个人中心中稍后设置密码和昵称", [
      { text: "取消", style: "cancel" },
      { text: "跳过", onPress: () => navigation.replace("Home") },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>✏️</Text>
          </View>
          <Text style={styles.title}>完善信息</Text>
          <Text style={styles.subtitle}>设置昵称和密码，方便下次登录</Text>
        </View>

        <View style={styles.form}>
          {/* 手机号（只读） */}
          <Text style={styles.label}>手机号</Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyText}>
              {phone.slice(0, 3)} **** {phone.slice(7)}
            </Text>
          </View>

          {/* 昵称 */}
          <Text style={styles.label}>昵称</Text>
          <TextInput
            ref={nameRef}
            style={styles.input}
            placeholder="给自己起个名字吧"
            placeholderTextColor="#BBB"
            maxLength={20}
            value={displayName}
            onChangeText={setDisplayName}
            editable={!isLoading}
            returnKeyType="next"
            onSubmitEditing={() => pwdRef.current?.focus()}
          />

          {/* 登录密码 */}
          <Text style={styles.label}>设置密码</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              ref={pwdRef}
              style={styles.passwordInput}
              placeholder="至少6位密码"
              placeholderTextColor="#BBB"
              secureTextEntry={!showPassword}
              maxLength={32}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeText}>{showPassword ? "隐藏" : "显示"}</Text>
            </TouchableOpacity>
          </View>

          {/* 确认密码 */}
          <Text style={styles.label}>确认密码</Text>
          <TextInput
            ref={confirmRef}
            style={styles.input}
            placeholder="再次输入密码"
            placeholderTextColor="#BBB"
            secureTextEntry={!showPassword}
            maxLength={32}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            editable={!isLoading}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {/* 提交按钮 */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isLoading || !displayName.trim() || password.length < 6) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isLoading || !displayName.trim() || password.length < 6}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>完成设置</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipContainer}>
          <Text style={styles.skipText}>跳过，稍后设置</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 16,
  },
  readonlyField: {
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F5F5F5",
  },
  readonlyText: {
    fontSize: 16,
    color: "#999",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#333",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E8E8E8",
    borderRadius: 12,
    overflow: "hidden",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
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
  submitButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#A5D6A7",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  skipContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
    color: "#4CAF50",
    fontWeight: "500",
  },
});

export default CompleteProfileScreen;
