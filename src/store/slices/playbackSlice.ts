import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BaseItemDto } from "../../Client";

export interface PlaybackState {
  item?: BaseItemDto;
  position?: number;
  playing?: boolean;
}

const initialState: PlaybackState = {};

export const playbackSlice = createSlice({
  name: "playback",
  initialState,
  reducers: {
    setPlaybackState: (state, action: PayloadAction<PlaybackState | null>) => {
      return action.payload || {};
    }
  }
});

export const { setPlaybackState } = playbackSlice.actions;
export default playbackSlice.reducer;
