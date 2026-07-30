export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  managerId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalSlots: number;
  availableSlots: number;
  minHourlyRate: string | null;
}

export interface ParkingFloor {
  id: string;
  lotId: string;
  name: string;
  floorNumber: number;
  rows: number;
  columns: number;
  totalSlots: number;
  availableSlots: number;
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
  totalSlots: number;
  availableSlots: number;
  minHourlyRate: string | null;
}

export interface FindNearbyLotsParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

export interface FloorInput {
  name: string;
  floorNumber: number;
  rows: number;
  columns: number;
  defaultSlotPrice: number;
}

export interface CreateParkingLotPayload {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  managerId?: string;
  floors: FloorInput[];
}

export interface UpdateParkingLotPayload {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  managerId?: string;
  isActive?: boolean;
}

export const MAX_ROWS = 200;
export const MAX_COLUMNS = 500;
export const MAX_TOTAL_SLOTS = 5000;
