import { Heading, Button, Placeholder, Row, Grid, VStack, List } from "rsuite";
import { getUser } from "../App";
import { useState, useEffect } from "react";
import { getLibrary } from "../Util/Network";
import ItemTile from "../Components/ItemTile";
import { playItem } from "../Util/Helpers";
import { getItems, getLatestMedia } from "../Client";
import type { BaseItemDto, BaseItemKind, BaseItemDtoQueryResult } from "../Client/index";
import { ItemListEntry } from "../Components/ItemListEntry";
import { useAppDispatch } from "../store/hooks";
import { setPlaybackState } from "../store/slices/playbackSlice";
import { setQueue } from "../store/slices/queueSlice";
import { setPlaylistContext } from "../store/slices/playlistContextSlice";

export default function Home() {
  return (
    <>
      <VStack spacing={16}>
        <RecentlyAdded />
        <FrequentlyPlayed />
      </VStack>
    </>
  );
}

export function RecentlyAdded() {
  const [recentItems, setRecentItems] = useState<BaseItemDto[] | null>(null);

  useEffect(() => {
    getLibrary("music").then((musicLibrary) => {
      getLatestMedia({
        query: {
          userId: getUser()?.Id,
          limit: 30,
          fields: ["PrimaryImageAspectRatio", "Path"],
          imageTypeLimit: 1,
          enableImageTypes: ["Primary"],
          parentId: musicLibrary.Id
        }
      }).then((recentItems) => {
        setRecentItems(recentItems.data!);
      });
    });
  }, []);

  return (
    <>
      {!recentItems ? (
        <Placeholder active />
      ) : (
        <>
          <VStack spacing={10}>
            <Heading level={4}>Recently Added</Heading>
            <Grid fluid width={"100%"}>
              <Row gutter={16}>
                {recentItems.map((item, index) => (
                  <ItemTile
                    item={item}
                    tileProps={{ onClick: () => (window.location.hash = `#albums/${item.Id}`), className: "pointer" }}
                    key={item.Id}
                  />
                ))}
              </Row>
            </Grid>
          </VStack>
        </>
      )}
    </>
  );
}

export function FrequentlyPlayed() {
  const [frequentlyPlayed, setFrequentlyPlayed] = useState<BaseItemDtoQueryResult | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    getLibrary("music").then((musicLibrary) => {
      getItems({
        query: {
          userId: getUser()?.Id,
          sortBy: ["PlayCount"],
          sortOrder: ["Descending"],
          includeItemTypes: ["Audio"],
          limit: 10,
          recursive: true,
          fields: ["PrimaryImageAspectRatio"],
          filters: ["IsPlayed"],
          parentId: musicLibrary.Id,
          imageTypeLimit: 1,
          enableImageTypes: ["Primary", "Backdrop", "Banner", "Thumb"],
          enableTotalRecordCount: false
        }
      }).then((frequentlyPlayedItems) => {
        setFrequentlyPlayed(frequentlyPlayedItems.data!);
        if (frequentlyPlayedItems.data?.Items) {
          dispatch(setPlaylistContext({ items: frequentlyPlayedItems.data.Items, type: "standalone" }));
        }
      });
    });
  }, [dispatch]);

  return (
    <>
      {!frequentlyPlayed || !frequentlyPlayed.Items ? (
        <Placeholder active />
      ) : (
        <>
          <VStack spacing={10} width={"100%"}>
            <Heading level={4}>Frequently Played</Heading>
            <List bordered hover width={"100%"}>
              {frequentlyPlayed.Items.map((item, idx) => (
                <ItemListEntry key={item.Id} item={item} index={idx} type="standalone" />
              ))}
            </List>
          </VStack>
        </>
      )}
    </>
  );
}
