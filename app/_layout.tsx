import { Stack } from "expo-router";

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                contentStyle: {
                    backgroundColor: "#0E5B37"
                },
                headerShown: false,
            }}
        >
        </Stack>
    );
}