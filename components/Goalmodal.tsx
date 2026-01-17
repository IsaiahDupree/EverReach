import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, ScrollView } from 'react-native';
import { X, Plus, Edit, Trash2, Check } from 'lucide-react-native';

export interface Goal {
  id: string;
  label: string;
  emoji?: string;
  cadenceDays?: number;
}

interface GoalModalProps {
  visible: boolean;
  goals: Goal[];
  activeGoalId?: string;
  onClose: () => void;
  onSelectGoal: (id: string) => void;
  onAddGoal: (goal: Goal) => void;
  onRenameGoal: (id: string, update: Partial<Goal>) => void;
  onDeleteGoal: (id: string) => void;
}

export default function GoalModal({ visible, goals, activeGoalId, onClose, onSelectGoal, onAddGoal, onRenameGoal, onDeleteGoal }: GoalModalProps) {
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [newCadence, setNewCadence] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const canAdd = newLabel.trim().length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    const goal: Goal = {
      id: `g_${Date.now()}`,
      label: newLabel.trim(),
      emoji: newEmoji.trim() || undefined,
      cadenceDays: newCadence ? Number(newCadence) : undefined,
    };
    onAddGoal(goal);
    setNewLabel('');
    setNewEmoji('');
    setNewCadence('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Goals</Text>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <X size={18} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 8 }}>
            {goals.map(g => (
              <View key={g.id} style={styles.row}>
                <TouchableOpacity style={styles.rowLeft} onPress={() => onSelectGoal(g.id)}>
                  <View style={[styles.check, activeGoalId === g.id && styles.checkActive]}>
                    {activeGoalId === g.id && <Check size={12} color="#fff" />}
                  </View>
                  <Text style={styles.rowText}>
                    {g.emoji ? `${g.emoji} ` : ''}{g.label}{g.cadenceDays ? ` • ${g.cadenceDays}d` : ''}
                  </Text>
                </TouchableOpacity>
                <View style={styles.rowRight}>
                  {editingId === g.id ? (
                    <>
                      <TextInput
                        value={editingLabel}
                        onChangeText={setEditingLabel}
                        style={styles.editInput}
                        placeholder="New label"
                      />
                      <TouchableOpacity
                        onPress={() => {
                          onRenameGoal(g.id, { label: editingLabel.trim() || g.label });
                          setEditingId(null);
                        }}
                        style={styles.smallBtn}
                      >
                        <Check size={14} color="#000" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity onPress={() => { setEditingId(g.id); setEditingLabel(g.label); }} style={styles.iconBtn}>
                        <Edit size={16} color="#000" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => onDeleteGoal(g.id)} style={styles.iconBtn}>
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.divider} />

          <View style={styles.addRow}>
            <TextInput
              value={newEmoji}
              onChangeText={setNewEmoji}
              style={[styles.input, styles.emojiInput]}
              placeholder="😀"
              maxLength={2}
            />
            <TextInput
              value={newLabel}
              onChangeText={setNewLabel}
              style={[styles.input, { flex: 1 }]}
              placeholder="New goal label"
            />
            <TextInput
              value={newCadence}
              onChangeText={setNewCadence}
              style={[styles.input, styles.cadenceInput]}
              placeholder="d"
              keyboardType="number-pad"
              maxLength={3}
            />
            <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, !canAdd && styles.addDisabled]} disabled={!canAdd}>
              <Plus size={16} color={canAdd ? '#fff' : '#999'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', padding: 16 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '600', color: '#000' },
  iconBtn: { padding: 6 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowText: { fontSize: 14, color: '#000' },
  check: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#e5e5e5', alignItems: 'center', justifyContent: 'center' },
  checkActive: { backgroundColor: '#000', borderColor: '#000' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 8, color: '#000' },
  emojiInput: { width: 44, textAlign: 'center' },
  cadenceInput: { width: 44, textAlign: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  addDisabled: { backgroundColor: '#e5e5e5' },
  editInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, minWidth: 120, color: '#000' },
  smallBtn: { padding: 6 },
});
