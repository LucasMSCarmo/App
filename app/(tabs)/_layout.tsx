import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export default function TabLayout() {

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) =>
            <Ionicons size={28} name="home" color={color} />
        }} />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendário',
          tabBarIcon: ({ color }) =>
            <Ionicons size={28} name="calendar" color={color} />
        }} />
      <Tabs.Screen name="tasks" options={{
        title: 'Tarefas',
        tabBarIcon: ({ color }) =>
          <Ionicons size={28} name="checkmark-circle" color={color} />
      }} />
      <Tabs.Screen name="focus" options={{
        title: 'Foco',
        tabBarIcon: ({ color }) =>
          <Ionicons size={28} name="timer" color={color} />
      }} />
      <Tabs.Screen name="profile" options={{
        title: 'Perfil',
        tabBarIcon: ({ color }) =>
          <Ionicons size={28} name="person" color={color} />
      }} />
    </Tabs>
  );
}
