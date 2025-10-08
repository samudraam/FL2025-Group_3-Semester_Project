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
    ActivityIndicator,
} from "react-native";
import { Link, router } from "expo-router";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../services/authContext';

export default function Login() {
    const { requestOTP, verifyOTP } = useAuth();
    
    const [email, setEmail] = useState("");
    const [otp, setOTP] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    /**
     * Validate email format
     */
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const canRequestOTP = email.trim().length > 0 && isValidEmail(email);
    const canVerifyOTP = otp.trim().length === 6;

    /**
     * Request OTP code to be sent to email
     */
    const handleRequestOTP = async () => {
        if (!canRequestOTP) return;

        setIsLoading(true);
        try {
            await requestOTP(email.trim());
            setOtpSent(true);
        } catch (error: any) {
            console.error('Request OTP error:', error);
            Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to send verification code. Please try again.",
                [{ text: "OK" }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Verify the OTP code and login
     */
    const handleVerifyOTP = async () => {
        if (!canVerifyOTP) return;

        setIsLoading(true);
        try {
            const response = await verifyOTP(email.trim(), otp.trim());
            
            if (response.success) {
                Alert.alert(
                    "Welcome!",
                    "You've been logged in successfully!",
                    [
                        {
                            text: "Continue",
                            onPress: () => router.replace('/tabs')
                        }
                    ]
                );
            } else {
                Alert.alert("Error", "Invalid verification code. Please try again.");
            }
        } catch (error: any) {
            console.error('Verify OTP error:', error);
            Alert.alert(
                "Verification Failed",
                error.response?.data?.error || "Invalid or expired code. Please try again.",
                [{ text: "OK" }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Resend OTP code
     */
    const handleResendOTP = async () => {
        setOTP("");
        await handleRequestOTP();
    };

    /**
     * Change email and start over
     */
    const handleChangeEmail = () => {
        setOtpSent(false);
        setOTP("");
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
                        <Text style={s.cardTitle}>
                            {otpSent ? "Enter Verification Code" : "Login"}
                        </Text>

                        {!otpSent ? (
                            <>
                                <Text style={s.description}>
                                    Enter your email address and we'll send you a verification code.
                                </Text>

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

                                {/* Button to request OTP */}
                                <Pressable
                                    onPress={handleRequestOTP}
                                    disabled={!canRequestOTP || isLoading}
                                    style={({ pressed }) => [
                                        s.primaryBtn,
                                        { 
                                            opacity: !canRequestOTP || isLoading ? 0.5 : pressed ? 0.9 : 1 
                                        },
                                    ]}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={s.primaryText}>Send Code</Text>
                                    )}
                                </Pressable>
                            </>
                        ) : (
                            <>
                                <Text style={s.description}>
                                    We've sent a 6-digit code to {email}. Enter it below to sign in.
                                </Text>

                                <TextInput
                                    placeholder="_ _ _ _ _ _"
                                    placeholderTextColor="#A9A9A9"
                                    style={[s.input, s.otpInput]}
                                    value={otp}
                                    onChangeText={(text) => setOTP(text.replace(/[^0-9]/g, ''))}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    autoFocus
                                    editable={!isLoading}
                                    textContentType="oneTimeCode"
                                />

                                {/* Button to verify OTP */}
                                <Pressable
                                    onPress={handleVerifyOTP}
                                    disabled={!canVerifyOTP || isLoading}
                                    style={({ pressed }) => [
                                        s.primaryBtn,
                                        { 
                                            opacity: !canVerifyOTP || isLoading ? 0.5 : pressed ? 0.9 : 1 
                                        },
                                    ]}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={s.primaryText}>Verify & Login</Text>
                                    )}
                                </Pressable>

                                <View style={s.resendContainer}>
                                    <Text style={s.resendText}>Didn't receive the code?</Text>
                                    <Pressable
                                        onPress={handleResendOTP}
                                        disabled={isLoading}
                                        style={({ pressed }) => [
                                            s.resendButton,
                                            { opacity: isLoading ? 0.5 : pressed ? 0.7 : 1 }
                                        ]}
                                    >
                                        <Text style={s.resendButtonText}>
                                            {isLoading ? "Sending..." : "Resend Code"}
                                        </Text>
                                    </Pressable>
                                </View>

                                <Pressable
                                    onPress={handleChangeEmail}
                                    style={({ pressed }) => [
                                        s.secondaryBtn,
                                        { opacity: pressed ? 0.7 : 1 }
                                    ]}
                                >
                                    <Text style={s.secondaryText}>Use Different Email</Text>
                                </Pressable>
                            </>
                        )}

                        <View style={s.rowEnd}>
                            <Link href="/auth/login">
                                <Text style={s.link}>Need Help?</Text>
                            </Link>
                        </View>
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
        fontFamily: "DMSans_800ExtraBold",
    },
    sub: {
        color: "white",
        opacity: 0.9,
        marginTop: 6,
        fontSize: 16,
        fontFamily: "DMSans_400Regular",
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
        fontFamily: "DMSans_600SemiBold",
        marginBottom: 30,
        marginTop: 12,
    },
    description: {
        fontSize: 16,
        color: "#666",
        marginBottom: 20,
        lineHeight: 22,
        fontFamily: "DMSans_400Regular",
    },
    input: {
        backgroundColor: "white",
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 12,
        fontSize: 16,
        fontFamily: "DMSans_400Regular",
    },
    otpInput: {
        fontSize: 24,
        fontFamily: "DMSans_600SemiBold",
        letterSpacing: 8,
        textAlign: "center",
    },
    rowEnd: { 
        alignItems: "flex-end", 
        marginBottom: 12,
        marginTop: 20,
    },

    primaryBtn: {
        backgroundColor: "#0E5B37",
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 4,
        marginBottom: 4,
    },
    primaryText: { 
        color: "white", 
        fontSize: 16, 
        fontFamily: "DMSans_700Bold",
    },

    secondaryBtn: {
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: "#0E5B37",
        borderRadius: 999,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 4,
        marginBottom: 4,
    },
    secondaryText: { 
        color: "#0E5B37", 
        fontSize: 16, 
        fontFamily: "DMSans_700Bold",
    },

    resendContainer: {
        alignItems: "center",
        marginVertical: 20,
    },
    resendText: {
        fontSize: 16,
        color: "#666",
        marginBottom: 10,
        fontFamily: "DMSans_400Regular",
    },
    resendButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    resendButtonText: {
        color: "#0E5B37",
        fontSize: 16,
        fontFamily: "DMSans_600SemiBold",
        textDecorationLine: "underline",
    },

    link: { 
        color: "#0E5B37", 
        fontFamily: "DMSans_400Regular",
        textDecorationLine: "underline" 
    },
});
