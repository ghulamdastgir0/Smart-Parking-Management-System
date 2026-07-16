import { configureStore } from "@reduxjs/toolkit";
import filtersReducer from "./slices/filters-slice";
import uiReducer from "./slices/ui-slice";

export function makeStore() {
  return configureStore({
    reducer: {
      ui: uiReducer,
      filters: filtersReducer,
    },
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
