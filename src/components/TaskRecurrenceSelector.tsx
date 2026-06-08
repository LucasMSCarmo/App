import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import {
  getRecurrenceAnchorLabel,
  RECURRENCE_OPTIONS,
  TaskRecurrenceType,
  WEEKDAY_OPTIONS,
} from '@/src/utils/taskRecurrence';

type Props = {
  recurrenceType: TaskRecurrenceType;
  selectedWeekdays: number[];
  anchorDate: Date | null;
  onChangeType: (type: TaskRecurrenceType) => void;
  onChangeWeekdays: (weekdays: number[]) => void;
};

export function TaskRecurrenceSelector({
  recurrenceType,
  selectedWeekdays,
  anchorDate,
  onChangeType,
  onChangeWeekdays,
}: Props) {
  const { colors } = useTheme();

  const toggleWeekday = (day: number) => {
    if (selectedWeekdays.includes(day)) {
      onChangeWeekdays(selectedWeekdays.filter((item) => item !== day));
      return;
    }

    onChangeWeekdays([...selectedWeekdays, day]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.optionsRow}>
        {RECURRENCE_OPTIONS.map((option) => {
          const isActive = recurrenceType === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isActive && { backgroundColor: colors.primarySurface, borderColor: colors.primary },
              ]}
              onPress={() => onChangeType(option.value)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                { color: isActive ? colors.primary : colors.textSecondary },
                isActive && styles.optionTextActive,
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {recurrenceType !== 'none' && (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Começa em {getRecurrenceAnchorLabel(anchorDate)}
        </Text>
      )}

      {recurrenceType === 'weekdays' && (
        <View style={styles.weekdayRow}>
          {WEEKDAY_OPTIONS.map((weekday) => {
            const isActive = selectedWeekdays.includes(weekday.value);
            return (
              <TouchableOpacity
                key={weekday.value}
                style={[
                  styles.weekdayBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => toggleWeekday(weekday.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.weekdayText,
                  { color: isActive ? colors.buttonPrimaryText : colors.textSecondary },
                ]}>
                  {weekday.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
    gap: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionBtn: {
    minWidth: 96,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionTextActive: {
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    lineHeight: 16,
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weekdayBtn: {
    width: 45,
    height: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
