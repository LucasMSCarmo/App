import React, { useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Category from '@/src/database/model/Category';
import { useTheme } from '@/src/contexts/ThemeContext';

type Props = {
    categories: Category[];
    selectedCategoryIds: string[];
    onChange: (ids: string[]) => void;
};

export function TaskCategoryPicker({ categories, selectedCategoryIds, onChange }: Props) {
    const { colors } = useTheme();
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState('');

    const selected = useMemo(
        () => categories.filter((category) => selectedCategoryIds.includes(category.id)),
        [categories, selectedCategoryIds],
    );

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return categories;
        return categories.filter((category) => category.name.toLowerCase().includes(term));
    }, [categories, search]);

    const toggleCategory = (id: string) => {
        onChange(
            selectedCategoryIds.includes(id)
                ? selectedCategoryIds.filter((item) => item !== id)
                : [...selectedCategoryIds, id],
        );
    };

    return (
        <View style={styles.wrap}>
            <TouchableOpacity
                style={[styles.trigger, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                onPress={() => setVisible(true)}
                activeOpacity={0.75}
            >
                <Ionicons name="pricetags-outline" size={18} color={selected.length ? colors.primary : colors.inputIcon} />
                <View style={styles.triggerContent}>
                    <Text style={[styles.triggerTitle, { color: selected.length ? colors.text : colors.inputPlaceholder }]}>
                        {selected.length ? `${selected.length} categoria${selected.length !== 1 ? 's' : ''}` : 'Selecionar categorias'}
                    </Text>
                    {selected.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedRow}>
                            {selected.map((category) => (
                                <View key={category.id} style={[styles.selectedChip, { backgroundColor: (category.color || colors.primary) + '24' }]}>
                                    <View style={[styles.dot, { backgroundColor: category.color || colors.primary }]} />
                                    <Text style={[styles.selectedText, { color: category.color || colors.primary }]} numberOfLines={1}>
                                        {category.name}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </View>
                <Ionicons name="chevron-down" size={17} color={colors.textMuted} />
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="slide"
                onRequestClose={() => setVisible(false)}
                statusBarTranslucent
            >
                <TouchableWithoutFeedback onPress={() => setVisible(false)}>
                    <View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]} />
                </TouchableWithoutFeedback>

                <View style={[styles.sheet, { backgroundColor: colors.modalBackground, borderColor: colors.modalBorder }]}>
                    <View style={[styles.handle, { backgroundColor: colors.modalHandle }]} />
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Categorias</Text>
                        <TouchableOpacity onPress={() => setVisible(false)} hitSlop={styles.hitSlop}>
                            <Ionicons name="close" size={22} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                        <Ionicons name="search" size={17} color={colors.inputIcon} />
                        <TextInput
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Buscar categoria"
                            placeholderTextColor={colors.inputPlaceholder}
                            style={[styles.searchInput, { color: colors.inputText }]}
                        />
                    </View>

                    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                        {filtered.map((category) => {
                            const active = selectedCategoryIds.includes(category.id);
                            const categoryColor = category.color || colors.primary;
                            return (
                                <TouchableOpacity
                                    key={category.id}
                                    style={[
                                        styles.categoryRow,
                                        {
                                            backgroundColor: active ? categoryColor + '18' : colors.surface,
                                            borderColor: active ? categoryColor : colors.border,
                                        },
                                    ]}
                                    onPress={() => toggleCategory(category.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
                                    <Text style={[styles.categoryName, { color: active ? categoryColor : colors.text }]} numberOfLines={1}>
                                        {category.name}
                                    </Text>
                                    <Ionicons
                                        name={active ? 'checkmark-circle' : 'ellipse-outline'}
                                        size={20}
                                        color={active ? categoryColor : colors.textMuted}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                        {filtered.length === 0 && (
                            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Nenhuma categoria encontrada.</Text>
                        )}
                    </ScrollView>

                    <TouchableOpacity
                        style={[styles.doneButton, { backgroundColor: colors.buttonPrimary }]}
                        onPress={() => setVisible(false)}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.doneText, { color: colors.buttonPrimaryText }]}>Concluir</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        marginBottom: 18,
    },
    trigger: {
        minHeight: 52,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    triggerContent: {
        flex: 1,
        gap: 7,
    },
    triggerTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    selectedRow: {
        gap: 6,
        paddingRight: 8,
    },
    selectedChip: {
        minHeight: 24,
        maxWidth: 130,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
    },
    selectedText: {
        fontSize: 11,
        fontWeight: '700',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: '78%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderTopWidth: StyleSheet.hairlineWidth,
        padding: 20,
        paddingTop: 12,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    modalTitle: {
        fontSize: 19,
        fontWeight: '800',
    },
    searchBox: {
        minHeight: 46,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        paddingHorizontal: 12,
        marginBottom: 14,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 0,
    },
    list: {
        gap: 8,
        paddingBottom: 14,
    },
    categoryRow: {
        minHeight: 46,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
    },
    categoryDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    categoryName: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 13,
        paddingVertical: 24,
    },
    doneButton: {
        minHeight: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneText: {
        fontSize: 15,
        fontWeight: '800',
    },
    hitSlop: {
        top: 8,
        bottom: 8,
        left: 8,
        right: 8,
    },
});
