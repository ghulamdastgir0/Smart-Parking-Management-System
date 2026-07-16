export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  managerId: string;
  rows: number;
  columns: number;
  createdAt: string;
  updatedAt: string;
  availableSlots: number;
  minHourlyRate: string | null;
}

export interface NearbyParkingLot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  drivingDistanceKm: number | null;
  etaMinutes: number | null;
  availableSlots: number;
  minHourlyRate: string | null;
}

export interface FindNearbyLotsParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

export interface CreateParkingLotPayload {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  managerId?: string;
  rows: number;
  columns: number;
  defaultSlotPrice: number;
}

export interface UpdateParkingLotPayload {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  managerId?: string;
}

export const MAX_ROWS = 200;
export const MAX_COLUMNS = 500;
export const MAX_TOTAL_SLOTS = 5000;
