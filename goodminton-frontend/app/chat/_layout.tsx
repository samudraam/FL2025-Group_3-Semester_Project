import { Stack } from "expo-router";

export default function MessagesLayout() {
  return (
    <Stack screenOptions={{ animation: "slide_from_right" }}>
      <Stack.Screen
        name="messages"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="conversation"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
