import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BaseItemDto } from "../../Client";

const initialState: BaseItemDto | null = null;

export const addItemSlice = createSlice({
  name: "addItem",
  initialState,
  reducers: {
    setAddItem: (state, action: PayloadAction<BaseItemDto | null>) => action.payload
  }
});

export const { setAddItem } = addItemSlice.actions;
export default addItemSlice.reducer;
