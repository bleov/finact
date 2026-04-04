import { Button, ButtonGroup } from "rsuite";
import Icon from "./Icon";
import { useState } from "react";
import ItemContextMenu from "./ItemContextMenu";
import { playItem } from "../Util/Helpers";
import { markFavoriteItem, unmarkFavoriteItem } from "../Client";
import type { BaseItemDto } from "../Client";
import { useAppDispatch } from "../store/hooks";
import { setPlaybackState } from "../store/slices/playbackSlice";
import { setQueue } from "../store/slices/queueSlice";

export default function ItemListActions({ parent, items }: { parent: BaseItemDto; items: BaseItemDto[] }) {
  const dispatch = useAppDispatch();
  const [isFavorite, setIsFavorite] = useState(parent.UserData?.IsFavorite);
  const [loadingIsFavorite, setLoadingIsFavorite] = useState(false);

  return (
    <ButtonGroup>
      <Button
        className="square subtle-bordered"
        appearance="subtle"
        onClick={() => {
          playItem(
            (state) => dispatch(setPlaybackState(state)),
            (state) => dispatch(setQueue(state)),
            items[0],
            items
          );
        }}
      >
        <Icon icon="play_arrow" noSpace />
      </Button>
      <Button
        className="square subtle-bordered"
        appearance="subtle"
        onClick={() => {
          const shuffledItems = [...items].sort(() => Math.random() - 0.5);
          playItem(
            (state) => dispatch(setPlaybackState(state)),
            (state) => dispatch(setQueue(state)),
            shuffledItems[0],
            shuffledItems
          );
        }}
      >
        <Icon icon="shuffle" noSpace />
      </Button>
      <Button
        className="square subtle-bordered"
        appearance="subtle"
        loading={loadingIsFavorite}
        onClick={async () => {
          if (loadingIsFavorite) return;

          setLoadingIsFavorite(true);

          const method = isFavorite ? unmarkFavoriteItem : markFavoriteItem;

          await method({
            path: { itemId: parent.Id! }
          });

          setIsFavorite(!isFavorite);
        }}
      >
        <Icon icon="favorite" noSpace className={isFavorite ? "red-400" : ""} />
      </Button>
      <ItemContextMenu
        menuButton={
          <Button className="square subtle-bordered force-last" appearance="subtle">
            <Icon icon="more_vert" noSpace />
          </Button>
        }
        item={parent}
      />
    </ButtonGroup>
  );
}
