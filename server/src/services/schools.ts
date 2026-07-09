/**
 * 学校数据服务 - 对接 Supabase schools & canteens 表
 */
import { supabase } from "../lib/supabase";

export interface School {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  radius_meters: number;
  created_at: string;
}

export interface Campus {
  id: string;
  school_id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
}

export interface Canteen {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rating: number;
  created_at: string;
}

/**
 * 根据坐标查找最近的已注册学校
 */
export async function findNearestSchool(
  lat: number,
  lng: number
): Promise<School | null> {
  try {
    const { data: schools, error } = await supabase
      .from("schools")
      .select("*");

    if (error || !schools || schools.length === 0) {
      console.log("[学校查询] Supabase 无数据或查询失败", error?.message);
      return null;
    }

    let nearest: School | null = null;
    let minDistance = Infinity;

    for (const school of schools) {
      const dist = calculateDistance(lat, lng, school.lat, school.lng);
      if (dist < minDistance && dist <= (school.radius_meters || 500)) {
        minDistance = dist;
        nearest = school;
      }
    }

    return nearest;
  } catch (error) {
    console.error("[学校查询异常]", error);
    return null;
  }
}

/**
 * 根据坐标查找最近的校区，返回所属学校
 */
export async function findNearestCampusSchool(
  lat: number,
  lng: number,
  radiusMeters: number = 1000
): Promise<{ school: School; campus: Campus; distance: number } | null> {
  try {
    const { data: campuses, error } = await supabase
      .from("campuses")
      .select("*, schools(*)");

    if (error || !campuses || campuses.length === 0) {
      console.log("[校区查询] Supabase 无数据或查询失败", error?.message);
      return null;
    }

    let nearest: any = null;
    let minDistance = Infinity;

    for (const campus of campuses) {
      if (campus.latitude == null || campus.longitude == null) continue;
      const dist = calculateDistance(
        lat,
        lng,
        Number(campus.latitude),
        Number(campus.longitude)
      );
      if (dist < minDistance && dist <= radiusMeters) {
        minDistance = dist;
        nearest = campus;
      }
    }

    if (!nearest) return null;

    const school = nearest.schools;
    if (!school) return null;

    return {
      school,
      campus: {
        id: nearest.id,
        school_id: nearest.school_id,
        name: nearest.name,
        address: nearest.address,
        lat: Number(nearest.latitude),
        lng: Number(nearest.longitude),
      },
      distance: Math.round(minDistance),
    };
  } catch (error) {
    console.error("[校区查询异常]", error);
    return null;
  }
}

/**
 * 根据高德返回的学校名称，在 Supabase 中查找匹配
 * 支持部分匹配、括号格式归一化
 */
export async function matchSchoolByName(
  schoolName: string
): Promise<School | null> {
  try {
    const { data: schools, error } = await supabase
      .from("schools")
      .select("*");

    if (error || !schools || schools.length === 0) {
      return null;
    }

    const normalizedInput = normalizeSchoolName(schoolName);

    // 优先找数据库校名包含在高德返回中的
    for (const school of schools) {
      const normalizedDb = normalizeSchoolName(school.name);
      if (
        normalizedInput.includes(normalizedDb) ||
        normalizedDb.includes(normalizedInput)
      ) {
        return school;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 学校名称归一化：统一括号、去空格、去校区后缀
 */
function normalizeSchoolName(name: string): string {
  return name
    .replace(/[（(]/g, "")
    .replace(/[）)]/g, "")
    .replace(/\s+/g, "")
    .replace(/校区.*$/, "");
}

/**
 * 查找某个学校内离用户最近的校区
 */
export async function findNearestCampus(
  lat: number,
  lng: number,
  schoolId: string,
  radiusMeters: number = 2000
): Promise<{ campus: Campus; distance: number } | null> {
  try {
    const { data: campuses, error } = await supabase
      .from("campuses")
      .select("*")
      .eq("school_id", schoolId);

    if (error || !campuses || campuses.length === 0) return null;

    let nearest: any = null;
    let minDistance = Infinity;

    for (const campus of campuses) {
      if (campus.latitude == null || campus.longitude == null) continue;
      const dist = calculateDistance(
        lat,
        lng,
        Number(campus.latitude),
        Number(campus.longitude)
      );
      if (dist < minDistance && dist <= radiusMeters) {
        minDistance = dist;
        nearest = campus;
      }
    }

    if (!nearest) return null;

    return {
      campus: {
        id: nearest.id,
        school_id: nearest.school_id,
        name: nearest.name,
        address: nearest.address,
        lat: Number(nearest.latitude),
        lng: Number(nearest.longitude),
      },
      distance: Math.round(minDistance),
    };
  } catch (error) {
    console.error("[查找最近校区异常]", error);
    return null;
  }
}

/**
 * 获取指定校区的食堂列表（只查一个校区的食堂）
 */
export async function getCampusCanteens(
  campusId: string
): Promise<Canteen[]> {
  try {
    const { data, error } = await supabase
      .from("canteens")
      .select("*")
      .eq("campus_id", campusId)
      .order("rating", { ascending: false });

    if (error) {
      console.error("[获取校区食堂列表失败]", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[获取校区食堂列表异常]", error);
    return [];
  }
}

/**
 * 获取学校的食堂列表
 * 使用 schools → campuses → canteens 层级关系
 */
export async function getSchoolCanteens(
  schoolId: string
): Promise<Canteen[]> {
  try {
    const { data: campuses, error: campusError } = await supabase
      .from("campuses")
      .select("id")
      .eq("school_id", schoolId);

    if (campusError || !campuses || campuses.length === 0) {
      console.log("[获取校区列表失败]", campusError?.message);
      return [];
    }

    const campusIds = campuses.map((c) => c.id);

    const { data, error } = await supabase
      .from("canteens")
      .select("*")
      .in("campus_id", campusIds)
      .order("name", { ascending: true });

    if (error) {
      console.error("[获取食堂列表失败]", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[获取食堂列表异常]", error);
    return [];
  }
}

/**
 * 获取所有学校列表
 */
export async function getAllSchools(): Promise<School[]> {
  try {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("[获取学校列表失败]", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("[获取学校列表异常]", error);
    return [];
  }
}

/**
 * 经纬度距离计算 (Haversine公式, 单位: 米)
 */
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
