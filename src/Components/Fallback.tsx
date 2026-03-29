import { VStack, Text, Col, Row } from "rsuite";
import Icon from "./Icon";

export default function Fallback({ icon, text }: { icon: string; text: string }) {
  return (
    <Row align="middle" justify="center" style={{ width: "100%", height: "100%" }}>
      <VStack spacing={0}>
        <VStack.Item self="center">
          <Icon icon={icon} style={{ fontSize: "100px" }} />
        </VStack.Item>
        <Text weight="bold" size={"lg"} style={{ textAlign: "center" }}>
          {text}
        </Text>
      </VStack>
    </Row>
  );
}
