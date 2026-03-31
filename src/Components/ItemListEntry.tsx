import { useContext, useState } from "react";
import { List, HStack, VStack, Text, Button, Avatar, Box } from "rsuite";
import { GlobalState } from "../App";
import { formatTimestamp, getAlbumArt } from "../Util/Formatting";
import Icon from "./Icon";
import ItemContextMenu from "./ItemContextMenu";
import { playItem } from "../Util/Helpers";
import type { BaseItemDto } from "../Client";

export function ItemListEntry({
  item,
  index,
  type,
  allItems,
  setSortable,
  parentId,
  refresh
}: {
  item: BaseItemDto;
  index: number;
  type: "queue" | "album" | "playlist" | "standalone";
  allItems?: BaseItemDto[];
  setSortable?: React.Dispatch<React.SetStateAction<boolean>>;
  parentId?: string;
  refresh?: () => void;
}) {
  const { setQueue, setPlaybackState } = useContext(GlobalState);
  const [isFavorite, setIsFavorite] = useState(item.UserData?.IsFavorite || false);

  return (
    <List.Item
      key={item.Id}
      index={index}
      className="pointer"
      onClick={async () => {
        playItem(setPlaybackState, setQueue, item, allItems);
      }}
    >
      <HStack spacing={15} alignItems="center">
        {type == "queue" && (
          <div
            onMouseEnter={() => {
              setSortable?.(true);
            }}
            onMouseLeave={() => {
              setSortable?.(false);
            }}
          >
            <Icon icon="drag_handle" style={{ color: "var(--rs-text-secondary)" }} noSpace />
          </div>
        )}
        {type == "album" && item.IndexNumber && <Text muted>{item.IndexNumber}</Text>}
        {type != "album" && (
          <Avatar src={getAlbumArt(item, 160)}>
            <Icon icon="album" noSpace />
          </Avatar>
        )}
        <VStack spacing={0}>
          <Text>{item.Name}</Text>
          {type == "album"
            ? item.Artists && item.Artists.length > 0 && <Text muted>{item.Artists.join(" / ")}</Text>
            : item.Album && (
                <Text as="a" href={`#albums/${item.AlbumId}`} muted onClick={(e) => e.stopPropagation()}>
                  {item.Album}
                </Text>
              )}
        </VStack>
        <Box alignSelf="flex-end" display={"flex"} justifyContent={"flex-end"} grow={1}>
          {isFavorite && (
            <Icon icon="favorite" className="red-400 center-vert" style={{ marginRight: "10px", fontSize: "1.4em" }} noSpace />
          )}
          <VStack alignItems="center" marginRight={5}>
            <Text style={{ marginBlock: "auto" }} muted>
              {formatTimestamp(item.RunTimeTicks! / 10000000)}
            </Text>
          </VStack>
          {type == "queue" && (
            <Button
              appearance="subtle"
              className="square"
              onClick={(e) => {
                e.stopPropagation();
                setQueue((prevState) => {
                  const newItems = [...prevState!.items];
                  newItems.splice(index, 1);
                  return { ...prevState!, items: newItems };
                });
              }}
            >
              <Icon icon="remove_circle_outline" noSpace />
            </Button>
          )}
          <ItemContextMenu
            item={item}
            context={{ parentType: type, index, parentId, refresh }}
            type={type}
            setParentIsFavorite={setIsFavorite}
            menuButton={
              <Button
                appearance="subtle"
                className="square"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <Icon icon="more_vert" noSpace />
              </Button>
            }
          />
        </Box>
      </HStack>
    </List.Item>
  );
}
