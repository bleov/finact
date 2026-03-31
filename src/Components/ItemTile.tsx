import { Col, Image, Text } from "rsuite";
import { getStorage } from "../storage";
import { Blurhash } from "react-blurhash";
import { getAlbumArt } from "../Util/Formatting";
import ItemContextMenu from "./ItemContextMenu";
import React, { useState } from "react";
import { BaseItemDto } from "../Client";

const storage = getStorage();

const getColSize = () => ({
  xs: 12,
  sm: 8,
  md: 6,
  lg: 4,
  xl: 3
});

const squareStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  paddingTop: "100%", // 1:1 aspect ratio
  marginBottom: "3px",
  borderRadius: "6px",
  overflow: "hidden"
};

const contentStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold"
};

export default function ItemTile(props: { item: BaseItemDto; tileProps?: React.HTMLAttributes<HTMLElement> }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);

  return (
    <>
      <ItemContextMenu
        controlled
        state={menuOpen ? "open" : "closed"}
        onClose={() => setMenuOpen(false)}
        anchorPoint={anchorPoint ?? { x: 0, y: 0 }}
        item={props.item}
      />
      <Col
        key={props.item.Id}
        {...getColSize()}
        marginBottom={5}
        {...props.tileProps}
        onContextMenu={(e) => {
          e.preventDefault();
          if (props.item.Type === "BoxSet") return;
          setMenuOpen(true);
          setAnchorPoint({ x: e.clientX, y: e.clientY });
        }}
      >
        <div style={squareStyle}>
          <div style={contentStyle}>
            {typeof props.item.ImageBlurHashes == "object" && props.item.ImageBlurHashes && props.item.ImageBlurHashes.Primary && (
              <Blurhash
                hash={props.item.ImageBlurHashes.Primary[Object.keys(props.item.ImageBlurHashes.Primary)[0]]}
                width={"100%"}
                height={"100%"}
              />
            )}
            <Image
              visibility={"hidden"}
              position={"absolute"}
              backgroundColor={"var(--rs-body)"}
              onLoad={(e) => {
                (e.target as HTMLElement).style.visibility = "visible";
              }}
              draggable={false}
              src={
                props.item.Type == "Audio" ? getAlbumArt(props.item) : `${storage.get("serverURL")}/Items/${props.item.Id}/Images/Primary`
              }
            />
          </div>
        </div>
        <Text whiteSpace={"nowrap"} overflow={"hidden"} textOverflow={"ellipsis"} align="center">
          {props.item.Name}
        </Text>
      </Col>
    </>
  );
}
