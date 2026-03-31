import { Header, Navbar, Nav, Avatar, Image, Drawer, Sidenav, HStack } from "rsuite";
import { getStorage, getCacheStorage } from "../storage";
import { Menu, MenuItem } from "@szhsin/react-menu";
import Icon from "./Icon";
import { getUser } from "../App";
import { useMediaQuery } from "rsuite/esm/useMediaQuery/useMediaQuery";
import { useState } from "react";
import { isElectron } from "../Util/Helpers";
import localforage from "localforage";
import { reportSessionEnded, UserDto } from "../Client";

const storage = getStorage();
const cacheStorage = getCacheStorage();

export default function MainHeader(props: { user: UserDto | null }) {
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const [logoEasterEgg, setLogoEasterEgg] = useState(false);

  function closeSideNav() {
    if (sideNavOpen) {
      setSideNavOpen(false);
    }
  }

  function LibraryNavigation() {
    return (
      <>
        <Nav.Item
          href="#"
          onClick={() => {
            closeSideNav();
            location.hash = "#";
          }}
          icon={<Icon icon="home" />}
        >
          Home
        </Nav.Item>
        <Nav.Item href="#playlists" onClick={closeSideNav} icon={<Icon icon="video_library" />}>
          Playlists
        </Nav.Item>
        <Nav.Item href="#collections" onClick={closeSideNav} icon={<Icon icon="photo_library" />}>
          Collections
        </Nav.Item>
      </>
    );
  }
  return (
    <Header>
      <Drawer open={sideNavOpen} onClose={() => setSideNavOpen(false)} placement="left" size={"65vw"}>
        <Drawer.Header>
          <Drawer.Title>
            <Image src="finact.png" style={{ height: "1em", marginRight: "5px" }} />
            {Math.random() < 0.001 ? "Fincat" : "Finact"}
          </Drawer.Title>
        </Drawer.Header>

        <Drawer.Body style={{ paddingInline: 0, paddingTop: 5 }}>
          <Sidenav appearance="subtle">
            <Sidenav.Body>
              <Nav>
                <LibraryNavigation />
              </Nav>
            </Sidenav.Body>
          </Sidenav>
        </Drawer.Body>
      </Drawer>
      <Navbar>
        <Navbar.Content showFrom="xs">
          <Navbar.Brand>
            <HStack>
              <Image
                src="finact.png"
                style={{ height: "1.5em" }}
                className={logoEasterEgg ? "spin" : ""}
                onClick={(e) => {
                  if (logoEasterEgg) return;
                  setLogoEasterEgg(true);
                  setTimeout(() => {
                    setLogoEasterEgg(false);
                  }, 600);
                }}
              />
              <span>Finact</span>
            </HStack>
          </Navbar.Brand>
          <Nav>{props.user ? <LibraryNavigation /> : ""}</Nav>
        </Navbar.Content>
        <Navbar.Content hideFrom="xs">
          <Nav>
            <Nav.Item onClick={() => setSideNavOpen(!sideNavOpen)}>
              <Icon icon="menu" noSpace />
            </Nav.Item>
          </Nav>
        </Navbar.Content>

        <Navbar.Content alignSelf={"end"}>
          <Nav>
            {props.user ? (
              <>
                <Nav.Item as="a" href="#search">
                  <Icon icon="search" noSpace />
                </Nav.Item>
                <Menu
                  align="end"
                  menuButton={
                    <Nav.Item title="Profile">
                      <Avatar circle size="sm" src={`${storage.get("serverURL")}/Users/${props.user.Id}/Images/Primary`} />
                    </Nav.Item>
                  }
                  transition
                  theming="dark"
                >
                  <MenuItem href={`${storage.get("serverURL")}/web/#/mypreferencesmenu.html`} target="_blank">
                    <Icon icon="account_circle" />
                    User Settings
                  </MenuItem>
                  {getUser()?.Policy?.IsAdministrator && (
                    <MenuItem href={`${storage.get("serverURL")}/web/#/dashboard`} target="_blank">
                      <Icon icon="dashboard" />
                      Dashboard
                    </MenuItem>
                  )}
                  <MenuItem
                    onClick={async () => {
                      await reportSessionEnded();
                      storage.clearAll();
                      cacheStorage.clearAll();
                      localforage.clear();
                      window.location.reload();
                    }}
                  >
                    <Icon icon="logout" />
                    Sign out
                  </MenuItem>
                  {isElectron && (
                    // @ts-ignore
                    <MenuItem onClick={() => window.electron!.sendMessage(JSON.stringify({ type: "quit" }))}>
                      <Icon icon="close" />
                      Quit
                    </MenuItem>
                  )}
                </Menu>
              </>
            ) : (
              ""
            )}
          </Nav>
        </Navbar.Content>
      </Navbar>
    </Header>
  );
}
