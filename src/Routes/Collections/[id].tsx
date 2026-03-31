import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Heading, Grid, Row, VStack } from "rsuite";
import ItemTile from "../../Components/ItemTile";
import { getItems } from "../../Client";
import type { BaseItemDtoQueryResult } from "../../Client/index";
import { useAppDispatch } from "../../store/hooks";
import { setLoading } from "../../store/slices/loadingSlice";

export default function Collection() {
  const { id } = useParams();

  const [items, setItems] = useState<BaseItemDtoQueryResult | null>(null);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(setLoading(true));
    const fetchCollectionItems = async () => {
      const itemsResponse = await getItems({
        query: {
          parentId: id,
          fields: ["ItemCounts", "PrimaryImageAspectRatio", "CanDelete"]
        }
      });

      setItems(itemsResponse.data!);

      dispatch(setLoading(false));
    };

    fetchCollectionItems();
  }, [id]);

  return (
    <>
      {items && items.Items ? (
        <VStack spacing={10}>
          <Heading level={3}>Albums</Heading>
          <Grid fluid width={"100%"}>
            <Row gutter={16}>
              {items.Items.map((item, index) => (
                <ItemTile
                  item={item}
                  tileProps={{
                    onClick: () => {
                      location.hash = "#albums/" + item.Id;
                    },
                    className: "pointer"
                  }}
                />
              ))}
            </Row>
          </Grid>
        </VStack>
      ) : (
        ""
      )}
    </>
  );
}
