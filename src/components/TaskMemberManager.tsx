import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TaskMember from '@/src/database/model/TaskMember';
import Task from '@/src/database/model/Task';
import { userService } from '@/src/services/userService';
import { touchForSync } from '@/src/utils/syncMetadata';
import { toServerId } from '@/src/utils/syncPayloads';
import { taskService } from '@/src/services/taskService';

interface Props {
    task: Task;
    members: TaskMember[];
    colors: any;
}

const AVATAR_SIZE = 32;
const AVATAR_OVERLAP = 10;

export function TaskMembersManager({ task, members, colors }: Props) {
    const [expanded, setExpanded] = useState(false);
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const extraMembers = members.filter((member) => member.userId !== task.createdBy);

    if (extraMembers.length === 0) return null;

    const visibleMembers = extraMembers.slice(0, 4);
    const overflow = extraMembers.length - visibleMembers.length;
    const totalWidth = AVATAR_SIZE + (visibleMembers.length - 1) * (AVATAR_SIZE - AVATAR_OVERLAP) + (overflow > 0 ? AVATAR_SIZE - AVATAR_OVERLAP : 0);

    const handleRemoveMember = (member: TaskMember) => {
        Alert.alert(
            'Remover membro',
            `Deseja remover ${member.userName} desta tarefa?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await taskService.removeMember(toServerId(task), member.userId);
                            await task.database.write(async () => {
                                await member.markAsDeleted();
                            });
                        } catch (error: any) {
                            const message = error?.response?.data?.message ?? 'Membros só podem ser alterados online. Verifique a conexão e se a tarefa já foi sincronizada.';
                            Alert.alert('Erro', message);
                        }
                    },
                },
            ],
        );
    };

    const handleAddMember = async () => {
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail || isLoading) return;

        setIsLoading(true);
        try {
            const remoteUser = await userService.findByEmail(trimmedEmail);
            if (members.some((member) => member.userId === remoteUser.id)) {
                Alert.alert('Membro existente', 'Esse usuário já está nesta tarefa.');
                return;
            }

            await taskService.addMember(toServerId(task), remoteUser.id);
            await task.database.write(async () => {
                await task.collections.get<TaskMember>('task_members').create((record) => {
                    record.taskId = task.id;
                    record.userId = remoteUser.id;
                    record.userName = remoteUser.name;
                    touchForSync(record);
                });
            });
            setEmail('');
        } catch (error: any) {
            const message = error?.response?.data?.message ?? 'Membros só podem ser alterados online. Confira o e-mail, a conexão e se a tarefa já foi sincronizada.';
            Alert.alert('Erro', message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.wrap}>
            <TouchableOpacity
                onPress={() => setExpanded((value) => !value)}
                activeOpacity={0.75}
                style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
                <View style={[styles.avatarGroup, { width: Math.max(totalWidth, AVATAR_SIZE) }]}>
                    {visibleMembers.map((member, index) => (
                        <View
                            key={member.id}
                            style={[
                                styles.avatarCircle,
                                {
                                    backgroundColor: colors.primarySurface,
                                    borderColor: colors.background,
                                    left: index * (AVATAR_SIZE - AVATAR_OVERLAP),
                                },
                            ]}
                        >
                            <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                                {member.userName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    ))}
                    {overflow > 0 && (
                        <View
                            style={[
                                styles.avatarCircle,
                                {
                                    backgroundColor: colors.surfaceVariant,
                                    borderColor: colors.background,
                                    left: visibleMembers.length * (AVATAR_SIZE - AVATAR_OVERLAP),
                                },
                            ]}
                        >
                            <Text style={[styles.avatarLetter, { color: colors.textSecondary }]}>+{overflow}</Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.triggerText, { color: colors.textSecondary }]}>
                    {extraMembers.length} membro{extraMembers.length !== 1 ? 's' : ''}
                </Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {expanded && (
                <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {members.map((member) => {
                        const isCreator = member.userId === task.createdBy;
                        return (
                            <View key={member.id} style={[styles.memberRow, { borderBottomColor: colors.divider }]}>
                                <View style={[styles.avatarSmall, { backgroundColor: isCreator ? colors.successSurface : colors.primarySurface }]}>
                                    <Text style={[styles.avatarLetter, { color: isCreator ? colors.success : colors.primary, fontSize: 12 }]}>
                                        {member.userName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <View style={styles.memberInfo}>
                                    <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                                        {member.userName}
                                    </Text>
                                    {isCreator && <Text style={[styles.memberRole, { color: colors.success }]}>Criador</Text>}
                                </View>
                                {!isCreator && (
                                    <TouchableOpacity onPress={() => handleRemoveMember(member)} hitSlop={styles.hitSlop}>
                                        <Ionicons name="remove-circle-outline" size={20} color={colors.danger} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}

                    <View style={styles.addSection}>
                        <Text style={[styles.addTitle, { color: colors.textMuted }]}>Adicionar por e-mail</Text>
                        <View style={styles.emailRow}>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                placeholder="email@exemplo.com"
                                placeholderTextColor={colors.inputPlaceholder}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                style={[
                                    styles.emailInput,
                                    {
                                        backgroundColor: colors.inputBackground,
                                        borderColor: colors.inputBorder,
                                        color: colors.inputText,
                                    },
                                ]}
                            />
                            <TouchableOpacity
                                style={[styles.addButton, { backgroundColor: email.trim() ? colors.primary : colors.buttonDisabled }]}
                                onPress={handleAddMember}
                                disabled={!email.trim() || isLoading}
                                activeOpacity={0.75}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
                                ) : (
                                    <Ionicons name="person-add-outline" size={18} color={email.trim() ? colors.buttonPrimaryText : colors.buttonDisabledText} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flex: 1,
        gap: 8,
    },
    trigger: {
        minHeight: 40,
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    avatarGroup: {
        position: 'relative',
        height: AVATAR_SIZE,
    },
    avatarCircle: {
        position: 'absolute',
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLetter: {
        fontSize: 13,
        fontWeight: '800',
    },
    triggerText: {
        fontSize: 12,
        fontWeight: '700',
    },
    banner: {
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 9,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    avatarSmall: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    memberInfo: {
        flex: 1,
        gap: 2,
    },
    memberName: {
        fontSize: 14,
        fontWeight: '700',
    },
    memberRole: {
        fontSize: 11,
        fontWeight: '700',
    },
    addSection: {
        paddingTop: 10,
        gap: 8,
    },
    addTitle: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    emailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    emailInput: {
        flex: 1,
        minHeight: 40,
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 10,
        fontSize: 13,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hitSlop: {
        top: 8,
        bottom: 8,
        left: 8,
        right: 8,
    },
});
