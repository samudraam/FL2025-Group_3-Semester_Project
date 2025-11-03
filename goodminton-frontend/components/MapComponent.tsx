import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface MapComponentProps {
    location: any;
    getMapRegion: () => any;
}

/**
 * Platform-specific map component
 * Shows native maps on mobile, placeholder on web
 */
export default function MapComponent({ location, getMapRegion }: MapComponentProps) {
    if (Platform.OS === 'web') {
        return (
            <View style={styles.map}>
                <Text style={styles.webMapText}>Map View</Text>
                <Text style={styles.webMapSubtext}>
                    {location 
                        ? `Your location: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
                        : 'Location not available'
                    }
                </Text>
            </View>
        );
    }

    // For native platforms, use a simple view for now
    // TODO: Implement native maps when needed
    return (
        <View style={styles.map}>
            <Text style={styles.webMapText}>Native Map View</Text>
            <Text style={styles.webMapSubtext}>
                {location 
                    ? `Your location: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`
                    : 'Location not available'
                }
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    map: {
        flex: 1,
        marginBottom: -110, 
    },
    webMapText: {
        fontSize: 24,
        fontFamily: 'DMSans_600SemiBold',
        color: '#0E5B37',
        textAlign: 'center',
        marginTop: 100,
    },
    webMapSubtext: {
        fontSize: 16,
        fontFamily: 'DMSans_400Regular',
        color: '#666',
        textAlign: 'center',
        marginTop: 20,
    },
});
