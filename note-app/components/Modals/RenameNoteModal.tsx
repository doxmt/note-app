// 이름 변경용 모달 (components/Modals/RenameNoteModal.tsx)
import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function RenameNoteModal({ visible, onClose, onSubmit }) {
  const [newName, setNewName] = useState('');

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>새 이름을 입력하세요</Text>
          <TextInput
            value={newName}
            onChangeText={setNewName}
            placeholder="새 이름"
            style={styles.input}
          />

          <View style={styles.row}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancel}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onSubmit(newName);
                setNewName('');
              }}
            >
              <Text style={styles.ok}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    width: '80%',
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  cancel: { color: '#888', fontSize: 16 },
  ok: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
});
