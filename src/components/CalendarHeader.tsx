import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { TODAY_DAY } from '@/src/utils/dateHelpers';

interface Props {
    label: string;       // texto ja formatado pela view ativa
    onMenuPress: () => void;
    onTodayPress: () => void;
}

export default function CalendarHeader({ label, onMenuPress, onTodayPress }: Props) {
    const { colors } = useTheme();

    return (
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <TouchableOpacity onPress={onMenuPress} style={styles.iconBtn} hitSlop={8} activeOpacity={0.7}>
                <Ionicons name="menu" size={24} color={colors.text} />
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.text }]}>{label}</Text>

            <TouchableOpacity
                onPress={onTodayPress}
                style={[styles.todayBadge, { borderColor: colors.text }]}
                hitSlop={8}
                activeOpacity={0.7}
            >
                <Text style={[styles.todayBadgeText, { color: colors.text }]}>{TODAY_DAY}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconBtn: {
        padding: 4,
    },
    label: {
        flex: 1,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    todayBadge: {
        width: 30,
        height: 30,
        borderRadius: 6,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    todayBadgeText: {
        fontSize: 13,
        fontWeight: '700',
    },
});