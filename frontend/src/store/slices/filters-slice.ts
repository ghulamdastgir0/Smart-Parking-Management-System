import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ParkingLotsSortKey = "name" | "price" | "availability";

interface FiltersState {
  parkingLots: {
    search: string;
    sort: ParkingLotsSortKey;
    page: number;
  };
  adminParkingLots: {
    search: string;
  };
  adminReservations: {
    lotId: string;
    search: string;
    statusFilter: string;
  };
  myReservations: {
    tab: "active" | "history";
    search: string;
    statusFilter: string;
  };
}

const initialState: FiltersState = {
  parkingLots: { search: "", sort: "name", page: 1 },
  adminParkingLots: { search: "" },
  adminReservations: { lotId: "", search: "", statusFilter: "all" },
  myReservations: { tab: "active", search: "", statusFilter: "all" },
};

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    parkingLotsSearchChanged: (state, action: PayloadAction<string>) => {
      state.parkingLots.search = action.payload;
      state.parkingLots.page = 1;
    },
    parkingLotsSortChanged: (state, action: PayloadAction<ParkingLotsSortKey>) => {
      state.parkingLots.sort = action.payload;
    },
    parkingLotsPageChanged: (state, action: PayloadAction<number>) => {
      state.parkingLots.page = action.payload;
    },

    adminParkingLotsSearchChanged: (state, action: PayloadAction<string>) => {
      state.adminParkingLots.search = action.payload;
    },

    adminReservationsLotChanged: (state, action: PayloadAction<string>) => {
      state.adminReservations.lotId = action.payload;
    },
    adminReservationsSearchChanged: (state, action: PayloadAction<string>) => {
      state.adminReservations.search = action.payload;
    },
    adminReservationsStatusChanged: (state, action: PayloadAction<string>) => {
      state.adminReservations.statusFilter = action.payload;
    },

    myReservationsTabChanged: (state, action: PayloadAction<"active" | "history">) => {
      state.myReservations.tab = action.payload;
      state.myReservations.statusFilter = "all";
    },
    myReservationsSearchChanged: (state, action: PayloadAction<string>) => {
      state.myReservations.search = action.payload;
    },
    myReservationsStatusChanged: (state, action: PayloadAction<string>) => {
      state.myReservations.statusFilter = action.payload;
    },
  },
});

export const {
  parkingLotsSearchChanged,
  parkingLotsSortChanged,
  parkingLotsPageChanged,
  adminParkingLotsSearchChanged,
  adminReservationsLotChanged,
  adminReservationsSearchChanged,
  adminReservationsStatusChanged,
  myReservationsTabChanged,
  myReservationsSearchChanged,
  myReservationsStatusChanged,
} = filtersSlice.actions;
export default filtersSlice.reducer;
