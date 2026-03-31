import { VStack, Text, Center, Box } from "rsuite";
import Icon from "./Icon";

export default function Fallback({ icon, text }: { icon: string; text: string }) {
  return (
    <Center alignSelf="middle" justify="center" width={"100%"} height={"100%"}>
      <VStack spacing={0}>
        <Box alignSelf="center">
          <Icon icon={icon} style={{ fontSize: "100px" }} />
        </Box>
        <Text weight="bold" size="lg" align="center">
          {text}
        </Text>
      </VStack>
    </Center>
  );
}
