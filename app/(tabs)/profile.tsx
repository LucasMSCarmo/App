import { useAuth } from "@/src/contexts/AuthContext"
import { TouchableOpacity, View, Text } from "react-native"

const Profile = () => {
    const { user } = useAuth();
    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            {/* Header */}
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 40, color: '#fff' }}>
                    {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
                </Text>
            </View>
        </View>
    )
}

export default Profile