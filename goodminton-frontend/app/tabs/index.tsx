import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAuth } from '../../services/authContext';
import { router } from 'expo-router';

export default function Home() {
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        router.replace('/auth/login');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome to Goodminton!</Text>
            <Text style={styles.subtitle}>Hello, {user?.profile?.displayName || user?.email}!</Text>
            
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontFamily: 'DMSans_700Bold',
        color: '#0E5B37',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
        marginBottom: 30,
    },
    logoutButton: {
        backgroundColor: '#0E5B37',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    logoutText: {
        color: 'white',
        fontFamily: 'DMSans_600SemiBold',
    },
});
