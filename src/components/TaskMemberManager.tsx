import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert,
    Modal, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TaskMember from '@/src/database/model/TaskMember';
import Task from '@/src/database/model/Task';

interface Props {
    task: Task;
    members: TaskMember[];
    colors: any;
}

const AVATAR_SIZE = 32;
const AVATAR_OVERLAP = 10;

export function TaskMembersManager({ task, members, colors }: Props) {
    const [popoverVisible, setPopoverVisible] = useState(false);
    const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<View>(null);

    const openPopover = () => {
        triggerRef.current?.measureInWindow((x, y, width, height) => {
            setPopoverPosition({ top: y + height + 8, left: x });
            setPopoverVisible(true);
        });
    };

    const handleRemoveMember = (member: TaskMember) => {
        const isCreator = member.userId === task.createdBy;

        if (isCreator) {
            Alert.alert(
                'Atenção',
                'Você é o criador desta tarefa. Remover a si mesmo apagará a tarefa para todos. Deseja continuar?',
                [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Apagar tudo', style: 'destructive',
                        onPress: async () => {
                            setPopoverVisible(false);
                            await task.database.write(async () => { await task.markAsDeleted(); });
                        },
                    },
                ]
            );
            return;
        }

        Alert.alert(
            'Remover Membro',
            `Deseja remover ${member.userName} desta tarefa?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Remover', style: 'destructive',
                    onPress: async () => {
                        await task.database.write(async () => { await member.markAsDeleted(); });
                    },
                },
            ]
        );
    };

    const visibleMembers = members.slice(0, 4);
    const overflow = members.length - 4;
    const totalWidth = AVATAR_SIZE + (visibleMembers.length - 1) * (AVATAR_SIZE - AVATAR_OVERLAP) + (overflow > 0 ? AVATAR_SIZE - AVATAR_OVERLAP : 0);

    return (
        <>
            {/* Trigger — grupo de avatares */}
            <TouchableOpacity
                ref={triggerRef}
                onPress={openPopover}
                activeOpacity={0.7}
                style={{ width: Math.max(totalWidth, AVATAR_SIZE), height: AVATAR_SIZE }}
            >
                <View style={styles.avatarGroup}>
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
                            <Text style={[styles.avatarLetter, { color: colors.textSecondary }]}>
                                +{overflow}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            {/* Popover */}
            <Modal visible={popoverVisible} transparent animationType="fade" onRequestClose={() => setPopoverVisible(false)}>
                <TouchableWithoutFeedback onPress={() => setPopoverVisible(false)}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>

                <View style={[
                    styles.popover,
                    {
                        top: popoverPosition.top,
                        left: popoverPosition.left,
                        backgroundColor: colors.modalBackground,
                        borderColor: colors.modalBorder,
                    },
                ]}>
                    <Text style={[styles.popoverTitle, { color: colors.textMuted }]}>
                        {members.length} {members.length === 1 ? 'membro' : 'membros'}
                    </Text>

                    {members.map((member, index) => {
                        const isCreator = member.userId === task.createdBy;
                        const isLast = index === members.length - 1;

                        return (
                            <View
                                key={member.id}
                                style={[
                                    styles.memberRow,
                                    !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
                                ]}
                            >
                                <View style={[styles.avatarSmall, { backgroundColor: colors.primarySurface }]}>
                                    <Text style={[styles.avatarLetter, { color: colors.primary, fontSize: 12 }]}>
                                        {member.userName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>

                                <View style={styles.memberInfo}>
                                    <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                                        {member.userName}
                                    </Text>
                                    {isCreator && (
                                        <Text style={[styles.creatorBadge, { color: colors.primary }]}>Criador</Text>
                                    )}
                                </View>
                                {!isCreator && (
                                    <TouchableOpacity
                                        onPress={() => handleRemoveMember(member)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                        <Ionicons name="close" size={18} color={colors.danger} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    avatarGroup: {
        flexDirection: 'row',
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
        fontWeight: '700',
    },
    popover: {
        position: 'absolute',
        minWidth: 220,
        maxWidth: 280,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 12,
        zIndex: 999,
    },
    popoverTitle: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 10,
    },
    avatarSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    memberInfo: {
        flex: 1,
        gap: 2,
    },
    memberName: {
        fontSize: 14,
        fontWeight: '500',
    },
    creatorBadge: {
        fontSize: 11,
        fontWeight: '600',
    },
});