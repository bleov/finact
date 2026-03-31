import { useContext, useEffect, useRef, useState } from "react";
import { Center, Image, List, Stack, Text, VStack } from "rsuite";
import { GlobalState } from "../App";
import { getCacheStorage, getStorage } from "../storage";
import { ItemListEntry } from "../Components/ItemListEntry";
import Fallback from "../Components/Fallback";
import { getAlbumArt } from "../Util/Formatting";
import localforage from "localforage";
import { Blurhash, BlurhashCanvas } from "react-blurhash";

const cacheStorage = getCacheStorage();
const storage = getStorage();

function Queue() {
  const { queue, setQueue, playbackState } = useContext(GlobalState);
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
    <Stack.Item flex={1} className="queue" height={"100%"} overflow={"auto"}>
      {!queue || !("items" in queue) || queue.items.length == 0 ? (
        <Fallback icon="queue_music" text="Queue is empty" />
      ) : (
        <>
          <List bordered sortable={sortable} onSort={handleSortEnd}>
            {queue.items.map((item, index) => {
              return (
                <ItemListEntry
                  props={{
                    style: {
                      backgroundColor: playbackState?.item?.Id == item.Id ? "rgba(40, 40, 40, 0.4)" : undefined
                    }
                  }}
                  item={item}
                  type="queue"
                  index={index}
                  key={item.Id}
                  allItems={queue.items}
                  setSortable={setSortable}
                />
              );
            })}
          </List>
        </>
      )}
    </Stack.Item>
  );
}

export default function PlayState() {
  const { playbackState } = useContext(GlobalState);
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
    >
      {playbackState && playbackState.item && playbackState.item.ImageBlurHashes?.Primary && (
        <BlurhashCanvas
          hash={playbackState.item.ImageBlurHashes.Primary[Object.keys(playbackState.item.ImageBlurHashes.Primary)[0]]}
          width={500}
          height={500}
          className="background-blurhash"
        />
      )}
      <Center flex={1} height={"100%"} maxWidth={"50%"}>
        {!playbackState || !playbackState.item ? (
          <Fallback icon="play_circle_outline" text="Nothing is playing" />
        ) : (
          <>
            <VStack justifyContent="space-between" textAlign="center" align="center" spacing={20} width={"100%"} padding={15}>
              <Image
                borderRadius={"6px"}
                maxWidth={"40vw"}
                height={"40vh"}
                onLoad={(e) => {
                  (e.target as HTMLElement).style.visibility = "visible";
                }}
                draggable={false}
                userSelect={"none"}
                src={
                  playbackState.item.Type == "Audio"
                    ? getAlbumArt(playbackState.item)
                    : `${storage.get("serverURL")}/Items/${playbackState.item.Id}/Images/Primary`
                }
              />
              <VStack spacing={0} userSelect={"none"}>
                <Text size="lg" width={"100%"}>
                  {playbackState.item.Name}
                </Text>
                <Text muted size="md" width={"100%"}>
                  {playbackState.item.Artists?.join(", ")}
                </Text>
              </VStack>
            </VStack>
          </>
        )}
      </Center>
      <Queue />
    </Stack>
  );
}
