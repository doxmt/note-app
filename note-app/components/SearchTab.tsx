// note-app/components/DocumentTab.tsx
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
import Header from "@/components/Header";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useFolderManager } from "@/hooks/useFolderManager";
import { useNoteManager } from "@/hooks/useNoteManager";
import FolderTreeModal from "@/components/Modals/FolderTreeModal";
import { getUserId } from "@/utils/auth";
import { API_BASE, API_BASE_QUIZ } from "@/utils/api";
import SummaryModal from "@/components/Modals/SummaryModal";


export default function DocumentTab() {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
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
      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      setFileName(file.name);
      setSelectedNoteId(null);
      setSummary(null);
      console.log("📄 선택된 PDF:", file.name);
    } catch (err) {
      console.error("문서 선택 중 오류:", err);
    }
  };

  // 📘 폴더 내 PDF 선택
  const handlePdfSelect = async (noteId: string, noteTitle?: string) => {
    console.log("📘 선택한 noteId:", noteId);
    setModalVisible(false);
    setSelectedNoteId(noteId);
    setFileName(noteTitle || `note_${noteId}.pdf`);
    setSummary(null);
  };

  // ✨ 요약 생성 (Flask /summarize-pdf)
  const handleSummarizePdf = async () => {
    if (!selectedNoteId && !fileName) return;
    setLoading(true);
    setSummary(null);

    try {
      const userId = await getUserId();
      const nodeFileUrl = `${API_BASE}/api/notes/${selectedNoteId}/file`;

      // 1️⃣ Node 서버 → 로컬 다운로드
      const localPath = `${FileSystem.cacheDirectory}${fileName}`;
      console.log("📥 Node 서버 → 로컬 저장:", localPath);
      const downloadRes = await FileSystem.downloadAsync(nodeFileUrl, localPath);

      if (downloadRes.status !== 200) throw new Error("PDF 다운로드 실패");

      // 2️⃣ Flask 서버로 FormData 전송
      const formData = new FormData();
      formData.append("pdf_file", {
        uri: localPath,
        type: "application/pdf",
        name: fileName || "document.pdf",
      } as any);

      console.log("🚀 Flask /summarize-pdf 호출 중...");
      const res = await fetch(`${API_BASE_QUIZ}/summarize-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });

      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        console.error("⚠️ Flask 응답(JSON 아님):", raw);
        alert("서버 응답이 올바르지 않습니다.");
        return;
      }

      console.log("✅ 요약 생성 완료:", data);
      setSummary(data.summary);
    } catch (err: any) {
      console.error("❌ 요약 오류:", err);
      alert(err.message || "PDF 요약 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const isSummaryButtonActive = !!fileName;

  return (
    <View style={styles.wrapper}>
      <Header title="PDF 요약" showLogout />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.guideTitle}>📝 PDF 요약 기능</Text>
        <Text style={styles.guideText}>
          AI가 문서를 분석하여 핵심 내용을 간결하게 요약해줍니다.
        </Text>

        <Image
          source={{ uri: "https://cdn-icons-png.flaticon.com/512/4712/4712027.png" }}
          style={styles.image}
        />

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

        <Pressable
          onPress={isSummaryButtonActive ? handleSummarizePdf : undefined}
          style={[
            styles.button,
            styles.orangeButton,
            {
              marginTop: 18,
              opacity: isSummaryButtonActive ? 1 : 0.6,
              backgroundColor: isSummaryButtonActive ? "#FF9500" : "#C8C8C8",
            },
          ]}
          disabled={!isSummaryButtonActive}
        >
          <Text style={styles.buttonText}>🧠 요약 생성</Text>
        </Pressable>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>AI가 내용을 분석 중이에요...</Text>
          </View>
        )}

        {fileName && <Text style={styles.fileName}>✅ 선택된 파일: {fileName}</Text>}

        <SummaryModal
          visible={!!summary}
          summary={summary}
          onClose={() => setSummary(null)}
        />

      </ScrollView>

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

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#fff" },
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
  blueButton: { backgroundColor: "#007AFF", shadowColor: "#007AFF" },
  greenButton: { backgroundColor: "#34C759", shadowColor: "#34C759" },
  orangeButton: { backgroundColor: "#FF9500", shadowColor: "#FF9500" },
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
  summaryBox: {
    marginTop: 30,
    padding: 18,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    width: "90%",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
});
