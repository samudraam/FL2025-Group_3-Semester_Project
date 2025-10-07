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
    Alert,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from 'react-native-safe-area-context';
import { authAPI } from "../../services/api";

type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export default function Signup() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [phone, setPhone] = useState("");
    const [level, setLevel] = useState<SkillLevel | "">("");
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Validates that all required fields are filled
     */
    const canSubmit = 
        email.trim().length > 0 && 
        firstName.trim().length > 0 &&
        lastName.trim().length > 0 &&
        displayName.trim().length > 0 &&
        phone.trim().length > 0 &&
        level !== "" &&
        !isLoading;

    /**
     * Handles user registration by calling the backend API
     */
    const onSignup = async () => {
        if (!canSubmit) return;

        setIsLoading(true);
        try {
            const userData = {
                email: email.trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                displayName: displayName.trim(),
                phone: `+1${phone.trim()}`,
                level: level as SkillLevel,
            };

            const response = await authAPI.register(userData);
            
            if (response.success) {
                Alert.alert(
                    "Account Created!", 
                    "Your account has been created successfully.",
                    [
                        {
                            text: "Continue",
                            onPress: () => router.replace("/auth/login")
                        }
                    ]
                );
            }
        } catch (error: any) {
            console.error("Registration error:", error);
            const errorMessage = error.response?.data?.message || "Failed to create account. Please try again.";
            Alert.alert("Registration Failed", errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Renders a selectable level button
     */
    const LevelButton = ({ value, label }: { value: SkillLevel; label: string }) => {
        const isSelected = level === value;
        return (
            <Pressable
                onPress={() => setLevel(value)}
                style={({ pressed }) => [
                    s.levelButton,
                    isSelected && s.levelButtonSelected,
                    { opacity: pressed ? 0.7 : 1 }
                ]}
            >
                <Text style={[s.levelButtonText, isSelected && s.levelButtonTextSelected]}>
                    {label}
                </Text>
            </Pressable>
        );
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
                    <View style={s.hero}>
                        <Text style={s.hello}>Goodminton</Text>
                        <Text style={s.sub}>Start your goodminton journey today</Text>
                    </View>

                    {/* CARD */}
                    <View style={s.card}>
                        <Text style={s.cardTitle}>Sign up!</Text>

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
                            editable={!isLoading}
                        />

                        <TextInput
                            placeholder="First Name"
                            placeholderTextColor="#A9A9A9"
                            style={s.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            autoCapitalize="words"
                            textContentType="givenName"
                            editable={!isLoading}
                        />

                        <TextInput
                            placeholder="Last Name"
                            placeholderTextColor="#A9A9A9"
                            style={s.input}
                            value={lastName}
                            onChangeText={setLastName}
                            autoCapitalize="words"
                            textContentType="familyName"
                            editable={!isLoading}
                        />

                        <TextInput
                            placeholder="Display Name"
                            placeholderTextColor="#A9A9A9"
                            style={s.input}
                            value={displayName}
                            onChangeText={setDisplayName}
                            autoCapitalize="none"
                            editable={!isLoading}
                        />

                        <TextInput
                            placeholder="Phone (e.g., 2025551234)"
                            placeholderTextColor="#A9A9A9"
                            style={s.input}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            textContentType="telephoneNumber"
                            editable={!isLoading}
                        />

                        {/* Skill Level Selection */}
                        <Text style={s.sectionLabel}>Skill Level</Text>
                        <View style={s.levelContainer}>
                            <LevelButton value="beginner" label="Beginner" />
                            <LevelButton value="intermediate" label="Intermediate" />
                            <LevelButton value="advanced" label="Advanced" />
                            <LevelButton value="expert" label="Expert" />
                        </View>

                        {/* Button for signup */}
                        <Pressable
                            onPress={onSignup}
                            disabled={!canSubmit}
                            style={({ pressed }) => [
                                s.primaryBtn,
                                { opacity: !canSubmit ? 0.5 : pressed ? 0.9 : 1 },
                            ]}
                        >
                            <Text style={s.primaryText}>
                                {isLoading ? "Creating Account..." : "Create Account"}
                            </Text>
                        </Pressable>
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
        borderRadius: 24,
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
    
    sectionLabel: {
        fontSize: 16,
        color: "#333",
        fontWeight: "600",
        marginTop: 8,
        marginBottom: 10,
        marginLeft: 4,
    },
    
    levelContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
    },
    
    levelButton: {
        backgroundColor: "white",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 2,
        borderColor: "#D0D0D0",
    },
    
    levelButtonSelected: {
        backgroundColor: "#0E5B37",
        borderColor: "#0E5B37",
    },
    
    levelButtonText: {
        color: "#666",
        fontSize: 14,
        fontWeight: "600",
    },
    
    levelButtonTextSelected: {
        color: "white",
    },

    primaryBtn: {
        backgroundColor: "#0E5B37",
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 4,
        marginBottom: 4,
    },
    primaryText: { color: "white", fontSize: 16, fontWeight: "700" },


});