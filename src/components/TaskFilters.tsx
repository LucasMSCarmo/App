import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Category from '@/src/database/model/Category';
import TaskMember from '../database/model/TaskMember';
import { TASK_PRIORITIES, TASK_STATUS } from '../constants/taskConstants';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useAuth } from '@/src/contexts/AuthContext';

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
  selectedDateRange?: { start: Date | null, end: Date | null };
  setSelectedDateRange?: (dateRange: { start: Date | null, end: Date | null }) => void;
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
  selectedDateRange,
  setSelectedDateRange,
  createdByMe,
  setCreatedByMe,
  selectedMembers,
  setSelectedMembers,
  enabledFilters
}: Props) {
  const { colors } = useTheme();
  const isVisible = (type: FilterType) => enabledFilters.includes(type);

  const toggleItem = (list: string[] | undefined, set: ((l: string[]) => void) | undefined, id: string) => {
    if (!set) return;
    const currentList = list || [];
    set(currentList.includes(id) ? currentList.filter(i => i !== id) : [...currentList, id]);
  };

  const toggleCreatedByMe = () => {
    if (!setCreatedByMe) return;
    setCreatedByMe(createdByMe === 'me' ? '' : 'me');
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Text style={[styles.sidebarTitle, { color: colors.primary }]}>Filtros</Text>

      {isVisible('category') && (
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Categorias</Text>
          <View style={styles.wrapRow}>
            {categories?.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => toggleItem(selectedCategories, setSelectedCategories, cat.id)}
                style={[
                  styles.chip,
                  { backgroundColor: colors.background, borderColor: colors.primary + '30' },
                  selectedCategories?.includes(cat.id) && { backgroundColor: colors.primary }
                ]}
              >
                <Text style={[styles.chipText, { color: colors.text }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {isVisible('status') && (
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
          <View style={styles.wrapRow}>
            {Object.values(TASK_STATUS).map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                onPress={() => toggleItem(selectedStatus, setSelectedStatus, value)}
                style={[
                  styles.chip,
                  { backgroundColor: colors.background, borderColor: colors.primary + '30' },
                  selectedStatus?.includes(value) && { backgroundColor: colors.primary }
                ]}
              >
                <Text style={[styles.chipText, { color: colors.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {isVisible('priority') && (
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Prioridade</Text>
          <View style={styles.wrapRow}>
            {Object.values(TASK_PRIORITIES).map((p: any) => (
              <TouchableOpacity
                key={p.value}
                onPress={() => toggleItem(selectedPriorities, setSelectedPriorities, p.value)}
                style={[
                  styles.chip,
                  { backgroundColor: colors.background, borderColor: colors.primary + '30' },
                  selectedPriorities?.includes(p.value) && { backgroundColor: colors.primary }
                ]}
              >
                <Text style={[styles.chipText, { color: colors.text }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {isVisible('createdByMe') && (
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Propriedade</Text>
          <TouchableOpacity
            onPress={toggleCreatedByMe}
            style={[
              styles.chip,
              { backgroundColor: colors.background, borderColor: colors.primary + '30' },
              createdByMe === 'me' && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
          >
            <Text style={[styles.chipText, { color: createdByMe === 'me' ? '#fff' : colors.text }]}>
              Criado por Mim
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isVisible('dateRange') && (
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Período</Text>
          <View style={styles.dateInputRow}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.primary + '20' }]}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.primary + '20' }]}
              placeholder="Fim"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginTop: 16 },
  scroll: { flexDirection: 'row' },
  row: { flexDirection: 'row', gap: 8 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  activeChip: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  chipText: { color: '#fff', fontSize: 12, textTransform: 'capitalize' },
  dateInputRow: { flexDirection: 'row', gap: 8 },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
    borderWidth: 1,
    borderColor: '#333'
  },
  sidebarTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
});