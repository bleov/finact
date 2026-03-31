import { Heading, Input, InputGroup, Form, Grid, Row, VStack, Box, List } from "rsuite";
import Icon from "../Components/Icon";
import { useState } from "react";
import { getStorage } from "../storage";
import ItemTile from "../Components/ItemTile";
import { playItem } from "../Util/Helpers";
import Fallback from "../Components/Fallback";
import { getItems } from "../Client";
import type { BaseItemDto, BaseItemKind } from "../Client/index";
import Spacer from "../Components/Spacer";
import { ItemListEntry } from "../Components/ItemListEntry";
import { useAppDispatch } from "../store/hooks";
import { setPlaybackState } from "../store/slices/playbackSlice";
import { setQueue } from "../store/slices/queueSlice";

const storage = getStorage();

const searchedItemTypes: BaseItemKind[] = ["MusicAlbum", "Playlist", "Audio"];
const itemTypeDisplayNames = { MusicAlbum: "Albums", Audio: "Tracks", Playlist: "Playlists" };

interface Categories {
  Type: BaseItemKind;
  Items: BaseItemDto[];
}

async function searchInstance(searchQuery: string = "") {
  const searchResults = await getItems({
    query: {
      userId: storage.get("User").Id,
      limit: 100,
      recursive: true,
      searchTerm: searchQuery,
      includeItemTypes: searchedItemTypes
    }
  });

  const categories: Categories[] = [];

  searchResults.data!.Items!.forEach((item) => {
    const type = item.Type!;

    if (!categories.some((category) => category.Type === type)) {
      categories.push({ Type: type, Items: [] });
    }

    const category = categories.find((category) => category.Type === type);

    if (category) {
      category.Items.push(item);
    }
  });

  categories.sort((a, b) => {
    const indexA = searchedItemTypes.indexOf(a.Type);
    const indexB = searchedItemTypes.indexOf(b.Type);
    return indexA - indexB;
  });

  return categories;
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Categories[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  return (
    <>
      <VStack spacing={10}>
        <Heading level={3}>Search</Heading>
        <Box width={"100%"}>
          <Form
            onSubmit={async () => {
              if (searching) return;
              setSearching(true);
              setSearchResults(await searchInstance(searchQuery));
              setSearched(true);
              setSearching(false);
            }}
          >
            <InputGroup>
              <Input autoFocus value={searchQuery} onChange={setSearchQuery} />
              <InputGroup.Button type="submit" loading={searching} disabled={searching}>
                <Icon icon="search" noSpace />
              </InputGroup.Button>
            </InputGroup>
          </Form>
        </Box>
        {searchResults.length > 0 ? (
          <>
            {searchResults.map((category, index) => {
              if (!("Items" in category) || category.Items.length == 0) {
                return null;
              }
              return (
                <Box key={index} width={"100%"}>
                  <Heading level={4}>{itemTypeDisplayNames[category.Type as keyof typeof itemTypeDisplayNames] || "Unknown"}</Heading>
                  <Spacer height={10} />
                  {category.Type == "Audio" ? (
                    <List bordered hover width={"100%"}>
                      {category.Items.map((item, idx) => (
                        <ItemListEntry key={item.Id} item={item} index={idx} type="standalone" allItems={category.Items} />
                      ))}
                    </List>
                  ) : (
                    <Grid fluid>
                      <Row gutter={16}>
                        {category.Items.map((item) => {
                          if (!item || item.Id == null) return;
                          return (
                            <ItemTile
                              item={item}
                              key={item.Id}
                              tileProps={{
                                className: "pointer",
                                onClick: (e) => {
                                  if (item.Type && item.Type == "Audio") {
                                    playItem(setPlaybackState, setQueue, item, category.Items);
                                  } else if (item.Type == "MusicAlbum") {
                                    window.location.hash = `#albums/${item.Id}`;
                                  } else if (item.Type == "Playlist") {
                                    window.location.hash = `#playlists/${item.Id}`;
                                  } else {
                                    console.warn("Unknown item type", item);
                                  }
                                }
                              }}
                            />
                          );
                        })}
                      </Row>
                    </Grid>
                  )}
                </Box>
              );
            })}
          </>
        ) : (
          searched && <Fallback icon="search_off" text="No results found" />
        )}
      </VStack>
    </>
  );
}
