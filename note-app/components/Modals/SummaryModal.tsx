// note-app/components/Modals/SummaryModal.tsx
import React from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SummaryModalProps {
  visible: boolean;
  summary: string | null;
  onClose: () => void;
}

export default function SummaryModal({ visible, summary, onClose }: SummaryModalProps) {
  if (!summary) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>📘 요약 결과</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#333" />
            </Pressable>
          </View>

          {/* 본문 */}
          <ScrollView style={styles.scroll}>
            <Text style={styles.summaryText}>{summary}</Text>
          </ScrollView>

          {/* 닫기 버튼 */}
          <Pressable onPress={onClose} style={styles.footerButton}>
            <Text style={styles.footerText}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "85%",
    paddingVertical: 20,
    paddingHorizontal: 16,
    elevation: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
  },
  closeButton: {
    padding: 6,
  },
  scroll: {
    flexGrow: 0,
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  footerButton: {
    alignSelf: "center",
    marginTop: 6,
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  footerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
