import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router";
import { Heading, List, HStack, Avatar, Text, Stat, FlexboxGrid, Image, VStack, Box } from "rsuite";
import { getUser, GlobalState } from "../../App";
import { formatSeconds } from "../../Util/Formatting";
import { getStorage } from "../../storage";
import Spacer from "../../Components/Spacer";
import { ItemListEntry } from "../../Components/ItemListEntry";
import ItemListActions from "../../Components/ItemListActions";
import { getItem, getItems } from "../../Client/index";
import type { BaseItemDtoQueryResult, BaseItemDto } from "../../Client/index";
import Icon from "../../Components/Icon";

const storage = getStorage();

export default function Playlist() {
  const { id } = useParams();

  const [data, setData] = useState<{
    data: BaseItemDto;
    items: BaseItemDtoQueryResult;
  } | null>(null);

  const { loading, setLoading } = useContext(GlobalState);

  const fetchPlaylistData = async () => {
    const responses = await Promise.all([
      getItem({
        path: { itemId: id! },
        query: { userId: getUser()?.Id }
      }),
      getItems({
        query: {
          parentId: id,
          fields: ["ItemCounts", "PrimaryImageAspectRatio", "CanDelete"]
        }
      })
    ]);
    setData({ data: responses[0].data!, items: responses[1].data! });
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchPlaylistData();
  }, [id]);

  return (
    <>
      {data && data.data && data.items ? (
        <>
          <HStack spacing={14} wrap>
            <Image height={128} rounded bordered src={`${storage.get("serverURL")}/Items/${id}/Images/Primary`} />
            <VStack flexGrow={2}>
              <Heading level={3} marginLeft={10}>
                {data.data.Name}
              </Heading>
              <HStack spacing={10} justify={"space-between"} width={"100%"} wrap>
                <HStack spacing={5} flexGrow={2} wrap>
                  <Stat className="item-stat">
                    <Stat.Value value={data.data.ChildCount!} />
                    <Stat.Label>Tracks</Stat.Label>
                  </Stat>
                  <Stat className="item-stat">
                    <Stat.Value>{formatSeconds(data.data.CumulativeRunTimeTicks! / 10000000, true, false)}</Stat.Value>
                    <Stat.Label>Run Time</Stat.Label>
                  </Stat>
                </HStack>
                <Box alignSelf={"flex-end"}>
                  <ItemListActions items={data.items.Items!} parent={data.data} />
                </Box>
              </HStack>
            </VStack>
          </HStack>
          <Spacer height={15} />
          <List bordered hover>
            {data.items.Items!.map((item, index) => (
              <ItemListEntry
                item={item}
                index={index}
                allItems={data.items.Items}
                type="playlist"
                parentId={id}
                key={item.Id}
                refresh={fetchPlaylistData}
              />
            ))}
          </List>
        </>
      ) : (
        ""
      )}
    </>
  );
}
