import { TouchableOpacity, View, Text, TextInput } from "react-native"
import { router } from "expo-router"

const BiometricLogin = () => {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ marginBottom: 20 }}>
                <TextInput placeholder="Username" style={{ width: 200, height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 10 }} />
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={{ backgroundColor: 'blue', padding: 10, borderRadius: 5 }}>
                <Text style={{ color: 'white' }}>Login</Text>
            </TouchableOpacity>
        </View>
    )
}

export default BiometricLogin