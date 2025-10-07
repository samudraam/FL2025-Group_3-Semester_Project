import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ animation: "fade_from_bottom" }}>
            <Stack.Screen 
                name="login" 
                options={{ 
                    headerShown: false 
                }} 
            />
            <Stack.Screen 
                name="signup" 
                options={{ 
                    headerShown: false 
                }} 
            />
            <Stack.Screen 
                name="verify" 
                options={{ 
                    headerShown: false 
                }} 
            />
        </Stack>
    );
}
