import React from 'react';
import { View, StyleSheet, Image, ImageSourcePropType } from 'react-native';

/**
 * icons for navigation items
*/

/**
 * Home icon - PNG image
 */
export const HomeIcon = ({ size = 35, color = '#0E5B37' }: { size?: number; color?: string }) => (
    <Image 
        source={require('../assets/BottomNavIcons/home.png')} 
        style={{ width: size, height: size }}
        resizeMode="contain"
    />
);

/**
 * Rankings icon - PNG image
 */
export const RankingsIcon = ({ size = 35, color = '#0E5B37' }: { size?: number; color?: string }) => (
    <Image 
        source={require('../assets/BottomNavIcons/podium.png')} 
        style={{ width: size, height: size }}
        resizeMode="contain"
    />
);

/**
 * Community icon - PNG image
 */
export const CommunityIcon = ({ size = 35, color = '#0E5B37' }: { size?: number; color?: string }) => (
    <Image 
        source={require('../assets/BottomNavIcons/community.png')} 
        style={{ width: size, height: size }}
        resizeMode="contain"
    />
);

/**
 * Courts icon - PNG image
 */
export const CourtsIcon = ({ size = 35, color = '#0E5B37' }: { size?: number; color?: string }) => (
    <Image 
        source={require('../assets/BottomNavIcons/court.png')} 
        style={{ width: size, height: size }}
        resizeMode="contain"
    />
);

/**
 * Settings gear icon
 */
export const SettingsIcon = ({ size = 30, color = '#0E5B37' }: { size?: number; color?: string }) => (
    <Image 
        source={require('../assets/settings.png')} 
        style={{ width: size, height: size }}
        resizeMode="contain"
    />
);

/**
 * Bell notification icon
 */
export const BellIcon = ({ size = 30, color = '#F5A623' }: { size?: number; color?: string }) => (
    <Image 
        source={require('../assets/bell.png')} 
        style={{ width: size, height: size }}
        resizeMode="contain"
    />
);

const s = StyleSheet.create({
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    
});
