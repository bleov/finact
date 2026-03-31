import { configureStore } from "@reduxjs/toolkit";
import playbackReducer from "./slices/playbackSlice";
import queueReducer from "./slices/queueSlice";
import loadingReducer from "./slices/loadingSlice";
import addItemReducer from "./slices/addItemSlice";
import addItemTypeReducer from "./slices/addItemTypeSlice";
import lastCommandReducer from "./slices/lastCommandSlice";

export const store = configureStore({
  reducer: {
    playback: playbackReducer,
    queue: queueReducer,
    loading: loadingReducer,
    addItem: addItemReducer,
    addItemType: addItemTypeReducer,
    lastCommand: lastCommandReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
