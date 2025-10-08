import { Stack } from 'expo-router';

export default function TabLayout() {
    return (
        <Stack screenOptions={{ headerShown: false, animation: "fade"  }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="rankings" />
            <Stack.Screen name="community" />
            <Stack.Screen name="courts" />
        </Stack>
    );
}
