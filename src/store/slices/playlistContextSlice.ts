import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { BaseItemDto } from "../../Client";

export interface PlaylistContext {
  items: BaseItemDto[];
  type: "album" | "playlist" | "search" | "standalone" | "queue";
}

const initialState: PlaylistContext | null = null;

const playlistContextSlice = createSlice({
  name: "playlistContext",
  initialState,
  reducers: {
    setPlaylistContext: (_, action: PayloadAction<PlaylistContext>) => {
      return action.payload;
    },
    clearPlaylistContext: () => {
      return null;
    }
  }
});

export const { setPlaylistContext, clearPlaylistContext } = playlistContextSlice.actions;
export default playlistContextSlice.reducer;
