import { TouchableOpacity, View, Text, TextInput, KeyboardAvoidingView, Platform, Pressable } from "react-native"
import { useColors } from '@/src/hooks/useColors'
import { useAuth } from '@/src/contexts/AuthContext';
import { useState } from "react";
import { useRouter } from "expo-router";

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const router = useRouter();
    const colors = useColors();
    const { login } = useAuth();

    async function handleLogin() {
        if (!email || !password) return;
        setError(null);
        try {
            await login(email, password);
            router.push('/home');
        } catch (error: any) {
            setError(error.response?.data?.error ?? 'Erro ao entrar. Tente novamente.');
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: colors.background }}
        >
            <View style={{
                flex: 1,
                justifyContent: 'center',
                paddingHorizontal: 32,
            }}>

                {/* Header */}
                <View style={{ marginBottom: 48 }}>
                    <Text style={{
                        fontSize: 30,
                        fontWeight: '700',
                        color: colors.text,
                        letterSpacing: -0.5,
                        marginBottom: 6,
                    }}>
                        Bem-vindo de volta
                    </Text>
                    <Text style={{
                        fontSize: 15,
                        color: colors.textSecondary,
                        lineHeight: 22,
                    }}>
                        Entre com sua conta para continuar
                    </Text>
                </View>

                {/* Error */}
                {error && (
                    <View style={{
                        backgroundColor: colors.dangerSurface,
                        borderWidth: 1,
                        borderColor: colors.dangerLight,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        marginBottom: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <Text style={{ fontSize: 15 }}>⚠️</Text>
                        <Text style={{ color: colors.danger, fontSize: 14, flex: 1 }}>{error}</Text>
                    </View>
                )}

                {/* Form */}
                <View style={{ gap: 16, marginBottom: 28 }}>
                    <View>
                        <Text style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: colors.inputLabel,
                            marginBottom: 8,
                            letterSpacing: 0.3,
                        }}>
                            E-mail
                        </Text>
                        <TextInput
                            placeholder="seu@email.com"
                            placeholderTextColor={colors.inputPlaceholder}
                            style={{
                                height: 52,
                                backgroundColor: colors.inputBackground,
                                borderWidth: 1.5,
                                borderColor: emailFocused ? colors.inputBorderFocused : colors.inputBorder,
                                borderRadius: 14,
                                paddingHorizontal: 16,
                                fontSize: 15,
                                color: colors.inputText,
                            }}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                            onFocus={() => setEmailFocused(true)}
                            onBlur={() => setEmailFocused(false)}
                        />
                    </View>

                    <View>
                        <Text style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: colors.inputLabel,
                            marginBottom: 8,
                            letterSpacing: 0.3,
                        }}>
                            Senha
                        </Text>
                        <TextInput
                            placeholder="••••••••"
                            placeholderTextColor={colors.inputPlaceholder}
                            secureTextEntry
                            style={{
                                height: 52,
                                backgroundColor: colors.inputBackground,
                                borderWidth: 1.5,
                                borderColor: passwordFocused ? colors.inputBorderFocused : colors.inputBorder,
                                borderRadius: 14,
                                paddingHorizontal: 16,
                                fontSize: 15,
                                color: colors.inputText,
                            }}
                            autoCapitalize="none"
                            value={password}
                            onChangeText={setPassword}
                            onFocus={() => setPasswordFocused(true)}
                            onBlur={() => setPasswordFocused(false)}
                        />
                    </View>
                </View>

                {/* Submit */}
                <TouchableOpacity
                    onPress={handleLogin}
                    activeOpacity={0.85}
                    style={{
                        height: 54,
                        backgroundColor: colors.buttonPrimary,
                        borderRadius: 16,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 20,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 4,
                    }}
                >
                    <Text style={{
                        color: colors.buttonPrimaryText,
                        fontSize: 16,
                        fontWeight: '700',
                        letterSpacing: 0.3,
                    }}>
                        Entrar
                    </Text>
                </TouchableOpacity>

                {/* Register link */}
                <TouchableOpacity
                    onPress={() => router.push('/register')}
                    activeOpacity={0.7}
                    style={{ alignItems: 'center', paddingVertical: 8 }}
                >
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                        Não tem uma conta?{' '}
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>
                            Cadastre-se
                        </Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

export default Login;