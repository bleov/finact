import { useEffect, useRef, useState } from "react";
import { Provider } from "react-redux";
import { HashRouter, Route, Routes } from "react-router";
import { Button, Container, Content, Loader, Notification, Text, useToaster } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import { BaseItemDto, UserDto } from "./Client";
import { client } from "./Client/client.gen";
import AddItem from "./Components/AddItem";
import MainHeader from "./Components/Header";
import PlayBar from "./Components/PlayBar";
import { SignIn } from "./Components/SignIn";
import Album from "./Routes/Albums/[id]";
import Collections from "./Routes/Collections";
import Collection from "./Routes/Collections/[id]";
import Home from "./Routes/Home";
import NotFound from "./Routes/NotFound";
import Playlists from "./Routes/Playlists";
import Playlist from "./Routes/Playlists/[id]";
import PlayState from "./Routes/PlayState";
import Search from "./Routes/Search";
import { getCacheStorage, getStorage } from "./storage";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { setLastCommand } from "./store/slices/lastCommandSlice";
import { setPlaybackState } from "./store/slices/playbackSlice";
import { Queue, setQueue } from "./store/slices/queueSlice";
import { store } from "./store/store";
import { getDeviceId } from "./Util/Formatting";
import { isElectron } from "./Util/Helpers";
import { upsertTrackItem, upsertTrackItems } from "./Util/ItemCache";

const storage = getStorage();
const cacheStorage = getCacheStorage();

client.setConfig({
  baseUrl: storage.get<string>("serverURL")
});

client.interceptors.request.use(async (request) => {
  const accessToken = storage.get<string>("AccessToken");

  request.headers.set(
    "Authorization",
    `MediaBrowser Client="Finact", Device="${isElectron ? window.electron!.platform || "Desktop" : "Web"}", DeviceId="${getDeviceId()}", Version="${__VERSION__}"${accessToken ? `, Token="${accessToken}"` : ""}`
  );

  return request;
});

export function getUser() {
  const serverURL = storage.get<string>("serverURL");
  const accessToken = storage.get<string>("AccessToken");
  const user = storage.get("User");
  if (serverURL && accessToken && user) {
    return user as UserDto;
  } else {
    return null;
  }
}

function AppContent() {
  const [user, setUser] = useState<UserDto | null>(getUser);
  const queueAndStateInitialized = useRef(false);

  const dispatch = useAppDispatch();
  const playbackState = useAppSelector((state) => state.playback);
  const queue = useAppSelector((state) => state.queue);
  const loading = useAppSelector((state) => state.loading);
  const addItem = useAppSelector((state) => state.addItem);
  const addItemType = useAppSelector((state) => state.addItemType);

  const toaster = useToaster();

  function normalizeQueue(savedQueue: unknown): Queue | null {
    if (!savedQueue || typeof savedQueue !== "object") {
      return null;
    }

    const value = savedQueue as {
      itemIds?: unknown;
      items?: Array<BaseItemDto | null | undefined>;
      index?: unknown;
    };

    const parsedIndex = typeof value.index === "number" ? value.index : 0;

    if (Array.isArray(value.itemIds)) {
      const itemIds = value.itemIds.filter((id): id is string => typeof id === "string" && id.length > 0);
      if (itemIds.length === 0) {
        return null;
      }

      return {
        itemIds,
        index: Math.min(Math.max(parsedIndex, 0), itemIds.length - 1)
      };
    }

    if (Array.isArray(value.items)) {
      void upsertTrackItems(value.items);
      const itemIds = value.items.map((item) => item?.Id).filter((id): id is string => Boolean(id));
      if (itemIds.length === 0) {
        return null;
      }

      return {
        itemIds,
        index: Math.min(Math.max(parsedIndex, 0), itemIds.length - 1)
      };
    }

    return null;
  }

  useEffect(() => {
    (async () => {
      if (user) {
        const savedState = storage.get<typeof playbackState>("playbackState");
        const savedQueue = storage.get<typeof queue>("queue");
        const savedPosition = storage.get<number>("position");
        let restoredState = false;
        let restoredQueue = false;
        if (savedState) {
          if (Object.hasOwn(savedState, "playing")) {
            savedState.playing = false;
          }
          if (savedPosition) {
            savedState.position = savedPosition / 1000;
          }
          dispatch(setPlaybackState(savedState));
          void upsertTrackItem(savedState.item);
          console.log("Restoring playback state");
          restoredState = true;
        }
        if (savedQueue) {
          const normalizedQueue = normalizeQueue(savedQueue);
          if (normalizedQueue) {
            dispatch(setQueue(normalizedQueue));
            console.log("Restoring queue");
            restoredQueue = true;
          }
        }
        queueAndStateInitialized.current = true;
        if (restoredState || restoredQueue) {
          toaster.push(
            <Notification closable type="info" header="Success">
              <Text>{`The ${restoredState ? "current track" : ""}${restoredState && restoredQueue ? " and " : ""}${restoredQueue ? "queue" : ""} ${restoredState && restoredQueue ? " were " : "was"} restored successfully.`}</Text>
              <Button
                marginTop={8}
                onClick={() => {
                  dispatch(setPlaybackState(null));
                  dispatch(setQueue(null));
                  toaster.clear();
                }}
              >
                Undo
              </Button>
            </Notification>,
            {
              duration: 4000
            }
          );
        }
      }
    })();

    if (isElectron) {
      // @ts-ignore
      window.electron!.onCommand(async (command) => {
        const data = JSON.parse(command);
        dispatch(setLastCommand({ ...data }));
      });
    }
  }, []);

  useEffect(() => {
    if (!queueAndStateInitialized.current) {
      return;
    }
    storage.set("playbackState", playbackState);
    storage.set("queue", queue);
  }, [playbackState, queue]);

  return (
    <Container height={"100%"}>
      <MainHeader user={user} />
      <Content>
        {!user ? (
          <SignIn setUser={setUser} />
        ) : (
          <>
            <AddItem item={addItem} type={addItemType!} />
            <HashRouter>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/queue" element={<PlayState />} />
                <Route path="/playlists" element={<Playlists />} />
                <Route path="/playlists/:id" element={<Playlist />} />
                <Route path="/collections" element={<Collections />} />
                <Route path="/collections/:id" element={<Collection />} />
                <Route path="/search" element={<Search />} />
                <Route path="/albums/:id" element={<Album />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
          </>
        )}
      </Content>
      {user && playbackState && Object.keys(playbackState).length > 0 && <PlayBar />}
      {loading && <Loader backdrop vertical size="lg" />}
    </Container>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
