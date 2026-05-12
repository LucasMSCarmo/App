import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Animated } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  children: React.ReactNode;
}

export function Sidebar({ visible, onClose, side = 'left', children }: SidebarProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={[styles.overlay, side === 'right' && { justifyContent: 'flex-end' }]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={onClose}
        >
            <View style={[styles.background, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
        </TouchableOpacity>

        <View style={[
          styles.content, 
          { backgroundColor: colors.surface },
          side === 'left' ? styles.sidebarLeft : styles.sidebarRight
        ]}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: 'row' },
  background: { flex: 1 },
  content: {
    height: '100%',
    width: '80%',
    paddingTop: 50,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
  },
  sidebarLeft: { borderTopRightRadius: 20, borderBottomRightRadius: 20 },
  sidebarRight: { borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
});