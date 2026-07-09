import React, { useState, useRef, useEffect } from "react";
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

type Props = NativeStackScreenProps<RootStackParamList, "OTP">;

const OTPScreen: React.FC<Props> = ({ navigation, route }) => {
  const { phone } = route.params;
  const { signInWithBackend } = useAuth();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "").slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newOtp.join("");
    if (code.length === 6) {
      handleVerify(code);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code?: string) => {
    const verifyCode = code || otp.join("");
    if (verifyCode.length !== 6) {
      Alert.alert("提示", "请输入完整的6位验证码");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: verifyCode }),
      });
      const data = await response.json();

      if (data.success) {
        await signInWithBackend(data.user);
        // 首次注册且未设置密码 → 跳转到完善信息页
        if (data.isNewUser || !data.hasPassword) {
          navigation.navigate("CompleteProfile" as any, { phone });
        } else {
          navigation.replace("Home");
        }
      } else {
        Alert.alert("验证失败", data.error || "验证码错误");
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      Alert.alert("错误", "网络连接失败");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setCountdown(60);
    try {
      await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
    } catch {
      // ignore
    }
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
          <Text style={styles.title}>输入验证码</Text>
          <Text style={styles.subtitle}>
            已发送至 {phone.slice(0, 3)} **** {phone.slice(7)}
          </Text>
        </View>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                if (ref) inputRefs.current[index] = ref;
              }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(nativeEvent.key, index)
              }
              editable={!isLoading}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.verifyButton,
            (otp.join("").length !== 6 || isLoading) &&
              styles.verifyButtonDisabled,
          ]}
          onPress={() => handleVerify()}
          disabled={otp.join("").length !== 6 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.verifyButtonText}>确认登录</Text>
          )}
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>未收到验证码? </Text>
          <TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
            <Text
              style={[
                styles.resendLink,
                countdown > 0 && styles.resendLinkDisabled,
              ]}
            >
              {countdown > 0 ? `${countdown}s 后重发` : "重新发送"}
            </Text>
          </TouchableOpacity>
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
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#999",
    textAlign: "center",
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    gap: 8,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    backgroundColor: "#FAFAFA",
  },
  otpInputFilled: {
    borderColor: "#4CAF50",
    backgroundColor: "#E8F5E9",
  },
  verifyButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonDisabled: {
    backgroundColor: "#A5D6A7",
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  resendText: {
    fontSize: 14,
    color: "#999",
  },
  resendLink: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "600",
  },
  resendLinkDisabled: {
    color: "#BBB",
  },
});

export default OTPScreen;
