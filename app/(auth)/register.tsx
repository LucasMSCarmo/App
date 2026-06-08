import { TouchableOpacity, View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { router } from "expo-router"
import { useAuth } from '@/src/contexts/AuthContext';
import { useColors } from '@/src/hooks/useColors';
import { useState } from "react";

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [focused, setFocused] = useState<string | null>(null);
    const { register } = useAuth();
    const colors = useColors();

    function validateForm() {
        if (!username || !email || !password || !confirmPassword) {
            setError('Preencha todos os campos.');
            return false;
        }
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return false;
        }
        return true;
    }

    async function handleRegister() {
        setError(null);
        if (!validateForm()) return;
        try {
            await register(username, email, password);
            router.push('/home');
        } catch (e) {
            setError('Erro ao criar conta. Tente novamente.');
        }
    }

    const inputStyle = (field: string) => ({
        height: 52,
        backgroundColor: colors.inputBackground,
        borderWidth: 1.5,
        borderColor: focused === field ? colors.inputBorderFocused : colors.inputBorder,
        borderRadius: 14,
        paddingHorizontal: 16,
        fontSize: 15,
        color: colors.inputText,
    });

    const labelStyle = {
        fontSize: 13,
        fontWeight: '600' as const,
        color: colors.inputLabel,
        marginBottom: 8,
        letterSpacing: 0.3,
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: colors.background }}
        >
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={{ marginBottom: 40 }}>
                    <View style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        backgroundColor: colors.primarySurface,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 24,
                    }}>
                        <Text style={{ fontSize: 24 }}>✦</Text>
                    </View>
                    <Text style={{
                        fontSize: 30,
                        fontWeight: '700',
                        color: colors.text,
                        letterSpacing: -0.5,
                        marginBottom: 6,
                    }}>
                        Criar conta
                    </Text>
                    <Text style={{
                        fontSize: 15,
                        color: colors.textSecondary,
                        lineHeight: 22,
                    }}>
                        Preencha os dados abaixo para começar
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
                        <Text style={labelStyle}>Nome de usuário</Text>
                        <TextInput
                            placeholder="seu_usuario"
                            placeholderTextColor={colors.inputPlaceholder}
                            style={inputStyle('username')}
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                            onFocus={() => setFocused('username')}
                            onBlur={() => setFocused(null)}
                        />
                    </View>

                    <View>
                        <Text style={labelStyle}>E-mail</Text>
                        <TextInput
                            placeholder="seu@email.com"
                            placeholderTextColor={colors.inputPlaceholder}
                            style={inputStyle('email')}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            onFocus={() => setFocused('email')}
                            onBlur={() => setFocused(null)}
                        />
                    </View>

                    <View>
                        <Text style={labelStyle}>Senha</Text>
                        <TextInput
                            placeholder="••••••••"
                            placeholderTextColor={colors.inputPlaceholder}
                            secureTextEntry
                            style={inputStyle('password')}
                            value={password}
                            onChangeText={setPassword}
                            autoCapitalize="none"
                            onFocus={() => setFocused('password')}
                            onBlur={() => setFocused(null)}
                        />
                    </View>

                    <View>
                        <Text style={labelStyle}>Confirmar senha</Text>
                        <TextInput
                            placeholder="••••••••"
                            placeholderTextColor={colors.inputPlaceholder}
                            secureTextEntry
                            style={inputStyle('confirmPassword')}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            autoCapitalize="none"
                            onFocus={() => setFocused('confirmPassword')}
                            onBlur={() => setFocused(null)}
                        />
                    </View>
                </View>

                {/* Submit */}
                <TouchableOpacity
                    onPress={handleRegister}
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
                        Criar conta
                    </Text>
                </TouchableOpacity>

                {/* Login link */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    activeOpacity={0.7}
                    style={{ alignItems: 'center', paddingVertical: 8 }}
                >
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                        Já tem uma conta?{' '}
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>
                            Entrar
                        </Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

export default Register;