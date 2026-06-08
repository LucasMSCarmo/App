import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Category from '@/src/database/model/Category';
import { useTheme } from '@/src/contexts/ThemeContext';
import {
  CATEGORY_COLORS,
  SelectableMember,
  createCategory,
} from '@/src/utils/taskRelations';

type Props = {
  categories: Category[];
  members: SelectableMember[];
  selectedCategoryIds: string[];
  selectedMembers: SelectableMember[];
  currentUserId: string;
  onChangeCategories: (ids: string[]) => void;
  onChangeMembers: (members: SelectableMember[]) => void;
  onCategoryCreated?: (category: Category) => void;
};

export function TaskRelationsSelector({
  categories,
  members,
  selectedCategoryIds,
  selectedMembers,
  currentUserId,
  onChangeCategories,
  onChangeMembers,
  onCategoryCreated,
}: Props) {
  const { colors } = useTheme();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);

  const toggleCategory = (categoryId: string) => {
    onChangeCategories(
      selectedCategoryIds.includes(categoryId)
        ? selectedCategoryIds.filter((id) => id !== categoryId)
        : [...selectedCategoryIds, categoryId],
    );
  };

  const toggleMember = (member: SelectableMember) => {
    const exists = selectedMembers.some((item) => item.userId === member.userId);
    onChangeMembers(
      exists
        ? selectedMembers.filter((item) => item.userId !== member.userId)
        : [...selectedMembers, member],
    );
  };

  const handleCreateCategory = async () => {
    const category = await createCategory(newCategoryName, selectedColor, currentUserId);
    if (!category) return;
    setNewCategoryName('');
    onCategoryCreated?.(category);
    onChangeCategories([...selectedCategoryIds, category.id]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.block}>
        <Text style={[styles.blockTitle, { color: colors.textSecondary }]}>Categorias</Text>
        <View style={styles.chipRow}>
          {categories.map((category) => {
            const isActive = selectedCategoryIds.includes(category.id);
            const categoryColor = category.color || colors.primary;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isActive && { backgroundColor: `${categoryColor}25`, borderColor: categoryColor },
                ]}
                onPress={() => toggleCategory(category.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.dot, { backgroundColor: categoryColor }]} />
                <Text style={[styles.chipText, { color: isActive ? categoryColor : colors.textSecondary }]} numberOfLines={1}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
          {categories.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma categoria criada.</Text>
          )}
        </View>

        <View style={styles.createCategoryRow}>
          <TextInput
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            placeholder="Nova categoria"
            placeholderTextColor={colors.inputPlaceholder}
            style={[
              styles.categoryInput,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.inputText,
              },
            ]}
          />
          <View style={styles.swatchRow}>
            {CATEGORY_COLORS.slice(0, 5).map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.swatch,
                  { backgroundColor: color, borderColor: selectedColor === color ? colors.text : 'transparent' },
                ]}
                onPress={() => setSelectedColor(color)}
                activeOpacity={0.7}
              />
            ))}
          </View>
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: newCategoryName.trim() ? colors.primarySurface : colors.buttonDisabled },
            ]}
            onPress={handleCreateCategory}
            disabled={!newCategoryName.trim()}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color={newCategoryName.trim() ? colors.primary : colors.buttonDisabledText} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.block}>
        <Text style={[styles.blockTitle, { color: colors.textSecondary }]}>Membros</Text>
        <View style={styles.chipRow}>
          {members.map((member) => {
            const isActive = selectedMembers.some((item) => item.userId === member.userId);
            return (
              <TouchableOpacity
                key={member.userId}
                style={[
                  styles.memberChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isActive && { backgroundColor: colors.primarySurface, borderColor: colors.primary },
                ]}
                onPress={() => toggleMember(member)}
                activeOpacity={0.7}
              >
                <View style={[styles.avatar, { backgroundColor: isActive ? colors.primary : colors.surfaceVariant }]}>
                  <Text style={[styles.avatarText, { color: isActive ? colors.buttonPrimaryText : colors.textSecondary }]}>
                    {member.userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.chipText, { color: isActive ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                  {member.userName}
                </Text>
              </TouchableOpacity>
            );
          })}
          {members.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Nenhum outro usuário conhecido ainda.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 16,
    marginBottom: 20,
  },
  block: {
    gap: 10,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    maxWidth: '100%',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  memberChip: {
    maxWidth: '100%',
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 5,
    paddingRight: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  createCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 5,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
