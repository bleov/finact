import { createSlice, PayloadAction } from "@reduxjs/toolkit";

const initialState: string | null = null;

export const addItemTypeSlice = createSlice({
  name: "addItemType",
  initialState,
  reducers: {
    setAddItemType: (state, action: PayloadAction<string | null>) => action.payload
  }
});

export const { setAddItemType } = addItemTypeSlice.actions;
export default addItemTypeSlice.reducer;
