import { ControlledMenu, Menu, MenuDivider, MenuItem } from "@szhsin/react-menu";
import Icon from "./Icon";
import { getStorage } from "../storage";
import { getUser } from "../App";
import { JSX, useState, useContext } from "react";
import copy from "copy-to-clipboard";
import { downloadBlob, playItem } from "../Util/Helpers";
import { errorNotification, infoNotification, successNotification } from "../Util/Toaster";
import { getDownload, getItemImage, markFavoriteItem, removeItemFromPlaylist, unmarkFavoriteItem } from "../Client";
import type { BaseItemDto } from "../Client";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setLoading } from "../store/slices/loadingSlice";
import { setAddItem } from "../store/slices/addItemSlice";
import { setAddItemType } from "../store/slices/addItemTypeSlice";
import { setPlaybackState } from "../store/slices/playbackSlice";
import { setQueue } from "../store/slices/queueSlice";
import { useToaster } from "rsuite";
import { upsertTrackItem } from "../Util/ItemCache";

const storage = getStorage();

interface Category {
  icon: string;
  label: string;
  action: () => void;
}

function getMenuContents(menuCategories: Category[][]) {
  return menuCategories.map((category, index) => (
    <div key={index}>
      {index > 0 && <MenuDivider />}
      {category.map((item, itemIndex) => (
        <MenuItem
          key={itemIndex}
          onClick={(e) => {
            item.action();
          }}
        >
          <Icon icon={item.icon} />
          {item.label}
        </MenuItem>
      ))}
    </div>
  ));
}

export default function ItemContextMenu({
  item,
  context,
  menuButton,
  type,
  controlled,
  state,
  anchorPoint,
  setParentIsFavorite,
  onClose
}: {
  item: BaseItemDto;
  context?: {
    parentType?: string;
    parentId?: string;
    index: number;
    refresh?: () => void;
  };
  menuButton?: JSX.Element;
  type?: string;
  controlled?: boolean;
  state?: "open" | "closed";
  anchorPoint?: { x: number; y: number };
  setParentIsFavorite?: (isFav: boolean) => void;
  onClose?: () => void;
}) {
  const dispatch = useAppDispatch();
  const queue = useAppSelector((state) => state.queue);
  const toaster = useToaster();
  const user = getUser();

  const [isFavorite, setIsFavorite] = useState(item.UserData?.IsFavorite || false);

  const menuCategories: Category[][] = [];
  let playbackCategory: Category[] = [];

  if (type !== "queue" && type !== "now-playing") {
    if (item.Type === "Audio") {
      playbackCategory.push({
        icon: "play_arrow",
        label: "Play",
        action: () => {
          playItem(
            (state) => dispatch(setPlaybackState(state)),
            (state) => dispatch(setQueue(state)),
            item
          );
        }
      });
      playbackCategory.push({
        icon: "playlist_add",
        label: "Add to queue",
        action: () => {
          if (!item.Id) {
            toaster.push(infoNotification("Error", "Item cannot be queued"));
            return;
          }

          if (queue && queue.itemIds) {
            // Check if the item is already in the queue
            const isInQueue = queue.itemIds.includes(item.Id);
            if (isInQueue) {
              toaster.push(infoNotification("Error", "Item is already in the queue"));
              return;
            }
          }
          void upsertTrackItem(item);
          if (!queue || !queue.itemIds) {
            dispatch(setQueue({ itemIds: [item.Id], index: 0 }));
          } else {
            const newQueue = { ...queue, itemIds: [...queue.itemIds, item.Id] };
            dispatch(setQueue(newQueue));
          }
        }
      });
      playbackCategory.push({
        icon: "playlist_add",
        label: "Play next",
        action: () => {
          if (!item.Id) {
            toaster.push(infoNotification("Error", "Item cannot be queued"));
            return;
          }

          if (queue && queue.itemIds) {
            // Check if the item is already in the queue
            const isInQueue = queue.itemIds.includes(item.Id);
            if (isInQueue) {
              toaster.push(infoNotification("Error", "Item is already in the queue"));
              return;
            }
          }
          void upsertTrackItem(item);
          if (!queue || !queue.itemIds) {
            dispatch(setQueue({ itemIds: [item.Id], index: 0 }));
          } else {
            const newQueue = { ...queue, itemIds: [...queue.itemIds] };
            newQueue.itemIds.splice(newQueue.index + 1, 0, item.Id);
            dispatch(setQueue(newQueue));
          }
        }
      });
      menuCategories.push(playbackCategory);
    }
  }

  if (item.Type === "Audio") {
    const generalCategory: Category[] = [];
    if (!window.location.hash.includes("albums")) {
      generalCategory.push({
        icon: "album",
        label: "Go to Album",
        action: () => {
          window.location.hash = "#albums/" + item.AlbumId;
        }
      });
    }
    generalCategory.push({
      icon: "playlist_add",
      label: "Add to Playlist",
      action: () => {
        dispatch(setAddItemType("playlist"));
        dispatch(setAddItem(item));
      }
    });
    if (item.UserData && "IsFavorite" in item.UserData) {
      generalCategory.push({
        icon: isFavorite ? "favorite_border" : "favorite",
        label: isFavorite ? "Unfavorite" : "Favorite",
        action: async () => {
          try {
            const method = isFavorite ? unmarkFavoriteItem : markFavoriteItem;

            await method({
              path: { itemId: item.Id! }
            });

            setIsFavorite(!isFavorite);
            setParentIsFavorite?.(!isFavorite);
          } catch (err) {
            console.error(err);
            toaster.push(errorNotification("Error", `Failed to ${isFavorite ? "add to" : "remove from"} favorites`));
          }
        }
      });
    }
    menuCategories.push(generalCategory);
    const advancedCategory: Category[] = [];
    if (user?.Policy?.EnableContentDownloading) {
      advancedCategory.push({
        icon: "download",
        label: "Download",
        action: async () => {
          dispatch(setLoading(true));
          try {
            const blob = await getDownload({
              path: { itemId: item.Id! }
            });

            const url = window.URL.createObjectURL(blob.data!);
            const a = document.createElement("a");
            a.href = url;
            a.download = item.Name!;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
          } finally {
            dispatch(setLoading(false));
          }
        }
      });

      advancedCategory.push({
        icon: "link",
        label: "Copy Stream URL",
        action: () => {
          copy(`${storage.get("serverURL")}/Items/${item.Id}/Download?api_key=${storage.get("AccessToken")}`);
        }
      });
    }
    advancedCategory.push({
      icon: "content_copy",
      label: "Copy Item ID",
      action: () => {
        copy(item.Id!);
      }
    });
    menuCategories.push(advancedCategory);
  }

  if (item.Type === "MusicAlbum" || item.Type === "Playlist") {
    const addCategory: Category[] = [];
    addCategory.push({
      icon: "playlist_add",
      label: "Add to Playlist",
      action: () => {
        dispatch(setAddItemType("playlist"));
        dispatch(setAddItem(item));
      }
    });
    if (item.Type === "MusicAlbum") {
      addCategory.push({
        icon: "add_to_photos",
        label: "Add to Collection",
        action: () => {
          dispatch(setAddItemType("collection"));
          dispatch(setAddItem(item));
        }
      });
    }
    menuCategories.push(addCategory);
  }

  if (item.Type === "MusicAlbum") {
    menuCategories.push([
      { icon: "content_copy", label: "Copy Album ID", action: () => copy(item.Id!) },
      {
        icon: "download",
        label: "Save Album Art",
        action: async () => {
          dispatch(setLoading(true));

          try {
            const imageResponse = await getItemImage({
              path: {
                itemId: item.Id!,
                imageType: "Primary"
              },
              query: {
                quality: 100
              }
            });

            if (!imageResponse.data) {
              toaster.push(errorNotification("Error", "No album art available"));
              return;
            }

            downloadBlob(imageResponse.data, item.Name!);
          } catch (err) {
            console.error(err);
            toaster.push(errorNotification("Error", "Failed to save album art"));
          }

          dispatch(setLoading(false));
        }
      }
    ]);
  }
  if (item.Type === "Playlist") {
    menuCategories.push([
      { icon: "content_copy", label: "Copy Playlist ID", action: () => copy(item.Id!) },
      {
        icon: "download",
        label: "Save Playlist Cover",
        action: async () => {
          dispatch(setLoading(true));

          try {
            const imageResponse = await getItemImage({
              path: {
                itemId: item.Id!,
                imageType: "Primary"
              },
              query: {
                quality: 100
              }
            });

            if (!imageResponse.data) {
              toaster.push(errorNotification("Error", "No playlist cover available"));
              return;
            }

            downloadBlob(imageResponse.data, item.Name!);
          } catch (err) {
            console.error(err);
            toaster.push(errorNotification("Error", "Failed to save playlist cover"));
          }

          dispatch(setLoading(false));
        }
      }
    ]);
  }

  if (item.Type === "Audio" && context?.parentType == "playlist" && context?.parentId) {
    const playlistCategory: Category[] = [];
    playlistCategory.push({
      icon: "playlist_remove",
      label: "Remove from Playlist",
      action: () => {
        dispatch(setLoading(true));

        removeItemFromPlaylist({
          path: { playlistId: context.parentId! },
          query: { entryIds: [item.Id!] },
          method: "DELETE"
        }).then((playlistResponse) => {
          dispatch(setLoading(false));
          if (!playlistResponse.response.ok) {
            if (playlistResponse.response.status === 403) {
              toaster.push(errorNotification("Failed to remove item", "You don't have permission to remove items from this playlist"));
              return;
            }

            toaster.push(errorNotification("Error", "Failed to remove item from playlist"));
            return;
          }

          toaster.push(successNotification("Success", "Item removed from playlist"));
          context.refresh?.();
        });
      }
    });
    menuCategories.push(playlistCategory);
  }

  return controlled ? (
    <ControlledMenu
      state={state}
      anchorPoint={anchorPoint}
      onClose={onClose}
      align="start"
      transition
      theming="dark"
      onClick={(e) => e.stopPropagation()}
    >
      {getMenuContents(menuCategories)}
    </ControlledMenu>
  ) : (
    <Menu menuButton={menuButton!} portal align="end" transition theming="dark" onClick={(e) => e.stopPropagation()}>
      {getMenuContents(menuCategories)}
    </Menu>
  );
}
