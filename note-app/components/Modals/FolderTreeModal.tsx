// components/Modals/FolderTreeModal.tsx
import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from "react-native";

import { Folder } from "@/types/folder";
import { Note } from "@/types/note";

type Props = {
  visible: boolean;
  folders: Folder[];
  notes: Note[];
  onClose: () => void;
  onSelectPdf: (noteId: string) => void;
  excludeId?: string | null;
};

const FolderTreeModal = ({
  visible,
  folders = [],
  notes = [],
  onClose,
  onSelectPdf,
  excludeId,
}: Props) => {
  /** 🔁 재귀적으로 폴더 및 하위 폴더+노트 렌더링 */
  const renderTree = (parentId: string | null = null, depth = 0): React.ReactNode[] => {
    return folders
      .filter((folder) => folder.parentId === parentId && folder._id !== excludeId)
      .map((folder) => (
        <View key={folder._id}>
          {/* 📁 폴더 */}
          <View style={[styles.folderRow, { paddingLeft: depth * 16 }]}>
            <Text style={styles.folderText}>📁 {folder.name}</Text>
          </View>

          {/* 📄 이 폴더에 속한 PDF들 */}
          {notes
            .filter((note) => note.folderId === folder._id)
            .map((note) => (
              <TouchableOpacity
                key={note.noteId}
                style={[styles.fileRow, { paddingLeft: (depth + 1) * 24 }]}
                onPress={() => onSelectPdf(note.noteId)}
              >
                <Text style={styles.fileText}>📄 {note.name}</Text>
              </TouchableOpacity>
            ))}

          {/* 📂 하위 폴더 + 그 안의 노트 재귀적으로 표시 */}
          {renderTree(folder._id, depth + 1)}
        </View>
      ));
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>폴더 및 PDF 목록</Text>

          <ScrollView style={styles.scrollContainer}>
            {/* 루트에 속한 PDF들 */}
            {notes
              .filter((note) => note.folderId === null)
              .map((note) => (
                <TouchableOpacity
                  key={note.noteId}
                  style={[styles.fileRow, { paddingLeft: 8 }]}
                  onPress={() => onSelectPdf(note.noteId)}
                >
                  <Text style={styles.fileText}>📄 {note.name}</Text>
                </TouchableOpacity>
              ))}

            {/* 📂 루트 폴더부터 재귀 렌더링 시작 */}
            {renderTree()}
          </ScrollView>

          <Pressable onPress={onClose}>
            <Text style={styles.cancel}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "85%",
    maxHeight: "85%",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  scrollContainer: {
    maxHeight: 400,
  },
  folderRow: {
    paddingVertical: 8,
  },
  folderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  fileRow: {
    paddingVertical: 6,
  },
  fileText: {
    fontSize: 15,
    color: "#555",
  },
  cancel: {
    marginTop: 16,
    textAlign: "center",
    color: "#999",
  },
});

export default FolderTreeModal;
