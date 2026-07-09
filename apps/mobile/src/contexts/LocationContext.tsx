import React, { createContext, useContext, useState, useCallback } from "react";

// ============================================================
// 类型定义
// ============================================================

export interface LocationInfo {
  lat: number;
  lng: number;
}

export interface AddressInfo {
  formattedAddress: string;
  province: string;
  city: string;
  district: string;
}

export interface SchoolInfo {
  id: string;
  name: string;
  address: string | null;
  distance: number;
}

export interface CampusInfo {
  id: string;
  name: string;
  address: string | null;
}

export interface CanteenInfo {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  rating: number;
}

export type LocationStatus =
  | "pending" // 未请求权限
  | "loading" // 正在获取位置
  | "granted" // 已授权，位置获取成功
  | "denied" // 用户拒绝授权
  | "no_school"; // 已定位但未匹配到学校

interface LocationState {
  /** 定位状态 */
  status: LocationStatus;
  /** GPS 坐标 */
  location: LocationInfo | null;
  /** 地址信息 (高德返回) */
  address: AddressInfo | null;
  /** 匹配到的学校 */
  matchedSchool: SchoolInfo | null;
  /** 匹配到的校区 */
  matchedCampus: CampusInfo | null;
  /** 学校的食堂列表 */
  canteens: CanteenInfo[];
  /** 附近发现的学校 POI */
  nearbySchools: { name: string; distance: number }[];
  /** 设置定位状态和数据 */
  setLocationData: (data: {
    status: LocationStatus;
    location?: LocationInfo | null;
    address?: AddressInfo | null;
    matchedSchool?: SchoolInfo | null;
    matchedCampus?: CampusInfo | null;
    canteens?: CanteenInfo[];
    nearbySchools?: { name: string; distance: number }[];
  }) => void;
  /** 重置定位状态 */
  resetLocation: () => void;
}

const LocationContext = createContext<LocationState>({
  status: "pending",
  location: null,
  address: null,
  matchedSchool: null,
  matchedCampus: null,
  canteens: [],
  nearbySchools: [],
  setLocationData: () => {},
  resetLocation: () => {},
});

export const useLocation = () => useContext(LocationContext);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<LocationStatus>("pending");
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [address, setAddress] = useState<AddressInfo | null>(null);
  const [matchedSchool, setMatchedSchool] = useState<SchoolInfo | null>(null);
  const [matchedCampus, setMatchedCampus] = useState<CampusInfo | null>(null);
  const [canteens, setCanteens] = useState<CanteenInfo[]>([]);
  const [nearbySchools, setNearbySchools] = useState<
    { name: string; distance: number }[]
  >([]);

  const setLocationData = useCallback(
    (data: {
      status: LocationStatus;
      location?: LocationInfo | null;
      address?: AddressInfo | null;
      matchedSchool?: SchoolInfo | null;
      matchedCampus?: CampusInfo | null;
      canteens?: CanteenInfo[];
      nearbySchools?: { name: string; distance: number }[];
    }) => {
      setStatus(data.status);
      if (data.location !== undefined) setLocation(data.location);
      if (data.address !== undefined) setAddress(data.address);
      if (data.matchedSchool !== undefined) setMatchedSchool(data.matchedSchool);
      if (data.matchedCampus !== undefined) setMatchedCampus(data.matchedCampus);
      if (data.canteens !== undefined) setCanteens(data.canteens);
      if (data.nearbySchools !== undefined)
        setNearbySchools(data.nearbySchools);
    },
    []
  );

  const resetLocation = useCallback(() => {
    setStatus("pending");
    setLocation(null);
    setAddress(null);
    setMatchedSchool(null);
    setMatchedCampus(null);
    setCanteens([]);
    setNearbySchools([]);
  }, []);

  return (
    <LocationContext.Provider
      value={{
        status,
        location,
        address,
        matchedSchool,
        matchedCampus,
        canteens,
        nearbySchools,
        setLocationData,
        resetLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
