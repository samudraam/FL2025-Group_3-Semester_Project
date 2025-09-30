import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    ScrollView,
    StatusBar, 
} from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Login() {

    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");

    // pw must be at least 6 characters
    const canSubmit = email.trim().length > 0 && pw.length >= 6;

    const onLogin = async () => {
        // TODO: authenticate user here
        console.log("login pressed", { email, pw });
    };

    return (
        <SafeAreaView style={s.container} edges={["top", "bottom", "left", "right"]}>

            <StatusBar barStyle="light-content" backgroundColor="#0E5B37" />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.select({ ios: "padding" })}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* HERO SECTION*/}
                    <View style={s.hero}>
                        <Text style={s.hello}>Hello!</Text>
                        <Text style={s.sub}>Welcome to goodminton.</Text>
                    </View>

                    {/* CARD */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Login</Text>

                        <TextInput
                            placeholder="Email"
                            placeholderTextColor="#A9A9A9"
                            style={s.input}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="emailAddress"
                        />

                        <TextInput
                            placeholder="Password"
                            placeholderTextColor="#A9A9A9"
                            style={s.input}
                            value={pw}
                            onChangeText={setPw}
                            secureTextEntry
                            textContentType="password"
                        />

                        <View style={s.rowEnd}>
                            <Link href="/auth/forgot-password">
                                <Text style={s.link}>Forgot Password?</Text>
                            </Link>
                        </View>


                        {/* Button for login */}
                        <Pressable
                            onPress={onLogin}
                            disabled={!canSubmit}
                            style={({ pressed }) => [
                                s.primaryBtn,
                                { opacity: !canSubmit ? 0.5 : pressed ? 0.9 : 1 },
                            ]}
                        >
                            <Text style={s.primaryText}>Log In</Text>
                        </Pressable>
                    </View>

                    {/* FOOTER */}
                    <View style={s.footer}>
                        <Text style={s.footerText}>Don’t have an account? </Text>
                        <Link href="/auth/signup">
                            <Text style={s.link}>Create one!</Text>
                        </Link>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        borderBlockColor: "#000000",
        backgroundColor: "#0E5B37",
    },

    hero: {
        paddingTop: 36,
        paddingHorizontal: 24,
        paddingBottom: 32,
        backgroundColor: "#0E5B37",
    },
    hello: {
        color: "white",
        fontSize: 42,
        fontWeight: "800",
    },
    sub: {
        color: "white",
        opacity: 0.9,
        marginTop: 6,
        fontSize: 16,
    },

    // card area
    card: {
        backgroundColor: "#EDEDED",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        minHeight: 500,
    },
    cardTitle: {
        fontSize: 35,
        color: "#0E5B37",
        fontWeight: "600",
        marginBottom: 30,
        marginTop: 12,

    },
    input: {
        backgroundColor: "white",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
        fontSize: 16,
    },
    rowEnd: { alignItems: "flex-end", marginBottom: 12 },

    primaryBtn: {
        backgroundColor: "#0E5B37",
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 4,
        marginBottom: 4,
    },
    primaryText: { color: "white", fontSize: 16, fontWeight: "700" },

    link: { color: "#0E5B37", textDecorationLine: "underline" },

    footer: {
        backgroundColor: "#EDEDED",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    footerText: { color: "#333" },
});