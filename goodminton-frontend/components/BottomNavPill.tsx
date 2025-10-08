import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

/**
 * Navigation item interface for the bottom navigation pill
 */
interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    activeIcon?: React.ReactNode;
}

/**
 * Props for the BottomNavPill component
 */
interface BottomNavPillProps {
    items: NavItem[];
    activeTab: string;
    onTabPress: (tabId: string) => void;
}

export default function BottomNavPill({ items, activeTab, onTabPress }: BottomNavPillProps) {
    return (
        <View style={s.container}>
            <View style={s.pill}>
                {items.map((item, index) => {
                    const isActive = activeTab === item.id;
                    
                    return (
                        <Pressable
                            key={item.id}
                            onPress={() => onTabPress(item.id)}
                            style={({ pressed }) => [
                                s.navItem,
                                isActive && s.activeNavItem,
                                { opacity: pressed ? 0.8 : 1 }
                            ]}
                        >
                            <View style={s.iconContainer}>
                                {isActive && item.activeIcon ? item.activeIcon : item.icon}
                            </View>
                            <Text style={[
                                s.label,
                                isActive && s.activeLabel
                            ]}>
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'transparent',
    },
    pill: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        borderRadius: 25,
        padding: 4,
        borderWidth: 1,
        borderColor: '#E3F2FD',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 21,
        backgroundColor: 'transparent',
    },
    activeNavItem: {
        backgroundColor: '#A8DADB', // active state
    },
    iconContainer: {
        marginBottom: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 12,
        fontFamily: 'DMSans_500Medium',
        color: '#0E5B37', // Dark green text
        textAlign: 'center',
    },
    activeLabel: {
        fontFamily: 'DMSans_600SemiBold',
        color: '#0E5B37', // Dark green text 
    },
});
