import { Avatar, Button, ButtonGroup, HStack, VStack, Navbar, Text, Footer, Whisper, Popover, Slider, Row, Col } from "rsuite";
import { getStorage } from "../storage";
import { useEffect, useRef, useState } from "react";
import { getUser } from "../App";
import { formatTimestamp, getAlbumArt, getPWADisplayMode } from "../Util/Formatting";
import Icon from "./Icon";
import ItemContextMenu from "./ItemContextMenu";
import Visualizer, { isButterchurnSupported } from "./Visualizer";
import { Scrubber } from "react-scrubber";
import "react-scrubber/lib/scrubber.css";
const storage = getStorage();
import Lyrics from "./Lyrics";
import { isElectron, playItem } from "../Util/Helpers";
import localforage from "localforage";
import { getItem, getItems, reportPlaybackProgress, reportPlaybackStart, reportPlaybackStopped } from "../Client";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setPlaybackState } from "../store/slices/playbackSlice";
import { setQueue } from "../store/slices/queueSlice";
import { getCachedTrackItem, upsertTrackItem } from "../Util/ItemCache";

interface ExtendedAudioElement extends HTMLAudioElement {
  sourceNode?: MediaElementAudioSourceNode;
}

export default function PlayBar() {
  const audioRef = useRef<ExtendedAudioElement | null>(null);
  const dispatch = useAppDispatch();
  const playbackState = useAppSelector((state) => state.playback);
  const queue = useAppSelector((state) => state.queue);
  const lastCommand = useAppSelector((state) => state.lastCommand);
  const [visualizerOpen, setVisualizerOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(75);
  const [repeat, setRepeat] = useState("none");
  const isScrubbing = useRef(false);
  const restoredVolume = useRef(false);
  const isPlayingRef = useRef(false);

  let visualizerSupported = useRef(false);

  if (visualizerSupported.current == false && isButterchurnSupported()) {
    visualizerSupported.current = true;
  }

  function getArtistDisplay(artists: string[] | null | undefined) {
    if (!artists || artists.length === 0) return "Unknown Artist";

    const artistNames = artists.join(" / ");
    return artistNames.length > 29 ? `${artistNames.slice(0, 29)}...` : artistNames;
  }

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    (async () => {
      const savedRepeat = await localforage.getItem<"none" | "all" | "one" | null>("repeat");
      const savedVolume = await localforage.getItem<number | string>("volume");

      if (savedRepeat && ["none", "all", "one"].includes(savedRepeat)) {
        setRepeat(savedRepeat);
      }
      if (savedVolume && typeof savedVolume === "number" && savedVolume >= 0 && savedVolume <= 100) {
        setVolume(savedVolume);
      }
      restoredVolume.current = true;
    })();

    if (!audioContextRef.current) {
      // @ts-expect-error
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audio = audioRef.current;
    if (audio && !audio.sourceNode) {
      const source = audioContextRef.current.createMediaElementSource(audio);
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 1;
      source.connect(gainNode);
      gainNodeRef.current = gainNode;
      gainNode.connect(audioContextRef.current.destination);
      source.connect(audioContextRef.current.destination);
      audio.sourceNode = source; // avoid multiple connections
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    void upsertTrackItem(playbackState?.item);

    if (audioRef.current) {
      if (playbackState?.item && playbackState.item.NormalizationGain && gainNodeRef.current) {
        gainNodeRef.current.gain.value = Math.pow(10, playbackState.item.NormalizationGain / 20);
      } else {
        if (gainNodeRef.current) gainNodeRef.current.gain.value = 1;
      }
      if (playbackState?.playing) {
        if (!playbackState.item) return;
        audioRef.current.play();
        if (playbackState.position == 0) {
          setPosition(playbackState.position);

          try {
            if (import.meta.env.VITE_ENABLE_PLAYBACK_REPORTING !== "false")
              reportPlaybackStart({
                body: {
                  CanSeek: false,
                  ItemId: playbackState.item.Id,
                  IsPaused: false,
                  IsMuted: false,
                  PositionTicks: 0,
                  VolumeLevel: volume
                }
              });
          } catch (err) {}
        }
      } else {
        audioRef.current.pause();
      }
      if (playbackState?.position && playbackState.position > 0) audioRef.current.currentTime = playbackState.position;
    }

    if ("mediaSession" in navigator) {
      const mediaSession = navigator.mediaSession;
      if (!playbackState?.item) return;

      mediaSession.metadata = new MediaMetadata({
        title: playbackState.item.Name!,
        artist: playbackState.item.Artists!.join(" / "),
        album: playbackState.item.Album!,
        artwork: [
          {
            src: getAlbumArt(playbackState.item),
            sizes: "512x512",
            type: "image/jpeg"
          }
        ]
      });

      mediaSession.setActionHandler("play", play);
      mediaSession.setActionHandler("pause", pause);

      mediaSession.setActionHandler("previoustrack", previous);
      mediaSession.setActionHandler("nexttrack", next);

      mediaSession.setActionHandler("seekto", (details) => {
        if (details.fastSeek && "fastSeek" in audioRef.current!) {
          audioRef.current!.fastSeek(details.seekTime!);
          return;
        }
        audioRef.current!.currentTime = details.seekTime!;
      });

      if (getPWADisplayMode() == "browser" && !isElectron) {
        document.title = `${playbackState.item.Name} - ${getArtistDisplay(playbackState.item.Artists)} - Finact`;
      } else {
        document.title = "Finact";
      }
    }

    if (isElectron) {
      window.electron!.sendMessage(
        JSON.stringify({
          type: "playback-state-changed",
          state: playbackState,
          queue
        })
      );
    }

    isPlayingRef.current = playbackState?.playing!;
  }, [playbackState]);

  if (isElectron) {
    useEffect(() => {
      window.electron!.sendMessage(
        JSON.stringify({
          type: "playback-state-changed",
          state: playbackState,
          queue
        })
      );
    }, [queue]);
  }

  function handleTimeUpdate(e: number) {
    const newTime = e / 1000;
    dispatch(
      setPlaybackState({
        ...playbackState,
        position: newTime
      })
    );
    setPosition(e);
    if (!playbackState?.item) return;

    try {
      if (import.meta.env.VITE_ENABLE_PLAYBACK_REPORTING !== "false")
        reportPlaybackProgress({
          body: {
            CanSeek: false,
            ItemId: playbackState?.item?.Id,
            IsPaused: !playbackState?.playing,
            IsMuted: false,
            PositionTicks: Math.floor(e * 10000),
            VolumeLevel: volume
          }
        });
    } catch (err) {}
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRef.current && !isScrubbing.current) {
        setPosition(audioRef.current.currentTime * 1000);
        if (isElectron) {
          if (!isPlayingRef.current) return;
          window.electron!.sendMessage(
            JSON.stringify({
              type: "playback-progress",
              position: audioRef.current.currentTime
            })
          );
        }
        localforage.setItem("position", audioRef.current.currentTime * 1000);
      }
    }, 500);
    if (audioRef.current && !isScrubbing.current) {
      setPosition(audioRef.current.currentTime * 1000);
    }
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (restoredVolume.current) {
      localforage.setItem("volume", volume);
    }
    localforage.setItem("repeat", repeat);
    if (isElectron) {
      window.electron!.sendMessage(
        JSON.stringify({
          type: "playback-options-changed",
          repeat,
          volume
        })
      );
    }
  }, [volume, repeat]);

  useEffect(() => {
    (async () => {
      const type = lastCommand?.type;
      switch (type) {
        case "play-item": {
          if (!lastCommand || !lastCommand.itemId) return;
          const itemDataResponse = await getItem({
            path: {
              itemId: lastCommand.itemId
            }
          });

          const itemData = itemDataResponse.data!;

          if (!["Audio", "MusicAlbum", "Playlist"].includes(itemData.Type!)) {
            console.warn("Received play command for invalid item type " + itemData.Type);
            return;
          }
          if (itemData.Type == "Audio") {
            playItem(
              (state) => dispatch(setPlaybackState(state)),
              (state) => dispatch(setQueue(state)),
              itemData
            );
          }
          if (itemData.Type == "MusicAlbum" || itemData.Type == "Playlist") {
            const query: Record<string, any> = {
              parentId: itemData.Id
            };

            if (itemData.Type == "MusicAlbum") {
              query["sortBy"] = "IndexNumber";
            }

            const itemsResponse = await getItems({ query });
            const items = itemsResponse.data!.Items;

            if (items && items.length > 0) {
              playItem(
                (state) => dispatch(setPlaybackState(state)),
                (state) => dispatch(setQueue(state)),
                items[0],
                items
              );
            } else {
              console.warn("Received play command for empty album/playlist");
            }
          }
          break;
        }
        case "pause":
          pause();
          break;
        case "resume":
          play();
          break;
        case "stop":
          stop();
          break;
        case "next":
          next();
          break;
        case "previous":
          previous();
          break;
        case "set-volume":
          if (!lastCommand) return;
          if (typeof lastCommand.volume === "number" && lastCommand.volume >= 0 && lastCommand.volume <= 100) {
            setVolume(lastCommand.volume);
          }
          break;
        case "seek":
          if (!lastCommand) return;
          if (typeof lastCommand.position === "number") {
            dispatch(
              setPlaybackState({
                ...playbackState,
                position: lastCommand.position
              })
            );
            setPosition(lastCommand.position * 1000);
          }
          break;
        case "set-repeat":
          if (!lastCommand) return;
          setRepeat(lastCommand.mode!);
          break;
        default:
          break;
      }
    })();
  }, [lastCommand]);

  function play() {
    if (!audioRef.current || !playbackState || !playbackState.item) {
      return;
    }

    dispatch(
      setPlaybackState({
        ...playbackState,
        playing: true
      })
    );

    setPosition(audioRef.current.currentTime * 1000);

    if (import.meta.env.VITE_ENABLE_PLAYBACK_REPORTING !== "false")
      reportPlaybackProgress({
        body: {
          CanSeek: false,
          ItemId: playbackState.item?.Id,
          IsPaused: false,
          IsMuted: false,
          PositionTicks: Math.floor(position * 10000),
          VolumeLevel: volume
        }
      }).catch(() => {});
  }

  function pause() {
    if (!audioRef.current || !playbackState || !playbackState.item) {
      return;
    }

    dispatch(
      setPlaybackState({
        ...playbackState,
        position: audioRef.current!.currentTime,
        playing: false
      })
    );

    setPosition(audioRef.current.currentTime * 1000);

    if (import.meta.env.VITE_ENABLE_PLAYBACK_REPORTING !== "false")
      reportPlaybackProgress({
        body: {
          CanSeek: false,
          ItemId: playbackState.item?.Id,
          IsPaused: true,
          IsMuted: false,
          PositionTicks: Math.floor(position * 10000),
          VolumeLevel: volume
        }
      }).catch(() => {});
  }

  async function getQueueItem(queueIndex: number) {
    if (!queue || queueIndex < 0 || queueIndex >= queue.itemIds.length) {
      return null;
    }

    const itemId = queue.itemIds[queueIndex];
    const cachedItem = await getCachedTrackItem(itemId);
    if (cachedItem) {
      return cachedItem;
    }

    if (playbackState?.item?.Id === itemId) {
      return playbackState.item;
    }

    return null;
  }

  async function next() {
    if (!audioRef.current) return;
    if (queue && queue.itemIds && queue.itemIds.length > 0) {
      if (queue.index == queue.itemIds.length - 1) {
        if (repeat === "all") {
          // loop back to the first song
          const firstItem = await getQueueItem(0);
          if (!firstItem) {
            stop();
            return;
          }

          dispatch(
            setPlaybackState({
              item: firstItem,
              playing: true,
              position: 0
            })
          );
          dispatch(
            setQueue({
              itemIds: queue.itemIds,
              index: 0
            })
          );
          return;
        }
        // end playback on the last song
        stop();
        return;
      }
      const nextItem = await getQueueItem(queue.index + 1);
      if (!nextItem) {
        stop();
        return;
      }

      dispatch(
        setPlaybackState({
          item: nextItem,
          playing: true,
          position: 0
        })
      );
      dispatch(
        setQueue({
          itemIds: queue.itemIds,
          index: queue.index + 1
        })
      );
    } else {
      stop();
    }
  }

  async function previous() {
    if (!audioRef.current) return;
    if (queue && audioRef.current.currentTime < 4) {
      if (queue.index == 0) {
        dispatch(
          setPlaybackState({
            ...playbackState,
            position: 0
          })
        );
        return;
      }
      const prevItem = await getQueueItem(queue.index - 1);
      if (!prevItem) {
        stop();
        return;
      }

      dispatch(
        setPlaybackState({
          item: prevItem,
          playing: true,
          position: 0
        })
      );
      dispatch(
        setQueue({
          itemIds: queue.itemIds,
          index: queue.index - 1
        })
      );
    } else {
      dispatch(
        setPlaybackState({
          ...playbackState,
          position: 0
        })
      );
    }
  }

  function stop() {
    dispatch(setPlaybackState(null));
    dispatch(setQueue(null));

    try {
      if (import.meta.env.VITE_ENABLE_PLAYBACK_REPORTING !== "false")
        reportPlaybackStopped({
          body: {}
        });
    } catch (err) {}
  }

  return (
    <>
      <audio
        className="playback-audio"
        ref={audioRef}
        crossOrigin="anonymous"
        src={`${storage.get("serverURL")}/Audio/${playbackState?.item?.Id}/Universal?itemId=${playbackState?.item?.Id}&deviceId=${storage.get("DeviceId")}&userId=${getUser()?.Id}&Container=opus,webm|opus,ts|mp3,mp3,aac,m4a|aac,m4b|aac,flac,webma,webm|webma,wav,ogg&api_key=${storage.get("AccessToken")}`}
        playsInline={true}
        onEnded={(e) => {
          if (repeat === "one") {
            dispatch(
              setPlaybackState({
                ...playbackState,
                position: 0
              })
            );
            return;
          } else {
            next();
          }
        }}
      />
      {visualizerOpen ? <Visualizer audioContextRef={audioContextRef} gainNodeRef={gainNodeRef} /> : <></>}
      {lyricsOpen && playbackState?.item && <Lyrics state={playbackState} position={position} />}
      <Footer className={lyricsOpen || visualizerOpen || location.hash.includes("queue") ? "footer-overlay" : ""}>
        <Navbar className="now-playing">
          <Col flex={1}>
            <Row>
              <Scrubber
                min={0}
                max={playbackState?.item?.RunTimeTicks! / 10000}
                value={position}
                tooltip={{
                  enabledOnHover: true,
                  enabledOnScrub: true,
                  formatString: (e) => {
                    const minutes = Math.floor(e / 1000 / 60);
                    const seconds = Math.floor((e / 1000) % 60);
                    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
                    const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;
                    return `${formattedMinutes}:${formattedSeconds}`;
                  }
                }}
                onScrubEnd={(e) => {
                  handleTimeUpdate(e);
                  isScrubbing.current = false;
                }}
                onScrubStart={(e) => {
                  setPosition(e);
                  isScrubbing.current = true;
                }}
                onScrubChange={setPosition}
              />
            </Row>
            <Row justify="space-around" align="middle">
              <Col
                flex={1}
                className="pointer"
                onClick={() => {
                  if (lyricsOpen) setLyricsOpen(false);
                  if (visualizerOpen) setVisualizerOpen(false);
                  window.location.hash = "#queue";
                }}
              >
                <HStack spacing={10}>
                  <Avatar size="sm" src={getAlbumArt(playbackState?.item!)}>
                    <Icon icon="album" noSpace />
                  </Avatar>
                  <div>
                    <VStack spacing={0}>
                      <Text weight="bold" className="no-select">
                        {playbackState?.item?.Name}
                      </Text>
                      <Text muted className="no-select">
                        {getArtistDisplay(playbackState?.item?.Artists)}
                      </Text>
                    </VStack>
                  </div>
                </HStack>
              </Col>
              <Col flex={1} display={"flex"} justifyContent={"center"}>
                <ButtonGroup>
                  <Button appearance="subtle" onClick={previous}>
                    <Icon icon={"skip_previous"} noSpace />
                  </Button>
                  <Button
                    appearance="subtle"
                    onClick={() => {
                      if (playbackState?.playing) {
                        pause();
                      } else {
                        play();
                      }
                    }}
                  >
                    <Icon icon={playbackState?.playing ? "pause" : "play_arrow"} noSpace />
                  </Button>
                  <Button
                    appearance="subtle"
                    className="stop-btn"
                    onClick={() => {
                      stop();
                    }}
                  >
                    <Icon icon={"stop"} noSpace />
                  </Button>
                  <Button appearance="subtle" onClick={next}>
                    <Icon icon={"skip_next"} noSpace />
                  </Button>
                </ButtonGroup>
              </Col>
              <Col flex={1} display={"flex"} justifyContent={"flex-end"} className="now-playing-buttons">
                <HStack spacing={9}>
                  <Text muted className="no-select track-time">
                    {formatTimestamp(position / 1000)} / {formatTimestamp(playbackState?.item?.RunTimeTicks! / 1e7)}
                  </Text>
                  {visualizerSupported.current && (
                    <Button
                      className="square visualizer-btn"
                      appearance="subtle"
                      title="Toggle Visualizer"
                      onClick={() => {
                        if (lyricsOpen) {
                          setLyricsOpen(false);
                        }
                        setVisualizerOpen(!visualizerOpen);
                      }}
                    >
                      <Icon icon={"music_video"} noSpace />
                    </Button>
                  )}
                  {(playbackState?.item?.HasLyrics || lyricsOpen) && (
                    <Button
                      className="square"
                      appearance="subtle"
                      title="Lyrics"
                      onClick={async () => {
                        if (!lyricsOpen) {
                          setLyricsOpen(true);
                          if (visualizerOpen) {
                            setVisualizerOpen(false);
                          }
                        } else {
                          setLyricsOpen(false);
                        }
                      }}
                    >
                      <Icon icon={"lyrics"} noSpace />
                    </Button>
                  )}
                  <Whisper
                    placement="top"
                    trigger="click"
                    preventOverflow={true}
                    speaker={
                      <Popover width={200}>
                        <Slider progress renderTooltip={() => volume + "%"} defaultValue={100} value={volume} onChange={setVolume} />
                      </Popover>
                    }
                  >
                    <Button className="square" appearance="subtle" title="Volume">
                      <Icon icon={volume > 66 ? "volume_up" : volume > 33 ? "volume_down" : "volume_mute"} noSpace />
                    </Button>
                  </Whisper>
                  <Button
                    className="square"
                    appearance="subtle"
                    title="Repeat"
                    onClick={() => {
                      if (repeat == "none") {
                        setRepeat("all");
                      } else if (repeat == "all") {
                        setRepeat("one");
                      } else {
                        setRepeat("none");
                      }
                    }}
                  >
                    <Icon
                      icon={repeat == "one" ? "repeat_one" : "repeat"}
                      style={{ color: repeat !== "none" ? "var(--rs-primary-600)" : "unset" }}
                      noSpace
                    />
                  </Button>
                  <ItemContextMenu
                    item={playbackState?.item!}
                    type="now-playing"
                    menuButton={
                      <Button appearance="subtle" className="square">
                        <Icon icon="more_vert" noSpace />
                      </Button>
                    }
                  />
                </HStack>
              </Col>
            </Row>
          </Col>
        </Navbar>
      </Footer>
    </>
  );
}
