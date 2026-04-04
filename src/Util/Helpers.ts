import { BaseItemDto } from "../Client";
import type { Queue } from "../store/slices/queueSlice";
import { upsertTrackItem, upsertTrackItems } from "./ItemCache";

export function playItem(
  setPlaybackState: (state: any) => void,
  setQueue: (queue: Queue | null) => void,
  item: BaseItemDto,
  allItems?: BaseItemDto[] | string[]
) {
  void upsertTrackItem(item);

  let queueItemIds: string[] | undefined;

  if (allItems && allItems.length > 0) {
    if (typeof allItems[0] === "string") {
      const idList = allItems as string[];
      queueItemIds = idList.filter((id): id is string => typeof id === "string" && id.length > 0);
    } else {
      const itemList = allItems as BaseItemDto[];
      void upsertTrackItems(itemList);
      queueItemIds = itemList.map((x) => x.Id).filter((id): id is string => Boolean(id));
    }
  }

  let queue: Queue;

  if (!queueItemIds || queueItemIds.length === 0) {
    queue = {
      itemIds: item.Id ? [item.Id] : [],
      index: 0
    };
  } else {
    const index = item.Id ? queueItemIds.findIndex((id) => id === item.Id) : -1;

    queue = {
      itemIds: queueItemIds,
      index: index >= 0 ? index : 0
    };
  }
  setPlaybackState({
    item,
    position: 0,
    playing: true
  });
  setQueue(queue);
}

function getIsElectron() {
  // Renderer process
  if (typeof window !== "undefined" && typeof window.process === "object" && window.process.type === "renderer") {
    return true;
  }

  // Main process
  if (typeof process !== "undefined" && typeof process.versions === "object" && !!process.versions.electron) {
    return true;
  }

  // Detect the user agent when the `nodeIntegration` option is set to false
  if (typeof navigator === "object" && typeof navigator.userAgent === "string" && navigator.userAgent.indexOf("Electron") >= 0) {
    return true;
  }

  return false;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `${filename}.${blob.type.split("/")[1]}`;
  document.body.appendChild(a);

  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}

export const isElectron = getIsElectron();
