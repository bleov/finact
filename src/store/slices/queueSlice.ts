import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Queue {
  itemIds: string[];
  index: number;
}

const initialState: Queue | null = null;

export const queueSlice = createSlice<Queue | null>({
  name: "queue",
  initialState,
  reducers: {
    setQueue: (state, action: PayloadAction<Queue | null>) => action.payload
  }
});

export const { setQueue } = queueSlice.actions;
export default queueSlice.reducer;
