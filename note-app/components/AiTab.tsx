// note-app/components/AiTab.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import FolderTreeModal from "@/components/Modals/FolderTreeModal";
import { getUserId } from "@/utils/auth";
import { API_BASE } from "@/utils/api";
import { useFolderManager } from "@/hooks/useFolderManager";
import { useNoteManager } from "@/hooks/useNoteManager";

export default function AiTab() {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const { folders } = useFolderManager();
  const { notes } = useNoteManager();

  // 📄 PDF 직접 업로드
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      setFileName(file.name);
      setSelectedNoteId(null); // 직접 업로드 시 noteId 없음
      setLoading(true);

      const fileUri = file.uri;
      await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log("📄 업로드한 파일:", file.name);
      setLoading(false);
    } catch (err) {
      console.error("문서 선택 중 오류:", err);
      setLoading(false);
    }
  };

  // 📘 폴더 내 PDF 선택
  const handlePdfSelect = async (noteId: string, noteTitle?: string) => {
    console.log("📘 선택한 noteId:", noteId);
    setModalVisible(false);
    setLoading(true);

    try {
      const fileUrl = `${API_BASE}/notes/${noteId}/file`;

      setSelectedNoteId(noteId);
      setFileName(noteTitle || `note_${noteId}.pdf`);
      console.log("✅ 폴더에서 파일 선택 완료:", fileUrl);
    } catch (error) {
      console.error("❌ PDF 선택 처리 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🧠 문제 생성
  const handleGenerateQuiz = async () => {
    if (!selectedNoteId && !fileName) return;
    setLoading(true);

    try {
      const userId = await getUserId();
      console.log("🧠 문제 생성 요청:", selectedNoteId || fileName);

      // 예시 API
      const response = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, noteId: selectedNoteId, fileName }),
      });

      const result = await response.json();
      console.log("✅ 문제 생성 완료:", result);
      alert("문제 생성이 완료되었습니다!");
    } catch (error) {
      console.error("❌ 문제 생성 오류:", error);
      alert("문제 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 🔸 버튼 활성화 조건: 파일이 선택되어 있을 때
  const isQuizButtonActive = !!fileName;

  // =============== 문제 생성 서버 연결 ==============/


  return (
    <View style={styles.wrapper}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerText}>AI 기능</Text>
      </View>

      {/* 본문 */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* 설명 */}
        <Text style={styles.guideTitle}>📘 PDF를 업로드하고 문제를 풀어보세요!</Text>
        <Text style={styles.guideText}>
          AI가 문서를 분석하여 주요 내용을 기반으로 학습 문제를 자동으로 생성합니다.
        </Text>

        {/* 일러스트 */}
        <Image
          source={{ uri: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png" }}
          style={styles.image}
        />

        {/* 업로드 버튼 두 개 (가로 정렬) */}
        <View style={styles.buttonRow}>
          <Pressable onPress={pickDocument} style={[styles.button, styles.blueButton]}>
            <Text style={styles.buttonText}>📄 PDF 업로드</Text>
          </Pressable>

          <Pressable
            onPress={() => setModalVisible(true)}
            style={[styles.button, styles.greenButton]}
          >
            <Text style={styles.buttonText}>📂 폴더에서 선택</Text>
          </Pressable>
        </View>

        {/* 문제 생성 버튼 */}
        <Pressable
          onPress={isQuizButtonActive ? handleGenerateQuiz : undefined}
          style={[
            styles.button,
            styles.orangeButton,
            {
              marginTop: 18,
              opacity: isQuizButtonActive ? 1 : 0.6,
              backgroundColor: isQuizButtonActive ? "#FF9500" : "#C8C8C8",
            },
          ]}
          disabled={!isQuizButtonActive}
        >
          <Text style={styles.buttonText}>🧠 문제 생성</Text>
        </Pressable>

        {/* 로딩 표시 */}
        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>AI가 내용을 분석 중이에요...</Text>
          </View>
        )}

        {/* 선택된 파일 */}
        {fileName && <Text style={styles.fileName}>✅ 선택된 파일: {fileName}</Text>}
      </ScrollView>

      {/* 폴더 트리 모달 */}
      <FolderTreeModal
        visible={modalVisible}
        folders={folders}
        notes={notes}
        onClose={() => setModalVisible(false)}
        onSelectPdf={(noteId, title) => handlePdfSelect(noteId, title)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#F9FAFB" },

  header: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: "#f0f0f0",
  },
  headerText: { fontSize: 26, fontWeight: "bold", color: "#000" },

  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  guideTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
    marginBottom: 8,
    textAlign: "center",
  },
  guideText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
    width: "85%",
  },

  image: { width: 120, height: 120, marginBottom: 30, opacity: 0.9 },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  button: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 12,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  blueButton: {
    backgroundColor: "#007AFF",
    shadowColor: "#007AFF",
  },
  greenButton: {
    backgroundColor: "#34C759",
    shadowColor: "#34C759",
  },
  orangeButton: {
    backgroundColor: "#FF9500",
    shadowColor: "#FF9500",
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  loadingWrap: { flexDirection: "row", alignItems: "center", marginTop: 24 },
  loadingText: { marginLeft: 10, color: "#555", fontSize: 15 },

  fileName: {
    marginTop: 24,
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    textAlign: "center",
  },
});
