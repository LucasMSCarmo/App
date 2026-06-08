import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useVoiceTaskParser } from '@/src/hooks/useVoiceTaskParser';

export function VoiceTaskButton({ onParsed }: { onParsed: (t: any) => void }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  const { isListening, transcript, start, stop } = useVoiceTaskParser({
    onParsed,
    onError: console.error,
  });

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [isListening]);

  return (
    <View style={styles.wrapper}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: isListening ? colors.danger : colors.buttonPrimary }]}
          onPress={isListening ? stop : start}
          activeOpacity={0.8}
        >
          <Ionicons name={isListening ? 'stop' : 'mic'} size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  btn: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});