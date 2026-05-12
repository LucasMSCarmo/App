import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TaskMember from '@/src/database/model/TaskMember';
import Task from '@/src/database/model/Task';

interface Props {
    task: Task;
    members: TaskMember[];
    currentUserId: string | undefined;
    colors: any;
}

export function TaskMembersManager({ task, members, currentUserId, colors }: Props) {
    const [expanded, setExpanded] = useState(false);

    const toggleExpanded = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    };

    const handleRemoveMember = (member: TaskMember) => {
        // Regra 1: Se o usuário é o criador
        const isCreator = member.userId === task.createdBy;

        if (isCreator) {
            Alert.alert(
                "Atenção",
                "Você é o criador desta tarefa. Remover a si mesmo apagará a tarefa para todos. Deseja continuar?",
                [
                    { text: "Cancelar", style: "cancel" },
                    {
                        text: "Apagar tudo",
                        style: "destructive",
                        onPress: async () => {
                            await task.database.write(async () => {
                                await task.markAsDeleted();
                            });
                        }
                    }
                ]
            );
            return;
        }

        // Regra 2: Apenas o criador ou o próprio membro pode se remover (opcional, adicionei para segurança)
        Alert.alert(
            "Remover Membro",
            `Deseja remover ${member.userName} desta tarefa?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Remover",
                    style: "destructive",
                    onPress: async () => {
                        await task.database.write(async () => {
                            await member.markAsDeleted();
                        });
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={toggleExpanded} activeOpacity={0.7}>
                <View style={styles.avatarGroup}>
                    {members.slice(0, 4).map((member, index) => (
                        <View
                            key={member.id}
                            style={[
                                styles.avatarCircle,
                                { backgroundColor: colors.primary, marginLeft: index === 0 ? 0 : -12 }
                            ]}
                        >
                            <Text style={styles.avatarLetter}>{member.userName.charAt(0).toUpperCase()}</Text>
                        </View>
                    ))}
                    {members.length > 4 && (
                        <View style={[styles.avatarCircle, { backgroundColor: '#444', marginLeft: -12 }]}>
                            <Text style={styles.avatarLetter}>+{members.length - 4}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.expandedList}>
                    {members.map(member => (
                        <View key={member.id} style={styles.memberRow}>
                            <View style={styles.memberInfo}>
                                <View style={[styles.avatarCircle, { backgroundColor: colors.primary, width: 30, height: 30 }]}>
                                    <Text style={styles.avatarLetter}>{member.userName.charAt(0)}</Text>
                                </View>
                                <Text style={[styles.memberName, { color: colors.text }]}>
                                    {member.userName} {member.userId === task.createdBy && "(Criador)"}
                                </Text>
                            </View>

                            <TouchableOpacity onPress={() => handleRemoveMember(member)}>
                                <Ionicons name="close-circle" size={22} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 20, borderRadius: 12, overflow: 'hidden' },
    headerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
    },
    avatarGroup: { flexDirection: 'row', alignItems: 'center' },
    avatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#121212',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLetter: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    rightSide: { flexDirection: 'row', alignItems: 'center' },
    expandedList: { marginTop: 8, paddingHorizontal: 8 },
    memberRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    memberName: { fontSize: 16 },
});