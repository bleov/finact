import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface LastCommand {
  type: "play-item" | "pause" | "resume" | "stop" | "next" | "previous" | "set-volume" | "seek" | "set-repeat";
  itemId?: string;
  volume?: number;
  position?: number;
  mode?: "none" | "one" | "all";
}

const initialState: LastCommand | null = null;

export const lastCommandSlice = createSlice({
  name: "lastCommand",
  initialState,
  reducers: {
    setLastCommand: (state, action: PayloadAction<LastCommand | null>) => action.payload
  }
});

export const { setLastCommand } = lastCommandSlice.actions;
export default lastCommandSlice.reducer;
