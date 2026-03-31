import { BaseItemDto } from "../Client";
import type { Queue } from "../store/slices/queueSlice";

export function playItem(
  setPlaybackState: (state: any) => void,
  setQueue: (queue: Queue | null) => void,
  item: BaseItemDto,
  allItems?: BaseItemDto[]
) {
  let queue: Queue;

  if (!allItems) {
    queue = {
      items: [item],
      index: 0
    };
  } else {
    queue = {
      items: allItems,
      index: allItems.findIndex((x) => x.Id == item.Id)
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
