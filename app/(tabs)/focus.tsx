import { TouchableOpacity, View, Text } from "react-native"

const Focus = () => {
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ backgroundColor: 'blue', padding: 10, borderRadius: 5 }}>
                <Text style={{ color: 'white' }}>Login</Text>
            </TouchableOpacity>
        </View>
    )
}

export default Focus