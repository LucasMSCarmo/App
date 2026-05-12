import { TouchableOpacity, View, Text, TextInput } from "react-native"
import { router } from "expo-router"
import { useAuth } from '@/src/contexts/AuthContext';
import { useState } from "react";

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { register } = useAuth();

    function validateForm() {
        if (!username || !email || !password || !confirmPassword) {
            alert('Please fill all fields');
            return false;
        }
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return false;
        }
        return true;
    }

    async function handleRegister() {
        if (!validateForm()) return;
        try {
            await register(username, email, password);
            router.push('/home');
        }
        catch (e) {
            setError('Registration failed. Please try again.');
        }
    }

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ marginBottom: 20 }}>
                <TextInput
                    placeholder="Username"
                    style={{ width: 200, height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 10 }}
                    value={username}
                    onChangeText={setUsername}
                />
                <TextInput
                    placeholder="Email"
                    style={{ width: 200, height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 10 }}
                    value={email}
                    onChangeText={setEmail}
                />
                <TextInput
                    placeholder="Password"
                    secureTextEntry
                    style={{ width: 200, height: 40, borderColor: 'gray', borderWidth: 1 }}
                    value={password}
                    onChangeText={setPassword}
                />
                <TextInput
                    placeholder="Confirm Password"
                    secureTextEntry
                    style={{ width: 200, height: 40, borderColor: 'gray', borderWidth: 1, marginTop: 10 }}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />
            </View>
            <TouchableOpacity onPress={handleRegister} style={{ backgroundColor: 'blue', padding: 10, borderRadius: 5 }}>
                <Text style={{ color: 'white' }}>Register</Text>
            </TouchableOpacity>
        </View>
    )
}

export default Register