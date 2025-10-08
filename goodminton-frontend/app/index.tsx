//SPLASH SCREEN

import React from "react";
import { View, Text, Image, StyleSheet, StatusBar } from "react-native";
import { useEffect } from "react";
import { router } from "expo-router";

export default function Splash() {

    // this takes us to login
    useEffect(() => {
        const t = setTimeout(() => router.replace("/auth/login"), 1000);
        return () => clearTimeout(t);
    }, []);

    return (
        <View style={s.container}>
            <StatusBar barStyle="dark-content" />
            <Image
                source={require("../assets/court.png")}
                style={s.court}
                resizeMode="contain"
            />

            <View>
                <Text
                    style={s.brand}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                >
                    <Text style={s.good}>good</Text>
                    <Text style={s.minton}> minton</Text>
                </Text>
            </View>

        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingHorizontal: 24
    },
    // Position court
    court: {
        position: "absolute",
        left: -55,
        top: -275,
        height: "180%",
        aspectRatio: 1,
        opacity: 1,
        pointerEvents: "none"
    },
    brand: {
        right: -10,
        top: "-40%",
        fontSize: 50,
        fontFamily: "DMSans_400Regular",
        letterSpacing: 4
    },
    good: { color: "#0A5A35" },
    minton: { color: "#FFFFFF" }
});
