import { Stack } from "expo-router";
import { AuthProvider } from "../services/authContext";

export default function AuthLayout() {
    return (
        <AuthProvider>
            <Stack screenOptions={{ animation: "fade" }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="tabs" options={{ headerShown: false }} />
            </Stack>
        </AuthProvider>
    );
}