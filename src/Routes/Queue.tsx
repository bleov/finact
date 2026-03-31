import { useContext, useState } from "react";
import { List } from "rsuite";
import { GlobalState } from "../App";
import { getCacheStorage } from "../storage";
import { ItemListEntry } from "../Components/ItemListEntry";
import Fallback from "../Components/Fallback";

const cacheStorage = getCacheStorage();

export default function Queue() {
  const { queue, setQueue } = useContext(GlobalState);
  const [sortable, setSortable] = useState(false);

  const handleSortEnd = ({
    oldIndex,
    newIndex,
    collection,
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
    <div className="queue">
      {!queue || !("items" in queue) || queue.items.length == 0 ? (
        <Fallback icon="queue_music" text="Queue is empty" />
      ) : (
        <>
          <List bordered sortable={sortable} hover onSort={handleSortEnd}>
            {queue.items.map((item, index) => {
              return (
                <ItemListEntry item={item} type="queue" index={index} key={item.Id} allItems={queue.items} setSortable={setSortable} />
              );
            })}
          </List>
        </>
      )}
    </div>
  );
}
