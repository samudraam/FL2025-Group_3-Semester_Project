import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomNavPill from '../../components/BottomNavPill';
import { HomeIcon, RankingsIcon, CommunityIcon, CourtsIcon } from '../../components/NavIcons';
import { router } from 'expo-router';

/**
 * Courts screen - displays a map with user's current location
 */
export default function Courts() {
    const [activeTab, setActiveTab] = useState('courts');
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    /**
     * Default location (St Louis) as fallback
     */
    const defaultRegion = {
        latitude: 38.6270,
        longitude: -90.1994,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };
    
    /**
     * Get user's current location on component mount
     */
    useEffect(() => {
        (async () => {
            try {
                // Request location permissions
                const { status } = await Location.requestForegroundPermissionsAsync();
                
                if (status !== 'granted') {
                    setErrorMsg('Permission to access location was denied');
                    setLoading(false);
                    return;
                }

                // Get current position
                const currentLocation = await Location.getCurrentPositionAsync({});
                setLocation(currentLocation);
                setErrorMsg(null);
            } catch (error) {
                console.error('Error getting location:', error);
                setErrorMsg('Unable to get your current location');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    /**
     * Handle tab navigation
     */
    const handleTabPress = (tabId: string) => {
        setActiveTab(tabId);
        
        switch (tabId) {
            case 'home':
                router.replace('/tabs');
                break;
            case 'rankings':
                router.replace('/tabs/rankings');
                break;
            case 'community':
                router.replace('/tabs/community');
                break;
            case 'courts':
                router.replace('/tabs/courts');
                break;
        }
    };

    const navItems = [
        { id: 'home', label: 'home', icon: <HomeIcon /> },
        { id: 'rankings', label: 'rankings', icon: <RankingsIcon /> },
        { id: 'community', label: 'community', icon: <CommunityIcon /> },
        { id: 'courts', label: 'courts', icon: <CourtsIcon /> },
    ];

    /**
     * Get the map region based on user location or default
     */
    const getMapRegion = () => {
        if (location) {
            return {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
            };
        }
        return defaultRegion;
    };

    return (
        <View style={styles.container}>
            {/* Map View */}
            <MapView
                style={styles.map}
                initialRegion={getMapRegion()}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                showsScale={true}
                mapType="standard"
            >
                {/* User location marker if available */}
                {location && (
                    <Marker
                        coordinate={{
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude,
                        }}
                        title="Your Location"
                        description="You are here"
                        pinColor="#0E5B37"
                    />
                )}
            </MapView>

            {/* Loading or Error Overlay */}
            {loading && (
                <View style={styles.overlay}>
                    <Text style={styles.loadingText}>Getting your location...</Text>
                </View>
            )}

            {errorMsg && (
                <View style={styles.overlay}>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            )}
            
            <BottomNavPill 
                items={navItems}
                activeTab={activeTab}
                onTabPress={handleTabPress}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    map: {
        flex: 1,
        marginBottom: 100, // Space for bottom navigation
    },
    overlay: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        fontFamily: 'DMSans_600SemiBold',
        color: '#0E5B37',
    },
    errorText: {
        fontSize: 14,
        fontFamily: 'DMSans_400Regular',
        color: '#FF4444',
        textAlign: 'center',
    },
});
