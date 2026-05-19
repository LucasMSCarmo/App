import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Category from '@/src/database/model/Category';
import TaskMember from '@/src/database/model/TaskMember';
import { TASK_PRIORITIES, TASK_STATUS } from '@/src/constants/taskConstants';
import { useTheme } from '@/src/contexts/ThemeContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

type FilterType = 'category' | 'status' | 'priority' | 'dateRange' | 'createdByMe' | 'members';

interface Props {
  categories?: Category[];
  members?: TaskMember[];
  selectedCategories?: string[];
  setSelectedCategories?: (ids: string[]) => void;
  selectedStatus?: string[];
  setSelectedStatus?: (status: string[]) => void;
  selectedPriorities?: string[];
  setSelectedPriorities?: (priorities: string[]) => void;
  selectedDateRange?: { start: Date | null; end: Date | null };
  setSelectedDateRange?: (range: { start: Date | null; end: Date | null }) => void;
  createdByMe?: string;
  setCreatedByMe?: (createdByMe: string) => void;
  selectedMembers?: string[];
  setSelectedMembers?: (members: string[]) => void;
  enabledFilters: FilterType[];
}

export function TaskFilters({
  categories,
  members,
  selectedCategories,
  setSelectedCategories,
  selectedStatus,
  setSelectedStatus,
  selectedPriorities,
  setSelectedPriorities,
  createdByMe,
  setCreatedByMe,
  selectedMembers,
  setSelectedMembers,
  selectedDateRange,
  setSelectedDateRange,
  enabledFilters,
}: Props) {
  const { colors } = useTheme();
  const isVisible = (type: FilterType) => enabledFilters.includes(type);
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);

  const toggleDateRange = (field: 'start' | 'end', date: Date | null) => {
    if (!setSelectedDateRange) return;
    setSelectedDateRange({
      start: field === 'start' ? date : selectedDateRange?.start || null,
      end: field === 'end' ? date : selectedDateRange?.end || null,
    });
    setShowDatePicker(null);
  };

  const toggleItem = (
    list: string[] | undefined,
    set: ((l: string[]) => void) | undefined,
    id: string
  ) => {
    if (!set) return;
    const current = list ?? [];
    set(current.includes(id) ? current.filter(i => i !== id) : [...current, id]);
  };

  const toggleCreatedByMe = () => {
    if (!setCreatedByMe) return;
    setCreatedByMe(createdByMe === 'me' ? '' : 'me');
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={[styles.title, { color: colors.text }]}>Filtros</Text>

      {/* Categorias */}
      {isVisible('category') && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Categorias</Text>
          <View style={styles.chipRow}>
            {categories?.map(cat => {
              const isActive = selectedCategories?.includes(cat.id);
              const catColor = cat.color ?? colors.primary;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => toggleItem(selectedCategories, setSelectedCategories, cat.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? catColor + '25' : colors.surface,
                      borderColor: isActive ? catColor : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
                  <Text style={[styles.chipText, { color: isActive ? catColor : colors.textSecondary }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Status */}
      {isVisible('status') && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
          <View style={styles.chipRow}>
            {Object.values(TASK_STATUS).map((s) => {
              const isActive = selectedStatus?.includes(s.value);
              const activeColor = colors[s.colorKey];
              const activeBg = colors[s.surfaceKey];
              return (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => toggleItem(selectedStatus, setSelectedStatus, s.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? activeBg : colors.surface,
                      borderColor: isActive ? activeColor : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dot, { backgroundColor: isActive ? activeColor : colors.textMuted }]} />
                  <Text style={[styles.chipText, { color: isActive ? activeColor : colors.textSecondary }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Prioridade */}
      {isVisible('priority') && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Prioridade</Text>
          <View style={styles.chipRow}>
            {Object.values(TASK_PRIORITIES).map((p) => {
              const isActive = selectedPriorities?.includes(p.value);
              const activeColor = colors[p.colorKey];
              const activeBg = colors[p.surfaceKey];
              return (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => toggleItem(selectedPriorities, setSelectedPriorities, p.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? activeBg : colors.surface,
                      borderColor: isActive ? activeColor : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dot, { backgroundColor: isActive ? activeColor : colors.textMuted }]} />
                  <Text style={[styles.chipText, { color: isActive ? activeColor : colors.textSecondary }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Intervalo de datas */}
      {isVisible('dateRange') && (
        <View style={styles.section}>
          <View style={styles.datetimeContainer}>
            <View style={styles.datetimeRow}>
              <TouchableOpacity
                style={[styles.datetimeInput, {
                  flex: 1,
                  backgroundColor: colors.inputBackground,
                  borderColor: selectedDateRange?.start ? colors.primary : colors.inputBorder,
                }]}
                onPress={() => setShowDatePicker('start')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={selectedDateRange?.start ? colors.primary : colors.inputIcon}
                />
                <Text style={{ color: selectedDateRange?.start ? colors.text : colors.inputPlaceholder, flex: 1, marginLeft: 10, fontSize: 15 }}>
                  {selectedDateRange?.start ? selectedDateRange.start.toLocaleDateString('pt-BR') : 'Selecionar data'}
                </Text>
              </TouchableOpacity>

              {selectedDateRange?.start && (
                <TouchableOpacity
                  style={[styles.clearBtn, { backgroundColor: colors.buttonCancel }]}
                  onPress={() => toggleDateRange('start', null)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={selectedDateRange?.start ? colors.danger : colors.inputIcon}
                  />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.datetimeRow}>
              <TouchableOpacity
                style={[styles.datetimeInput, {
                  flex: 1,
                  backgroundColor: colors.inputBackground,
                  borderColor: selectedDateRange?.end ? colors.primary : colors.inputBorder,
                }]}
                onPress={() => setShowDatePicker('end')}
                activeOpacity={0.7}
                disabled={!selectedDateRange?.start}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={selectedDateRange?.end ? colors.primary : colors.inputIcon}
                />
                <Text style={{ color: selectedDateRange?.end ? colors.text : colors.inputPlaceholder, flex: 1, marginLeft: 10, fontSize: 15 }}>
                  {selectedDateRange?.end ? selectedDateRange.end.toLocaleDateString('pt-BR') : 'Selecionar data'}
                </Text>
              </TouchableOpacity>

              {selectedDateRange?.end && (
                <TouchableOpacity
                  style={[styles.clearBtn, { backgroundColor: colors.buttonCancel }]}
                  onPress={() => toggleDateRange('end', null)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={selectedDateRange?.end ? colors.danger : colors.inputIcon}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={selectedDateRange?.[showDatePicker] || new Date()}
          mode="date"
          display="default"
          onChange={(event, date) => {
            toggleDateRange(showDatePicker, date || null);
          }}
          minimumDate={new Date()}
        />
      )}

      {/* Criado por mim */}
      {isVisible('createdByMe') && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Propriedade</Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              onPress={toggleCreatedByMe}
              style={[
                styles.chip,
                {
                  backgroundColor: createdByMe === 'me' ? colors.primarySurface : colors.surface,
                  borderColor: createdByMe === 'me' ? colors.primary : colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <View style={[styles.dot, { backgroundColor: createdByMe === 'me' ? colors.primary : colors.textMuted }]} />
              <Text style={[styles.chipText, { color: createdByMe === 'me' ? colors.primary : colors.textSecondary }]}>
                Criado por mim
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Membros */}
      {isVisible('members') && members && members.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Membros</Text>
          <View style={styles.chipRow}>
            {members.map((member) => {
              const isActive = selectedMembers?.includes(member.userId);
              return (
                <TouchableOpacity
                  key={member.id}
                  onPress={() => toggleItem(selectedMembers, setSelectedMembers, member.userId)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? colors.primarySurface : colors.surface,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatarMini, { backgroundColor: isActive ? colors.primary : colors.surfaceVariant }]}>
                    <Text style={[styles.avatarLetter, { color: isActive ? colors.textOnPrimary : colors.textSecondary }]}>
                      {member.userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.chipText, { color: isActive ? colors.primary : colors.textSecondary }]}>
                    {member.userName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 4,
        marginTop: 8,
    },
    section: {
        marginTop: 20,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
    },
    categoryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    avatarMini: {
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLetter: {
        fontSize: 10,
        fontWeight: '700',
    },
    datetimeContainer: {
        gap: 8,
    },
    datetimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    datetimeInput: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    clearBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
