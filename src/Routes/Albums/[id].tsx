import { useEffect, useState, Fragment } from "react";
import { useParams } from "react-router";
import { Heading, List, HStack, Stat, Image, Box } from "rsuite";
import { formatSeconds } from "../../Util/Formatting";
import { getStorage } from "../../storage";
import Spacer from "../../Components/Spacer";
import { ItemListEntry } from "../../Components/ItemListEntry";
import ItemListActions from "../../Components/ItemListActions";
import Fallback from "../../Components/Fallback";
import { getItem, getItems } from "../../Client";
import type { BaseItemDto } from "../../Client";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setLoading } from "../../store/slices/loadingSlice";

const storage = getStorage();

function getDiscGroups(items: BaseItemDto[]) {
  let hasDiscs = false;
  let discNumbers: number[] = [];
  let discs: BaseItemDto[][] = [];

  items.forEach((item) => {
    if (item.ParentIndexNumber) {
      hasDiscs = true;

      if (!discNumbers.includes(item.ParentIndexNumber)) {
        discNumbers.push(item.ParentIndexNumber);
      }
    }
  });

  if (hasDiscs) {
    discNumbers.forEach((discNumber) => {
      discs[discNumber] = items.filter((item) => item.ParentIndexNumber === discNumber);
    });
    return discs;
  } else {
    return [items];
  }
}

export default function Album() {
  const { id } = useParams();

  const [data, setData] = useState<{
    data: BaseItemDto;
    discs: BaseItemDto[][];
  } | null>(null);
  const [error, setError] = useState("");
  const [errorIcon, setErrorIcon] = useState("album");
  const dispatch = useAppDispatch();
  const loading = useAppSelector((state) => state.loading);

  useEffect(() => {
    dispatch(setLoading(true));
    const fetchPlaylistData = async () => {
      try {
        const responses = await Promise.all([
          getItem({
            path: { itemId: id! }
          }),
          getItems({
            query: {
              parentId: id!,
              fields: ["ItemCounts", "PrimaryImageAspectRatio", "CanDelete"],
              sortBy: ["IndexNumber"]
            }
          })
        ]);
        setData({ data: responses[0].data!, discs: getDiscGroups(responses[1].data!.Items!) });
      } catch (err) {
        console.error(err);
        if (err.toString().includes("400")) {
          setError("Album does not exist");
          setErrorIcon("search_off");
        } else if (err.toString().includes("403")) {
          setError("You do not have permission to view this album");
          setErrorIcon("lock");
        } else if (err.toString().includes("NetworkError")) {
          setError("Network error");
          setErrorIcon("wifi_off");
        } else {
          console.log("Album error unknown");
          setError("Album failed to load");
        }
        setData(null);
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchPlaylistData();
  }, [id]);

  return (
    <>
      {data ? (
        <>
          <HStack spacing={14} wrap>
            <Image height={128} rounded bordered src={`${storage.get("serverURL")}/Items/${id}/Images/Primary`} />
            <HStack.Item flexGrow={1}>
              <Heading level={3} marginLeft={10}>
                {data.data.Name}
              </Heading>
              <HStack spacing={10} justify={"space-between"} wrap>
                <Box flexGrow={2}>
                  <HStack spacing={5} wrap>
                    <Stat className="item-stat">
                      <Stat.Value value={data.data.ChildCount!} />
                      <Stat.Label>Tracks</Stat.Label>
                    </Stat>
                    <Stat className="item-stat">
                      <Stat.Value>{formatSeconds(data.data.CumulativeRunTimeTicks! / 10000000, true, false)}</Stat.Value>
                      <Stat.Label>Run Time</Stat.Label>
                    </Stat>
                    {data.data.ProductionYear && (
                      <Stat className="item-stat">
                        <Stat.Value>{data.data.ProductionYear}</Stat.Value>
                        <Stat.Label>Year</Stat.Label>
                      </Stat>
                    )}
                    {data.data.Genres && data.data.Genres.length > 0 && (
                      <Stat className="item-stat">
                        <Stat.Value>{data.data.Genres[0]}</Stat.Value>
                        <Stat.Label>Genre</Stat.Label>
                      </Stat>
                    )}
                  </HStack>
                </Box>
                <Box alignSelf={"flex-end"}>
                  <ItemListActions items={data.discs.flat()} type="album" parent={data.data} />
                </Box>
              </HStack>
            </HStack.Item>
          </HStack>

          <Spacer height={10} />

          {data.discs.map((discItems, index) => {
            if (!discItems || discItems.length === 0) {
              return null;
            }
            return (
              <Fragment key={index}>
                {data.discs.filter((x) => x != null).length > 1 && (
                  <>
                    <Heading level={4}>Disc {index}</Heading>
                  </>
                )}
                <Spacer height={5} />
                <List bordered hover>
                  {discItems.map((item, index) => (
                    <ItemListEntry
                      item={item}
                      index={index}
                      type="album"
                      allItems={data.discs.flat().map((queueItem) => queueItem.Id).filter((id): id is string => Boolean(id))}
                      parentId={id}
                      key={item.Id}
                    />
                  ))}
                </List>
                <Spacer height={5} />
              </Fragment>
            );
          })}
        </>
      ) : (
        !loading && error && <Fallback icon={errorIcon} text={error} />
      )}
    </>
  );
}
