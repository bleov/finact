import { Box } from "rsuite";

export default function Spacer({ height = 0, width = 0 }: { height?: number; width?: number }) {
  return <Box className="spacer" height={height} width={width} />;
}
