import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import CalendarMonth from '@/src/components/CalendarMonth';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Stack } from 'expo-router';
import TaskCalendarView from '@/src/components/TaskCalendarView';

function CalendarScreen() {
    const { colors } = useTheme();

    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
            
            <Stack.Screen 
                options={{
                    headerShown: false, 
                }} 
            />

            <View style={styles.container}>
                <TaskCalendarView />
            </View>
        </SafeAreaView>
    );
}

export default CalendarScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});