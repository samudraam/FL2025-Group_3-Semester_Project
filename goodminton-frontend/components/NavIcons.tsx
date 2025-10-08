import React from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * Placeholder icons for navigation items
*/

/**
 * Home icon - simple house shape
 */
export const HomeIcon = ({ size = 20, color = '#0E5B37' }: { size?: number; color?: string }) => (
    <View style={[s.icon, { width: size, height: size }]}>
        <View style={[s.house, { borderColor: color }]} />
        <View style={[s.roof, { borderBottomColor: color }]} />
    </View>
);

/**
 * Rankings icon - podium with star
 */
export const RankingsIcon = ({ size = 20, color = '#0E5B37' }: { size?: number; color?: string }) => (
    <View style={[s.icon, { width: size, height: size }]}>
        {/* Podium steps */}
        <View style={[s.podiumLeft, { backgroundColor: color }]} />
        <View style={[s.podiumCenter, { backgroundColor: color }]} />
        <View style={[s.podiumRight, { backgroundColor: color }]} />
        {/* Star */}
        <View style={[s.star, { backgroundColor: '#FFD700' }]} />
    </View>
);

/**
 * Community icon - people with heart
 */
export const CommunityIcon = ({ size = 20, color = '#0E5B37' }: { size?: number; color?: string }) => (
    <View style={[s.icon, { width: size, height: size }]}>
        {/* People */}
        <View style={[s.personLeft, { backgroundColor: color }]} />
        <View style={[s.personCenter, { backgroundColor: color }]} />
        <View style={[s.personRight, { backgroundColor: color }]} />
        {/* Heart */}
        <View style={[s.heart, { backgroundColor: '#FFD700' }]} />
    </View>
);

/**
 * Courts icon - court with net
 */
export const CourtsIcon = ({ size = 20, color = '#0E5B37' }: { size?: number; color?: string }) => (
    <View style={[s.icon, { width: size, height: size }]}>
        {/* Court */}
        <View style={[s.court, { borderColor: color }]} />
        {/* Net */}
        <View style={[s.net, { backgroundColor: '#FFD700' }]} />
        {/* Grid lines */}
        <View style={[s.gridLine1, { backgroundColor: 'white' }]} />
        <View style={[s.gridLine2, { backgroundColor: 'white' }]} />
    </View>
);

const s = StyleSheet.create({
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    
    // Home icon styles
    house: {
        width: 14,
        height: 10,
        borderWidth: 2,
        borderTopWidth: 0,
        backgroundColor: 'transparent',
    },
    roof: {
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderBottomWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -8,
    },
    
    // Rankings icon styles
    podiumLeft: {
        position: 'absolute',
        bottom: 2,
        left: 2,
        width: 4,
        height: 6,
    },
    podiumCenter: {
        position: 'absolute',
        bottom: 2,
        left: 8,
        width: 4,
        height: 10,
    },
    podiumRight: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 4,
        height: 6,
    },
    star: {
        position: 'absolute',
        top: -2,
        left: 8,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    
    // Community icon styles
    personLeft: {
        position: 'absolute',
        bottom: 2,
        left: 2,
        width: 3,
        height: 6,
        borderRadius: 1.5,
    },
    personCenter: {
        position: 'absolute',
        bottom: 2,
        left: 8.5,
        width: 3,
        height: 5,
        borderRadius: 1.5,
    },
    personRight: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 3,
        height: 6,
        borderRadius: 1.5,
    },
    heart: {
        position: 'absolute',
        top: -2,
        left: 7,
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    
    // Courts icon styles
    court: {
        width: 16,
        height: 10,
        borderWidth: 2,
        backgroundColor: 'transparent',
    },
    net: {
        position: 'absolute',
        top: 3,
        left: 6,
        width: 4,
        height: 1,
    },
    gridLine1: {
        position: 'absolute',
        top: 2,
        left: 4,
        width: 8,
        height: 0.5,
    },
    gridLine2: {
        position: 'absolute',
        top: 6,
        left: 4,
        width: 8,
        height: 0.5,
    },
});
