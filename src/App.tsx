import { useState, createContext, useEffect, useRef } from "react";
import { Container, Content, Loader, useToaster, Notification, Button, Text } from "rsuite";
import "rsuite/dist/rsuite.min.css";
import { SignIn } from "./Components/SignIn";
import MainHeader from "./Components/Header";
import { HashRouter, Route, Routes } from "react-router";
import Home from "./Routes/Home";
import Playlists from "./Routes/Playlists";
import Collections from "./Routes/Collections";
import PlayBar from "./Components/PlayBar";
import Collection from "./Routes/Collections/[id]";
import NotFound from "./Routes/NotFound";
import Playlist from "./Routes/Playlists/[id]";
import Album from "./Routes/Albums/[id]";
import Search from "./Routes/Search";
import AddItem from "./Components/AddItem";
import Queue from "./Routes/Queue";
import { isElectron, playItem } from "./Util/Helpers";
import { client } from "./Client/client.gen";
import { BaseItemDto, UserDto } from "./Client";
import { ToastContainerProps } from "rsuite/esm/toaster/ToastContainer";
import { getDeviceId } from "./Util/Formatting";
import { getStorage, getCacheStorage } from "./storage";

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

export interface Queue {
  items: BaseItemDto[];
  index: number;
}

export interface LastCommand {
  type: "play-item" | "pause" | "resume" | "stop" | "next" | "previous" | "set-volume" | "seek" | "set-repeat";
  itemId?: string;
  volume?: number;
  position?: number;
  mode?: "none" | "one" | "all";
}

export interface PlaybackState {
  item?: BaseItemDto;
  position?: number;
  playing?: boolean;
}

export const GlobalState = createContext<{
  playbackState: PlaybackState | null;
  setPlaybackState: React.Dispatch<React.SetStateAction<PlaybackState | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  toaster: {
    push: (message: React.ReactNode, options?: ToastContainerProps) => string | Promise<string | undefined> | undefined;
    remove: (key: string) => void;
    clear: () => void;
  };
  addItem: BaseItemDto | null;
  setAddItem: React.Dispatch<React.SetStateAction<BaseItemDto | null>>;
  addItemType: string | null;
  setAddItemType: React.Dispatch<React.SetStateAction<string | null>>;
  queue: Queue | null;
  setQueue: React.Dispatch<React.SetStateAction<Queue | null>>;
  lastCommand: LastCommand | null;
  setLastCommand: React.Dispatch<React.SetStateAction<LastCommand | null>>;
}>(null!);

function App() {
  const [user, setUser] = useState<UserDto | null>(getUser);
  const [playbackState, setPlaybackState] = useState<PlaybackState | null>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [loading, setLoading] = useState(false);
  const [addItem, setAddItem] = useState<BaseItemDto | null>(null);
  const [addItemType, setAddItemType] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<LastCommand | null>(null);
  const queueAndStateInitialized = useRef(false);

  const toaster = useToaster();

  const globalState = {
    playbackState,
    setPlaybackState,
    loading,
    setLoading,
    toaster,
    addItem,
    setAddItem,
    addItemType,
    setAddItemType,
    queue,
    setQueue,
    lastCommand,
    setLastCommand
  };

  useEffect(() => {
    (async () => {
      if (user) {
        const savedState = storage.get<PlaybackState>("playbackState");
        const savedQueue = storage.get<Queue>("queue");
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
          setPlaybackState(savedState);
          console.log("Restoring playback state");
          restoredState = true;
        }
        if (savedQueue) {
          setQueue(savedQueue);
          console.log("Restoring queue");
          restoredQueue = true;
        }
        queueAndStateInitialized.current = true;
        if (restoredState || restoredQueue) {
          toaster.push(
            <Notification closable type="info" header="Success">
              <Text>{`The ${restoredState ? "current track" : ""}${restoredState && restoredQueue ? " and " : ""}${restoredQueue ? "queue" : ""} ${restoredState && restoredQueue ? " were " : "was"} restored successfully.`}</Text>
              <Button
                style={{ marginTop: 8 }}
                onClick={() => {
                  setPlaybackState(null);
                  setQueue(null);
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
        setLastCommand({ ...data, timestamp: Date.now() });
      });
    }
  }, []);

  useEffect(() => {
    // @ts-ignore
    window.debug = { ...globalState, storage, cacheStorage };
  }, [...Object.values(globalState)]);

  useEffect(() => {
    if (!queueAndStateInitialized.current) {
      return;
    }
    console.log(playbackState);
    storage.set("playbackState", playbackState);
    storage.set("queue", queue);
  }, [playbackState, queue]);

  return (
    <>
      <GlobalState.Provider value={globalState}>
        <Container style={{ height: "100%" }}>
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
                    <Route path="/queue" element={<Queue />} />
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
          {user && playbackState && <PlayBar state={playbackState} />}
          {loading && <Loader backdrop vertical size="lg" />}
        </Container>
      </GlobalState.Provider>
    </>
  );
}

export default App;
