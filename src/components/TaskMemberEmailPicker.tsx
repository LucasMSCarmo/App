import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/contexts/ThemeContext';
import { RemoteUser, userService } from '@/src/services/userService';

export type TaskMemberSelection = {
  id: string;
  name: string;
  email?: string;
};

type Props = {
  selectedMembers: TaskMemberSelection[];
  currentUserId?: string;
  onChange: (members: TaskMemberSelection[]) => void;
  disabled?: boolean;
  disabledMessage?: string;
};

export function TaskMemberEmailPicker({
  selectedMembers,
  currentUserId,
  onChange,
  disabled,
  disabledMessage = 'Membros só podem ser alterados online.',
}: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [candidate, setCandidate] = useState<RemoteUser | null>(null);
  const [loading, setLoading] = useState(false);

  const searchUser = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || loading) return;

    if (disabled) {
      Alert.alert('Indisponível', disabledMessage);
      return;
    }

    setLoading(true);
    setCandidate(null);
    try {
      const user = await userService.findByEmail(trimmed);
      if (user.id === currentUserId) {
        Alert.alert('Você já participa', 'Você já é membro da tarefa como criador.');
        return;
      }
      if (selectedMembers.some((member) => member.id === user.id)) {
        Alert.alert('Membro existente', 'Esse usuário já foi selecionado.');
        return;
      }
      setCandidate(user);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'Não encontrei nenhum usuário com esse e-mail.';
      Alert.alert('Usuário não encontrado', message);
    } finally {
      setLoading(false);
    }
  };

  const selectCandidate = () => {
    if (!candidate) return;
    onChange([
      ...selectedMembers,
      {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
      },
    ]);
    setEmail('');
    setCandidate(null);
  };

  const removeMember = (id: string) => {
    if (disabled) {
      Alert.alert('Indisponível', disabledMessage);
      return;
    }
    onChange(selectedMembers.filter((member) => member.id !== id));
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.searchBox, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder, opacity: disabled ? 0.65 : 1 }]}>
        <Ionicons name="mail-outline" size={17} color={colors.inputIcon} />
        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setCandidate(null);
          }}
          placeholder="email@exemplo.com"
          placeholderTextColor={colors.inputPlaceholder}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!disabled}
          style={[styles.input, { color: colors.inputText }]}
          onSubmitEditing={searchUser}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: email.trim() && !disabled ? colors.primary : colors.buttonDisabled }]}
          onPress={searchUser}
          disabled={!email.trim() || loading || disabled}
          activeOpacity={0.75}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.buttonPrimaryText} />
          ) : (
            <Ionicons name="search" size={17} color={email.trim() && !disabled ? colors.buttonPrimaryText : colors.buttonDisabledText} />
          )}
        </TouchableOpacity>
      </View>

      {candidate && (
        <TouchableOpacity
          style={[styles.candidateRow, { backgroundColor: colors.primarySurface, borderColor: colors.primary }]}
          onPress={selectCandidate}
          activeOpacity={0.75}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.buttonPrimaryText }]}>
              {candidate.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.candidateInfo}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{candidate.name}</Text>
            <Text style={[styles.email, { color: colors.textMuted }]} numberOfLines={1}>{candidate.email}</Text>
          </View>
          <Ionicons name="add-circle" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}

      {selectedMembers.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedRow}>
          {selectedMembers.map((member) => (
            <View key={member.id} style={[styles.chip, { backgroundColor: colors.primarySurface }]}>
              <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>
                {member.name}
              </Text>
              <TouchableOpacity onPress={() => removeMember(member.id)} hitSlop={styles.hitSlop}>
                <Ionicons name="close" size={15} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {disabled && (
        <Text style={[styles.disabledText, { color: colors.textMuted }]}>
          {disabledMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  searchBox: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 12,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candidateRow: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  candidateInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '800',
  },
  email: {
    fontSize: 11,
    fontWeight: '500',
  },
  selectedRow: {
    gap: 6,
    paddingRight: 8,
  },
  chip: {
    minHeight: 28,
    maxWidth: 150,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  disabledText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  hitSlop: {
    top: 8,
    bottom: 8,
    left: 8,
    right: 8,
  },
});
