import { useContext, useEffect, useRef, useState } from "react";
import { Button, ButtonGroup, Card, Center, Divider, HStack, Image, List, Stack, Text, VStack } from "rsuite";
import { GlobalState } from "../App";
import Icon from "../Components/Icon";
import { getCacheStorage, getStorage } from "../storage";
import { ItemListEntry } from "../Components/ItemListEntry";
import Fallback from "../Components/Fallback";
import { Blurhash } from "react-blurhash";
import { getAlbumArt } from "../Util/Formatting";
import { Scrubber } from "react-scrubber";
import { set } from "rsuite/esm/internals/utils/date";
import localforage from "localforage";

const cacheStorage = getCacheStorage();
const storage = getStorage();

function Queue() {
  const { queue, setQueue } = useContext(GlobalState);
  const [sortable, setSortable] = useState(false);

  const handleSortEnd = ({
    oldIndex,
    newIndex,
    node
  }: {
    oldIndex: number;
    newIndex: number;
    collection: number | string;
    node: HTMLElement;
  }) =>
    setQueue(() => {
      const moveData = queue!.items.splice(oldIndex, 1);
      const newData = [...queue!.items];
      newData.splice(newIndex, 0, moveData[0]);
      return { ...queue!, items: newData };
    });

  return (
    <Stack.Item flex={1} className="queue" overflow={"scroll"}>
      {!queue || !("items" in queue) || queue.items.length == 0 ? (
        <Fallback icon="queue_music" text="Queue is empty" />
      ) : (
        <>
          <List bordered sortable={sortable} hover onSort={handleSortEnd}>
            {queue.items.map((item, index) => {
              return (
                <ItemListEntry item={item} type="queue" index={index} key={item.Id} allItems={queue.items} setSortable={setSortable} />
              );
            })}
          </List>
        </>
      )}
    </Stack.Item>
  );
}

export default function PlayState() {
  const { playbackState, setPlaybackState } = useContext(GlobalState);
  const isScrubbing = useRef(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    let interval = setInterval(() => {
      localforage.getItem<number>("position").then((pos) => {
        setPosition(pos ?? 0);
      });
    }, 500);

    return () => clearInterval(interval);
  });

  return (
    <Stack
      direction={{
        xs: "column",
        sm: "row"
      }}
      height={"100%"}
      // divider={<Divider />}
    >
      <Center flex={1} height={"100%"} maxWidth={"50%"}>
        {!playbackState || !playbackState.item ? (
          <Fallback icon="play_circle_outline" text="Nothing is playing" />
        ) : (
          <>
            <VStack justifyContent="space-between" align="center" spacing={20} width={"100%"} padding={20}>
              <Image
                borderRadius={"6px"}
                maxWidth={"40vw"}
                maxHeight={"40vh"}
                onLoad={(e) => {
                  (e.target as HTMLElement).style.visibility = "visible";
                }}
                draggable={false}
                src={
                  playbackState.item.Type == "Audio"
                    ? getAlbumArt(playbackState.item)
                    : `${storage.get("serverURL")}/Items/${playbackState.item.Id}/Images/Primary`
                }
              />
              <Text size={16}>{playbackState.item.Name}</Text>
              <Scrubber
                min={0}
                max={playbackState.item?.RunTimeTicks! / 10000}
                value={position!}
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
                  // handleTimeUpdate(e);
                  isScrubbing.current = false;
                }}
                onScrubStart={(e) => {
                  // handleTimeUpdate(e);
                  setPosition(e);
                  setPlaybackState((prev) => ({ ...prev!, position: e / 1000 }));
                  isScrubbing.current = true;
                }}
                onScrubChange={(e) => {
                  setPosition(e);
                  setPlaybackState((prev) => ({ ...prev!, position: e / 1000 }));
                }}
              />
              <ButtonGroup>
                <Button
                  appearance="subtle"
                  onClick={() => {
                    setPlaybackState((prev) => ({ ...prev!, position: (prev!.position ?? 0) - 10000 }));
                  }}
                >
                  <Icon icon="skip_previous" noSpace />
                </Button>
                <Button
                  appearance="subtle"
                  onClick={() => {
                    setPlaybackState((prev) => ({ ...prev!, playing: !prev!.playing }));
                  }}
                >
                  <Icon icon={playbackState.playing ? "pause" : "play_arrow"} noSpace />
                </Button>
                <Button
                  appearance="subtle"
                  onClick={() => {
                    setPlaybackState((prev) => ({ ...prev!, position: (prev!.position ?? 0) + 10000 }));
                  }}
                >
                  <Icon icon="skip_next" noSpace />
                </Button>
              </ButtonGroup>
            </VStack>
          </>
        )}
      </Center>
      <Queue />
    </Stack>
  );
}
