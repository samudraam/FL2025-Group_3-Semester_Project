import { Stack } from "expo-router";

export default function CommunitiesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Screen name="[slug]" />
    </Stack>
  );
}
