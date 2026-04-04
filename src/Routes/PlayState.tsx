import { useEffect, useRef, useState } from "react";
import { Center, Image, List, Placeholder, Stack, Text, VStack } from "rsuite";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { getCacheStorage, getStorage } from "../storage";
import { ItemListEntry } from "../Components/ItemListEntry";
import Fallback from "../Components/Fallback";
import { getAlbumArt } from "../Util/Formatting";
import { BlurhashCanvas } from "react-blurhash";
import { setQueue } from "../store/slices/queueSlice";
import { BaseItemDto } from "../Client";
import { getCachedTrackItems } from "../Util/ItemCache";
import { List as WindowedList } from "react-window";

const storage = getStorage();

function Queue() {
  const dispatch = useAppDispatch();
  const queue = useAppSelector((state) => state.queue);
  const playbackState = useAppSelector((state) => state.playback);
  const [queueItems, setQueueItems] = useState<Array<BaseItemDto | null>>([]);
  const queueViewportRef = useRef<HTMLDivElement>(null);
  const [queueViewportHeight, setQueueViewportHeight] = useState(0);

  useEffect(() => {
    const element = queueViewportRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      setQueueViewportHeight(Math.floor(entry.contentRect.height));
    });

    resizeObserver.observe(element);
    setQueueViewportHeight(Math.floor(element.getBoundingClientRect().height));

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    let canceled = false;

    (async () => {
      if (!queue?.itemIds || queue.itemIds.length === 0) {
        if (!canceled) {
          setQueueItems([]);
        }
        return;
      }

      const cachedItems = await getCachedTrackItems(queue.itemIds);
      const hydratedItems = cachedItems.map((item, index) => {
        if (item) {
          return item;
        }

        if (playbackState?.item?.Id === queue.itemIds[index]) {
          return playbackState.item ?? null;
        }

        return null;
      });

      if (!canceled) {
        setQueueItems(hydratedItems);
      }
    })();

    return () => {
      canceled = true;
    };
  }, [queue?.itemIds, playbackState?.item]);

  const handleSortEnd = ({
    oldIndex,
    newIndex,
    node
  }: {
    oldIndex: number;
    newIndex: number;
    collection: number | string;
    node: HTMLElement;
  }) => {
    if (queue) {
      const newItemIds = [...queue.itemIds];
      const moveData = newItemIds.splice(oldIndex, 1);
      newItemIds.splice(newIndex, 0, moveData[0]);
      dispatch(setQueue({ ...queue, itemIds: newItemIds }));
    }
  };

  return (
    <Stack.Item flex={1} className="queue" height={"100%"} overflow={"hidden"}>
      {!queue || queue.itemIds.length == 0 ? (
        <Fallback icon="queue_music" text="Queue is empty" />
      ) : (
        <div ref={queueViewportRef} style={{ height: "100%" }}>
          <List bordered onSort={handleSortEnd} style={{ height: "100%", overflow: "hidden" }}>
            <WindowedList
              defaultHeight={500}
              style={{ height: queueViewportHeight || 1 }}
              overscanCount={6}
              rowComponent={({ index, style, ...rowProps }: any) => {
                const item = queueItems[index];
                if (!item) {
                  return (
                    <List.Item index={index} className="item-list-entry" style={style}>
                      <Placeholder.Paragraph />
                    </List.Item>
                  );
                }
                let active = item.Id === playbackState?.item?.Id;

                return (
                  <ItemListEntry
                    item={item}
                    index={index}
                    type="queue"
                    allItems={queue.itemIds}
                    props={{ style }}
                    active={active}
                    {...rowProps}
                  />
                );
              }}
              rowCount={queue.itemIds.length}
              rowHeight={66}
              rowProps={{
                type: "queue",
                allItems: queue.itemIds
              }}
            />
          </List>
        </div>
      )}
    </Stack.Item>
  );
}

export default function PlayState() {
  const playbackState = useAppSelector((state) => state.playback);

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
