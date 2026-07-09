import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const supabaseUrl = "https://zxugomsqlzoxdkkgjyar.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4dWdvbXNxbHpveGRra2dqeWFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4ODc0NTYsImV4cCI6MjA5NjQ2MzQ1Nn0.zppcZgQyk01cA-Z6fP_deHyfbLYackull4odJu7yB6M";

// Expo SecureStore 适配器
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // ignore
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 后端 API 地址 (开发环境)
const DEV_API_HOST = Platform.select({
  android: "10.0.2.2",
  ios: "localhost",
  default: "localhost",
});

export const API_BASE_URL = `http://${DEV_API_HOST}:3002/api`;
