import { useEffect, useState } from "react";
import { Grid, Heading, Row, VStack } from "rsuite";
import { getLibrary } from "../Util/Network";
import { getStorage } from "../storage";
import ItemTile from "../Components/ItemTile";
import Fallback from "../Components/Fallback";
import { getItems } from "../Client";
import type { BaseItemDtoQueryResult } from "../Client/index";
import { useAppDispatch } from "../store/hooks";
import { setLoading } from "../store/slices/loadingSlice";

const storage = getStorage();

export default function Collections() {
  const [collections, setCollections] = useState<BaseItemDtoQueryResult | null>(null);
  const dispatch = useAppDispatch();
  const [error, setError] = useState("");
  const [errorIcon, setErrorIcon] = useState("apps_outage");

  useEffect(() => {
    dispatch(setLoading(true));

    getLibrary("boxsets")
      .then((collectionsLibrary) => {
        getItems({
          query: {
            startIndex: 0,
            limit: 100,
            imageTypeLimit: 1,
            parentId: collectionsLibrary.Id,
            fields: ["PrimaryImageAspectRatio", "SortName", "Path", "ChildCount"],
            sortBy: ["IsFolder", "SortName"],
            sortOrder: ["Ascending"]
          }
        }).then((collectionsResponse) => {
          setCollections(collectionsResponse.data!);
          dispatch(setLoading(false));
        });
      })
      .catch((err) => {
        console.error(err);
        dispatch(setLoading(false));
        if (err.toString().includes("not found")) {
          setError("No collections yet");
          setErrorIcon("search_off");
        } else if (err.toString().includes("NetworkError")) {
          setError("Network error");
          setErrorIcon("wifi_off");
        } else {
          setError("Failed to load collections");
        }
      });
  }, []);

  return (
    <>
      {collections && collections.Items ? (
        <VStack spacing={10}>
          <Heading level={3}>Collections</Heading>
          <Grid fluid width={"100%"}>
            <Row gutter={16}>
              {collections.Items.map((item, index) => (
                <ItemTile
                  item={item}
                  tileProps={{ onClick: () => (window.location.hash = `#collections/${item.Id}`), className: "pointer" }}
                  key={item.Id}
                />
              ))}
            </Row>
          </Grid>
        </VStack>
      ) : (
        error && <Fallback text={error} icon={errorIcon} />
      )}
    </>
  );
}
