import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Folder } from '@/types/folder';

type Props = {
  visible: boolean;
  onClose: () => void;
  folderName: string;
  setFolderName: (name: string) => void;
  folderColor: string;
  setFolderColor: (color: string) => void;
  onSubmit: (idOrName?: string, nameMaybe?: string, colorMaybe?: string) => void; // ✅ 색상까지 전달
  editMode: boolean;
  colorOnly?: boolean;
  nameOnly?: boolean;
  selectedFolderId?: string | null; // ✅ ID 직접 전달
  folders?: Folder[];
};

const colors = [
  '#999', '#FFD700', '#FF7F50', '#87CEFA', '#90EE90',
  '#DDA0DD', '#FF69B4', '#FFA500', '#6A5ACD', '#20B2AA',
  '#A0522D', '#FF6347', '#00CED1', '#BDB76B', '#DC143C',
];

export default function FolderFormModal({
  visible,
  onClose,
  folderName,
  setFolderName,
  folderColor,
  setFolderColor,
  onSubmit,
  editMode,
  colorOnly = false,
  nameOnly = false,
  selectedFolderId,
}: Props) {
  // ✅ 색상 클릭 시 이름 변경처럼 onSubmit() 호출
  const handleColorSelect = (color: string) => {
    setFolderColor(color);

    console.log('🎨 색상 선택됨:', color, 'ID:', selectedFolderId);

    // 이름 변경처럼 onSubmit으로 통합
    if (editMode && selectedFolderId) {
      onSubmit(selectedFolderId, folderName, color);
    } else if (selectedFolderId) {
      onSubmit(selectedFolderId, undefined, color);
    }

    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {!colorOnly && (
            <>
              <Text style={styles.title}>
                {editMode ? '이름 변경' : '폴더 이름을 입력하세요'}
              </Text>
              <TextInput
                placeholder="예: 수학노트"
                style={styles.input}
                value={folderName}
                onChangeText={setFolderName}
              />
            </>
          )}

          {!nameOnly && (
            <>
              <Text style={{ fontWeight: 'bold', marginTop: 8 }}>폴더 색상 선택</Text>
              <View style={styles.colorGrid}>
                {colors.map(color => (
                  <TouchableOpacity
                    key={color}
                    onPress={() => handleColorSelect(color)}
                    style={[
                      styles.colorOption,
                      {
                        backgroundColor: color,
                        borderWidth: folderColor === color ? 2 : 0,
                        borderColor: '#000',
                      },
                    ]}
                  />
                ))}
              </View>
            </>
          )}

          {!colorOnly && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                if (editMode && selectedFolderId) {
                  onSubmit(selectedFolderId, folderName, folderColor);
                } else {
                  onSubmit(folderName);
                }
                onClose();
              }}
            >
              <Text style={styles.createButtonText}>
                {editMode ? '변경' : '생성'}
              </Text>
            </TouchableOpacity>
          )}

          <Pressable onPress={onClose}>
            <Text style={styles.cancel}>닫기</Text>
          </Pressable>
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
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 12,
    justifyContent: 'center',
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    margin: 4,
  },
  createButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancel: {
    marginTop: 16,
    color: '#999',
  },
});
