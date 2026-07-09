import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import locationRoutes from "./routes/location";

dotenv.config({ path: "../.env" });
dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 3002;

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "地理位置食堂推荐系统",
  });
});

// 路由
app.use("/api/auth", authRoutes);
app.use("/api/location", locationRoutes);

// 启动
app.listen(PORT, () => {
  console.log("========================================");
  console.log("  地理位置食堂推荐系统后端服务已启动");
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
  console.log("========================================");

  // 检查高德API配置
  const amapKey = process.env.AMAP_API_KEY;
  if (!amapKey || amapKey === "你的高德APIKey") {
    console.log("  [提示] 高德 API Key 未配置");
    console.log("  将使用模拟数据模式运行");
    console.log("========================================");
  }
});
