/**
 * 高德地图逆地理编码服务
 * 文档: https://lbs.amap.com/api/webservice/guide/api/georegeo
 */

const AMAP_BASE_URL = "https://restapi.amap.com/v3";

// 学校/大学关键词，用于匹配 POI
const SCHOOL_KEYWORDS = ["大学", "学院", "校区", "职业技术学院", "师范", "理工", "科技大"];

export interface RegeoResult {
  /** 格式化地址 */
  formattedAddress: string;
  /** 省份 */
  province: string;
  /** 城市 */
  city: string;
  /** 区/县 */
  district: string;
  /** 街道信息 */
  township: string;
  /** 街道编号 */
  townshipCode: string;
  /** 坐标 */
  location: string;
  /** 附近的学校 POI */
  schools: SchoolPOI[];
}

export interface SchoolPOI {
  id: string;
  name: string;
  type: string;
  address: string;
  location: string;
  distance: number;
}

export interface AmapPoi {
  id: string;
  name: string;
  type: string;
  typecode: string;
  address: string;
  location: string;
  distance: number;
  pname: string;
  cityname: string;
  adname: string;
}

/**
 * 高德逆地理编码 - 将坐标转为地址
 * @param lng 经度
 * @param lng 纬度
 * @param key 高德 API Key
 */
export async function reverseGeocode(
  lng: number,
  lat: number,
  key: string
): Promise<RegeoResult> {
  const location = `${lng},${lat}`;
  const url = `${AMAP_BASE_URL}/geocode/regeo?location=${location}&key=${key}&radius=1000&extensions=all`;

  const response = await fetch(url);
  const data: any = await response.json();

  if (data.status !== "1") {
    throw new Error(`高德逆地理编码失败: ${data.info}`);
  }

  const regeo = data.regeocode;
  const addressComponent = regeo.addressComponent;

  // 过滤出学校相关的 POI
  const allPois: AmapPoi[] = regeo.pois || [];
  const schools = allPois
    .filter((poi) => isSchoolPOI(poi))
    .map((poi) => ({
      id: poi.id,
      name: poi.name,
      type: poi.type,
      address: poi.address,
      location: poi.location,
      distance: poi.distance || 9999,
    }))
    .sort((a, b) => a.distance - b.distance);

  return {
    formattedAddress: regeo.formatted_address,
    province: addressComponent.province,
    city: addressComponent.city?.[0] || addressComponent.province,
    district: addressComponent.district?.[0] || "",
    township: addressComponent.township?.[0] || "",
    townshipCode: addressComponent.towncode || "",
    location,
    schools,
  };
}

/**
 * 判断 POI 是否为学校/大学
 */
function isSchoolPOI(poi: AmapPoi): boolean {
  // 高德 POI 类型码: 141201 = 高等院校, 141202 = 中学, 141203 = 小学
  // 我们主要关注高等院校
  if (poi.typecode?.startsWith("141201")) {
    return true;
  }

  // 再按名称关键词匹配
  const name = poi.name || "";
  return SCHOOL_KEYWORDS.some((kw) => name.includes(kw));
}
