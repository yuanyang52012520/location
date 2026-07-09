import { Router, Request, Response } from "express";
import { reverseGeocode } from "../services/amap";
import {
  findNearestSchool,
  findNearestCampusSchool,
  findNearestCampus,
  matchSchoolByName,
  getSchoolCanteens,
  getCampusCanteens,
  getAllSchools,
  type School,
} from "../services/schools";

const router: Router = Router();

/**
 * POST /api/location/geocode
 * 地理位置逆编码 + 匹配学校
 * Body: { lat: number, lng: number }
 */
router.post(
  "/geocode",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { lat, lng } = req.body;

      if (lat == null || lng == null) {
        res.status(400).json({ error: "缺少坐标参数" });
        return;
      }

      const amapKey = process.env.AMAP_API_KEY;
      if (!amapKey || amapKey === "你的高德APIKey") {
        console.log("[高德API] 未配置有效 Key，使用模拟数据");
        res.json({
          success: true,
          mock: true,
          location: { lat, lng },
          address: {
            formattedAddress: "模拟地址 - 未配置高德API",
            province: "",
            city: "",
            district: "",
          },
          nearbySchools: [],
          matchedSchool: null,
          canteens: [],
        });
        return;
      }

      // 1. 高德逆地理编码
      const regeo = await reverseGeocode(lng, lat, amapKey);
      console.log(
        `[逆地理] ${regeo.formattedAddress}, 发现 ${regeo.schools.length} 个学校 POI`
      );

      // 2. 尝试匹配学校（多重策略）
      let matchedSchool: School | null = null;
      let matchedCampus: { id: string; name: string; address: string | null } | null = null;
      let matchSource = "none";
      let distance = 0;

      // 2a. 先用坐标范围匹配学校
      matchedSchool = await findNearestSchool(lat, lng);
      if (matchedSchool) {
        matchSource = "coordinate";
        distance = Math.round(
          calculateDistance(lat, lng, matchedSchool.lat, matchedSchool.lng)
        );
      }

      // 2b. 用高德返回的学校名称匹配
      if (!matchedSchool && regeo.schools.length > 0) {
        for (const poi of regeo.schools) {
          matchedSchool = await matchSchoolByName(poi.name);
          if (matchedSchool) {
            matchSource = `name:${poi.name}`;
            distance = poi.distance;
            break;
          }
        }
      }

      // 2c. 兜底：用校区坐标匹配（解决多校区问题）
      if (!matchedSchool) {
        const campusMatch = await findNearestCampusSchool(lat, lng, 2000);
        if (campusMatch) {
          matchedSchool = campusMatch.school;
          matchedCampus = {
            id: campusMatch.campus.id,
            name: campusMatch.campus.name,
            address: campusMatch.campus.address,
          };
          matchSource = `campus:${campusMatch.campus.name}`;
          distance = campusMatch.distance;
        }
      }

      // 2d. 如果已匹配学校但没确定校区，尝试找最近校区
      if (matchedSchool && !matchedCampus) {
        const campusMatch = await findNearestCampus(lat, lng, matchedSchool.id, 2000);
        if (campusMatch) {
          matchedCampus = {
            id: campusMatch.campus.id,
            name: campusMatch.campus.name,
            address: campusMatch.campus.address,
          };
          matchSource += `+campus:${campusMatch.campus.name}`;
        }
      }

      // 3. 获取食堂列表（优先按校区查）
      let canteens: any[] = [];
      if (matchedSchool) {
        if (matchedCampus) {
          canteens = await getCampusCanteens(matchedCampus.id);
        } else {
          canteens = await getSchoolCanteens(matchedSchool.id);
        }
      }

      res.json({
        success: true,
        mock: false,
        location: { lat, lng },
        address: {
          formattedAddress: regeo.formattedAddress,
          province: regeo.province,
          city: regeo.city,
          district: regeo.district,
        },
        nearbySchools: regeo.schools.map((s) => ({
          name: s.name,
          address: s.address,
          distance: s.distance,
        })),
        matchedSchool: matchedSchool
          ? {
              id: matchedSchool.id,
              name: matchedSchool.name,
              address: matchedSchool.address,
              distance,
            }
          : null,
        matchedCampus,
        matchSource,
        canteens: canteens.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          image_url: c.image_url,
          rating: c.rating,
        })),
      });
    } catch (error: any) {
      console.error("[位置服务异常]", error);
      res.status(500).json({
        success: false,
        error: error.message || "位置服务异常",
      });
    }
  }
);

/**
 * GET /api/location/schools
 * 获取所有已注册学校列表
 */
router.get("/schools", async (_req: Request, res: Response) => {
  try {
    const schools = await getAllSchools();
    res.json({ success: true, schools });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/location/schools/:id/canteens
 * 获取指定学校的食堂列表
 */
router.get(
  "/schools/:id/canteens",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const canteens = await getSchoolCanteens(id);
      res.json({ success: true, canteens });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export default router;
