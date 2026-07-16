import { createSlice } from "@reduxjs/toolkit";

interface UiState {
  mobileDrawerOpen: boolean;
}

const initialState: UiState = {
  mobileDrawerOpen: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    drawerOpened: (state) => {
      state.mobileDrawerOpen = true;
    },
    drawerClosed: (state) => {
      state.mobileDrawerOpen = false;
    },
  },
});

export const { drawerOpened, drawerClosed } = uiSlice.actions;
export default uiSlice.reducer;
