import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Category from '@/src/database/model/Category';
import { database } from '@/src/database';
import { useTheme } from '@/src/contexts/ThemeContext';
import { CATEGORY_COLORS, createCategory } from '@/src/utils/taskRelations';
import { addSyncTombstone, markDeletedForSync, nowForSync, touchForSync } from '@/src/utils/syncMetadata';
import { enqueueSyncAction } from '@/src/database/syncQueue';
import { categoryPayload, toServerId } from '@/src/utils/syncPayloads';

type Props = {
  userId: string;
};

export function CategoryManager({ userId }: Props) {
  const { colors } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingColor, setEditingColor] = useState('');

  const normalizeColor = (value: string) => {
    const trimmed = value.trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : CATEGORY_COLORS[0];
  };

  const loadCategories = useCallback(async () => {
    const rows = await database.get<Category>('categories').query().fetch();
    setCategories(rows.filter((category) => category.createdBy === userId));
  }, [userId]);

  useEffect(() => {
    loadCategories().catch((error) => console.error('Erro ao carregar categorias:', error));
  }, [loadCategories]);

  const handleCreate = async () => {
    const category = await createCategory(name, normalizeColor(selectedColor), userId);
    if (!category) return;
    await enqueueSyncAction('category.create', {
      category: categoryPayload(category),
    });
    setName('');
    setSelectedColor(CATEGORY_COLORS[0]);
    await loadCategories();
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
    setEditingColor(category.color || CATEGORY_COLORS[0]);
  };

  const handleRename = async (category: Category) => {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    await database.write(async () => {
      await category.update((record) => {
        record.name = trimmed;
        record.color = normalizeColor(editingColor);
        touchForSync(record);
      });
    });
    await enqueueSyncAction('category.update', {
      category: categoryPayload(category),
    });
    setEditingId(null);
    setEditingName('');
    await loadCategories();
  };

  const handleDelete = (category: Category) => {
    Alert.alert(
      'Remover categoria',
      `Remover "${category.name}"? As tarefas deixam de exibir esta categoria.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const deletedAt = nowForSync();
            await database.write(async () => {
              await addSyncTombstone({
                table: 'categories',
                id: category.id,
                serverId: category.serverId,
                deletedAt,
              });
              await category.update((record) => markDeletedForSync(record, deletedAt));
              await category.markAsDeleted();
            });
            await enqueueSyncAction('category.delete', {
              id: toServerId(category),
              updatedAt: new Date(deletedAt).toISOString(),
            });
            await loadCategories();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.createRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nova categoria"
          placeholderTextColor={colors.inputPlaceholder}
          style={[
            styles.input,
            { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText },
          ]}
        />
        <TextInput
          value={selectedColor}
          onChangeText={setSelectedColor}
          placeholder="#3B82F6"
          placeholderTextColor={colors.inputPlaceholder}
          autoCapitalize="characters"
          maxLength={7}
          style={[
            styles.colorInput,
            { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, color: colors.inputText },
          ]}
        />
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: name.trim() ? colors.primary : colors.buttonDisabled }]}
          onPress={handleCreate}
          disabled={!name.trim()}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={name.trim() ? colors.buttonPrimaryText : colors.buttonDisabledText} />
        </TouchableOpacity>
      </View>

      <View style={styles.swatchRow}>
        {CATEGORY_COLORS.map((color) => (
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

      <View style={styles.list}>
        {categories.map((category) => (
          <View key={category.id} style={[styles.categoryRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View style={[styles.categoryDot, { backgroundColor: category.color || colors.primary }]} />
            {editingId === category.id ? (
              <View style={styles.editGroup}>
                <TextInput
                  value={editingName}
                  onChangeText={setEditingName}
                  style={[styles.editInput, { color: colors.inputText, borderColor: colors.inputBorder }]}
                  autoFocus
                />
                <TextInput
                  value={editingColor}
                  onChangeText={setEditingColor}
                  style={[styles.editColorInput, { color: colors.inputText, borderColor: colors.inputBorder }]}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
            ) : (
              <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
                {category.name}
              </Text>
            )}
            <View style={styles.rowActions}>
              {editingId === category.id ? (
                <TouchableOpacity onPress={() => handleRename(category)} hitSlop={styles.hitSlop}>
                  <Ionicons name="checkmark" size={19} color={colors.success} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => startEditing(category)} hitSlop={styles.hitSlop}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => handleDelete(category)} hitSlop={styles.hitSlop}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {categories.length === 0 && (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma categoria criada ainda.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: 14,
    gap: 12,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  colorInput: {
    width: 86,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },
  list: {
    gap: 8,
  },
  categoryRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
  },
  categoryDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  editInput: {
    flex: 1,
    minHeight: 34,
    borderBottomWidth: StyleSheet.hairlineWidth,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
  },
  editGroup: {
    flex: 1,
    gap: 4,
  },
  editColorInput: {
    minHeight: 28,
    borderBottomWidth: StyleSheet.hairlineWidth,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 0,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
  },
  hitSlop: {
    top: 8,
    bottom: 8,
    left: 8,
    right: 8,
  },
});
