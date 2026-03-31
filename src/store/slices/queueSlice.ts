import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BaseItemDto } from "../../Client";

export interface Queue {
  items: BaseItemDto[];
  index: number;
}

const initialState: Queue | null = null;

export const queueSlice = createSlice({
  name: "queue",
  initialState,
  reducers: {
    setQueue: (state, action: PayloadAction<Queue | null>) => action.payload
  }
});

export const { setQueue } = queueSlice.actions;
export default queueSlice.reducer;
