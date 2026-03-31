import type { BaseItemDto } from "../Client";
import { asyncStorage } from "../storage";

function getTrackCacheKey(itemId: string) {
  return `track:${itemId}`;
}

export async function upsertTrackItem(item: BaseItemDto | null | undefined) {
  if (!item || item.Type !== "Audio" || !item.Id) {
    return;
  }

  console.log(`Caching track item: ${item.Name} (${item.Id})`);
  await asyncStorage.setItem(getTrackCacheKey(item.Id), item);
}

export async function upsertTrackItems(items: Array<BaseItemDto | null | undefined>) {
  await Promise.all(items.map((item) => upsertTrackItem(item)));
}

export async function getCachedTrackItem(itemId: string) {
  return (await asyncStorage.getItem<BaseItemDto>(getTrackCacheKey(itemId))) ?? null;
}

export async function getCachedTrackItems(itemIds: string[]) {
  return Promise.all(itemIds.map((itemId) => getCachedTrackItem(itemId)));
}
