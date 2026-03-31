import { useEffect, useState } from "react";
import { Grid, Heading, Row, VStack } from "rsuite";
import { getLibrary } from "../Util/Network";
import { getUser } from "../App";
import ItemTile from "../Components/ItemTile";
import Fallback from "../Components/Fallback";
import { getItems } from "../Client";
import type { BaseItemDto, BaseItemKind, BaseItemDtoQueryResult } from "../Client/index";
import { useAppDispatch } from "../store/hooks";
import { setLoading } from "../store/slices/loadingSlice";

export default function Playlists() {
  const [playlists, setPlaylists] = useState<BaseItemDtoQueryResult | null>(null);
  const dispatch = useAppDispatch();
  const [error, setError] = useState("");
  const [errorIcon, setErrorIcon] = useState("apps_outage");

  useEffect(() => {
    function handleError(err: Error) {
      console.error(err);

      dispatch(setLoading(false));

      if (err.toString().includes("not found")) {
        setError("No playlists yet");
        setErrorIcon("search_off");
      } else if (err.toString().includes("NetworkError")) {
        setError("Network error");
        setErrorIcon("wifi_off");
      } else {
        setError("Failed to load playlists");
      }
    }

    dispatch(setLoading(true));
    getLibrary("playlists")
      .then((playlistsLibrary) => {
        getItems({
          query: {
            userId: getUser()?.Id,
            startIndex: 0,
            limit: 100,
            fields: ["PrimaryImageAspectRatio", "SortName", "Path", "ChildCount"],
            imageTypeLimit: 1,
            parentId: playlistsLibrary.Id,
            sortBy: ["IsFolder", "SortName"]
          }
        }).then((playlistsResponse) => {
          setPlaylists(playlistsResponse.data!);
          dispatch(setLoading(false));
        });
      })
      .catch(handleError);
  }, []);

  return (
    <>
      {playlists && playlists.Items ? (
        <VStack spacing={10}>
          <Heading level={3}>Playlists</Heading>
          <Grid fluid width={"100%"}>
            <Row gutter={16}>
              {playlists.Items.map((item, index) => (
                <ItemTile
                  item={item}
                  key={item.Id}
                  tileProps={{ onClick: () => (window.location.hash = `#playlists/${item.Id}`), className: "pointer" }}
                />
              ))}
            </Row>
          </Grid>
        </VStack>
      ) : (
        error && <Fallback icon={errorIcon} text={error} />
      )}
    </>
  );
}
