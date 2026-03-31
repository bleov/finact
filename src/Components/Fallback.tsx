import { VStack, Text, Center } from "rsuite";
import Icon from "./Icon";

export default function Fallback({ icon, text }: { icon: string; text: string }) {
  return (
    <Center align="middle" justify="center" style={{ width: "100%", height: "100%" }}>
      <VStack spacing={0}>
        <VStack.Item alignSelf="center">
          <Icon icon={icon} style={{ fontSize: "100px" }} />
        </VStack.Item>
        <Text weight="bold" size={"lg"} style={{ textAlign: "center" }}>
          {text}
        </Text>
      </VStack>
    </Center>
  );
}
