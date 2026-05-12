import { TouchableOpacity, View, Text, TextInput } from "react-native"
import { useColors } from '@/src/hooks/useColors'
import { useAuth } from '@/src/contexts/AuthContext';
import { useState } from "react";
import { useRouter } from "expo-router";

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const colors = useColors();
    const { login } = useAuth();

    async function handleLogin() {
        if (!email || !password) return;
        setError(null);
        try{
            await login(email, password);
            router.push('/home');
        } catch (error: any) {
            setError(error.response?.data?.error);
        }
    }

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'purple' }}>
            <View style={{ marginBottom: 20 }}>
                {error && <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>}
                <TextInput
                    placeholder="Email"
                    style={{ width: 200, height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 10 }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput
                    placeholder="Password"
                    secureTextEntry
                    style={{ width: 200, height: 40, borderColor: 'gray', borderWidth: 1 }}
                    autoCapitalize="none"
                    value={password}
                    onChangeText={setPassword}
                />
            </View>
            <TouchableOpacity onPress={handleLogin} style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 5 }}>
                <Text style={{ color: 'white' }}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/register')} style={{ marginTop: 10 }}>
                <Text style={{ color: colors.primary }}>Don't have an account? Register</Text>
            </TouchableOpacity>
        </View>
    )
}

export default Login