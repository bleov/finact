import { Avatar, Button, Checkbox, CheckboxGroup, Form, HStack, List, Modal, Placeholder, Text, VStack } from "rsuite";
import { getUser, GlobalState } from "../App";
import { useContext, useEffect, useState } from "react";
import { getLibrary } from "../Util/Network";
import { getStorage } from "../storage";
import { errorNotification, successNotification } from "../Util/Toaster";
import { pluralize } from "../Util/Formatting";
import Icon from "./Icon";
import { addItemToPlaylist, addToCollection, createCollection, createPlaylist, getItems } from "../Client";
import type { BaseItemDto } from "../Client";

const storage = getStorage();

export default function AddItem({ item, type }: { item: BaseItemDto | null; type: string }) {
  const { setAddItem, toaster } = useContext(GlobalState);
  const [items, setItems] = useState<BaseItemDto[] | null>(null);
  const [error, setError] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  async function fetchItems() {
    if (!item) return;
    try {
      const library = await getLibrary(type == "playlist" ? "playlists" : "boxsets");

      const itemsRequest = await getItems({
        query: {
          userId: getUser()?.Id,
          startIndex: 0,
          limit: 100,
          fields: ["PrimaryImageAspectRatio", "SortName", "Path", "ChildCount"],
          imageTypeLimit: 1,
          parentId: library.Id,
          sortBy: ["IsFolder", "SortName"],
          sortOrder: ["Ascending"]
        }
      });

      const response = itemsRequest.data!;
      setItems(response.Items!);
    } catch (err) {
      console.error(err);
      setError(true);
    }
  }

  useEffect(() => {
    fetchItems();
  }, [item]);

  return (
    <Modal
      open={!!item}
      onClose={() => {
        setAddItem(null);
      }}
      onExited={() => {
        setCurrentPage(0);
        setItems(null);
        setError(false);
      }}
    >
      {currentPage == 0 ? (
        <>
          <Modal.Header>
            <Modal.Title>Add to {type == "playlist" ? "Playlist" : "Collection"}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {items ? (
              <>
                <List bordered hover className="pointer">
                  <List.Item
                    key="create"
                    onClick={() => {
                      setCurrentPage(1);
                    }}
                  >
                    <HStack spacing={10}>
                      <Avatar>
                        <Icon icon={"playlist_add"} noSpace />
                      </Avatar>
                      <Text>New {type}</Text>
                    </HStack>
                  </List.Item>
                  {items.map((parentItem) => {
                    return (
                      <List.Item
                        key={parentItem.Id}
                        onClick={async () => {
                          setAddItem(null);
                          try {
                            if (type === "playlist") {
                              await addItemToPlaylist({
                                path: { playlistId: parentItem.Id! },
                                query: { ids: [item?.Id!], userId: getUser()?.Id }
                              });
                            } else if (type === "collection") {
                              await addToCollection({
                                path: { collectionId: parentItem.Id! },
                                query: { ids: [item?.Id!] }
                              });
                            }
                          } catch (e) {
                            toaster.push(
                              errorNotification(
                                "Failed to add to " + type,
                                e.toString().includes("Forbidden")
                                  ? "You do not have permission to add items to this " + type + "."
                                  : e.toString()
                              )
                            );
                            return;
                          }
                          toaster.push(
                            successNotification("Added to " + type, `${item?.Name} has been added to ${parentItem.Name}.`, {
                              onClick: () => (window.location.hash = `#${type}s/${parentItem.Id}`),
                              className: "pointer"
                            })
                          );
                        }}
                      >
                        <HStack spacing={10}>
                          <Avatar src={`${storage.get("serverURL")}/Items/${parentItem.Id}/Images/Primary`} />
                          <VStack spacing={0}>
                            <Text>{parentItem.Name}</Text>
                            <Text muted>
                              {parentItem.ChildCount} {pluralize(parentItem.ChildCount!, "item")}
                            </Text>
                          </VStack>
                        </HStack>
                      </List.Item>
                    );
                  })}
                </List>
              </>
            ) : !error ? (
              <Placeholder.Paragraph graph="square" active />
            ) : (
              <Text>No {type}s yet</Text>
            )}
          </Modal.Body>
        </>
      ) : (
        <>
          <Modal.Header>
            <Modal.Title>Create New {type == "playlist" ? "Playlist" : "Collection"}</Modal.Title>
          </Modal.Header>
          <Form
            onSubmit={async (input) => {
              if (!input) return;
              if (!input.name) return;
              let isPublic = false;
              if (input.public && input.public.length > 0) {
                isPublic = input.public.includes(1);
              }
              let isLocked = false;
              if (input.locked && input.locked.length > 0) {
                isLocked = input.locked.includes(1);
              }
              if (type == "playlist") {
                const user = await getUser();
                if (!user) return;
                const newPlaylistRequest = await createPlaylist({
                  body: {
                    Name: input.name,
                    UserId: user.Id,
                    IsPublic: isPublic,
                    Ids: [item?.Id!]
                  }
                });
                const response = newPlaylistRequest.response;
                setAddItem(null);
                if (!response.ok) {
                  toaster.push(
                    errorNotification(
                      "Failed to create playlist",
                      response.statusText == "Forbidden" ? "You do not have permission to create playlists" : response.statusText
                    )
                  );
                  const json = newPlaylistRequest.data;
                  console.error(json);
                  return;
                }
                const responseData = newPlaylistRequest.data;
                if (!responseData || !responseData.Id) {
                  toaster.push(errorNotification("Failed to create playlist", "An unknown error occurred"));
                  return;
                }
                toaster.push(
                  successNotification("Playlist created", `${input.name} has been created successfully.`, {
                    onClick: () => (window.location.hash = `#playlists/${responseData.Id}`),
                    className: "pointer"
                  })
                );
              } else if (type == "collection") {
                const newCollectionRequest = await createCollection({
                  query: {
                    ids: [item?.Id!],
                    isLocked: isLocked,
                    name: input.name
                  }
                });

                setAddItem(null);

                const response = newCollectionRequest.response;
                const responseData = newCollectionRequest.data;

                if (!response.ok) {
                  toaster.push(
                    errorNotification(
                      "Failed to create collection",
                      response.statusText == "Forbidden" ? "You do not have permission to create collections" : response.statusText
                    )
                  );
                  console.error(responseData);
                  return;
                }

                if (!responseData || !responseData.Id) {
                  toaster.push(errorNotification("Failed to create collection", "An unknown error occurred"));
                  return;
                }

                toaster.push(
                  successNotification("Collection created", `${input.name} has been created successfully.`, {
                    onClick: () => (window.location.hash = `#collections/${responseData.Id}`),
                    className: "pointer"
                  })
                );
              }
            }}
            fluid
          >
            <Modal.Body width={"100%"}>
              <VStack spacing={10}>
                <Form.Group>
                  <Form.Label>Name</Form.Label>
                  <Form.Control defaultValue={""} name="name" required></Form.Control>
                </Form.Group>
                <Form.Group>
                  {type == "playlist" ? (
                    <>
                      <Form.Control accepter={CheckboxGroup} name="public">
                        <Checkbox value={1}>Allow Public Access</Checkbox>
                      </Form.Control>
                      <Form.Text>Make this playlist visible to all logged in users</Form.Text>
                    </>
                  ) : (
                    <>
                      <Form.Control accepter={CheckboxGroup} name="locked">
                        <Checkbox value={1}>Lock Collection Metadata</Checkbox>
                      </Form.Control>
                      <Form.Text>Don't search the internet for metadata and images</Form.Text>
                    </>
                  )}
                </Form.Group>
              </VStack>
            </Modal.Body>
            <Modal.Footer width={"100%"}>
              <HStack width={"100%"} justify={"space-between"}>
                <Button
                  type="reset"
                  onClick={() => {
                    setCurrentPage(0);
                  }}
                >
                  Back
                </Button>
                <Button appearance="primary" type="submit">
                  Create
                </Button>
              </HStack>
            </Modal.Footer>
          </Form>
        </>
      )}
    </Modal>
  );
}
