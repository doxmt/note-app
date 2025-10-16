// note-app/components/AiTab.tsx
import React, { useState } from "react";
import Header from '@/components/Header';
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
import { API_BASE, API_BASE_QUIZ } from "@/utils/api"; // ✅ Node + Flask 둘 다 import
import { useFolderManager } from "@/hooks/useFolderManager";
import { useNoteManager } from "@/hooks/useNoteManager";
import QuizModal from "@/components/Modals/QuizModal";

export default function AiTab() {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const { folders } = useFolderManager();
  const { notes } = useNoteManager();

  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [quizData, setQuizData] = useState<any>(null);

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
      console.log("📄 업로드한 파일:", file.name);
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
  };

  // 🧠 문제 생성 (Node → Flask)
  const handleGenerateQuiz = async () => {
    if (!selectedNoteId && !fileName) return;
    setLoading(true);

    try {
      const userId = await getUserId();

     const nodeFileUrl = `${API_BASE}/api/notes/${selectedNoteId}/file`;

     // 1️⃣ Node 서버에서 PDF 다운로드
     const localPath = `${FileSystem.cacheDirectory}${fileName}`;
     console.log("📥 Node 서버 → 로컬 저장:", localPath);
     const downloadRes = await FileSystem.downloadAsync(nodeFileUrl, localPath);

     if (downloadRes.status !== 200) throw new Error("Node PDF 다운로드 실패");

     // 2️⃣ Flask 서버로 FormData 전송
     const formData = new FormData();
     formData.append("pdf_file", {
       uri: localPath,
       type: "application/pdf",
       name: fileName || "document.pdf",
     } as any);

     const textRes = await fetch(`${API_BASE_QUIZ}/extract-text`, {
       method: "POST",
       headers: {
         "Content-Type": "multipart/form-data",
       },
       body: formData,
     });

      const textRaw = await textRes.text();
      let textData;
      try {
        textData = JSON.parse(textRaw);
      } catch {
        console.error("⚠️ Flask 응답(JSON 아님):", textRaw);
        alert("Flask 서버 응답이 올바르지 않습니다.");
        return;
      }

      const { text } = textData;
      console.log("🧾 추출된 텍스트 길이:", text?.length);

      // 3️⃣ Flask: /extract-keywords 호출
      const keywordsRes = await fetch(`${API_BASE_QUIZ}/extract-keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const { keywords } = await keywordsRes.json();
      console.log("🔑 추출된 키워드:", keywords);

      // 4️⃣ Flask: /extract-sentences 호출 → 문제 생성
      const quizRes = await fetch(`${API_BASE_QUIZ}/extract-sentences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, keywords }),
      });

      const quizRaw = await quizRes.text();
      let result;
      try {
        result = JSON.parse(quizRaw);
      } catch {
        console.error("⚠️ Flask 응답(JSON 아님):", quizRaw);
        alert("문제 생성 중 오류가 발생했습니다. Flask 로그를 확인하세요.");
        return;
      }

      console.log("✅ 문제 생성 완료:", result);
      setQuizData(result);
      setQuizModalVisible(true);

    } catch (error: any) {
      console.error("❌ 문제 생성 오류:", error);
      alert(error.message || "문제 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const isQuizButtonActive = !!fileName;

  return (
    <View style={styles.wrapper}>
      <Header title="AI 문제 생성" showLogout />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.guideTitle}>📘 PDF를 업로드하고 문제를 풀어보세요!</Text>
        <Text style={styles.guideText}>
          AI가 문서를 분석하여 주요 내용을 기반으로 학습 문제를 자동으로 생성합니다.
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

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>AI가 내용을 분석 중이에요...</Text>
          </View>
        )}

        {fileName && <Text style={styles.fileName}>✅ 선택된 파일: {fileName}</Text>}
      </ScrollView>

      <FolderTreeModal
        visible={modalVisible}
        folders={folders}
        notes={notes}
        onClose={() => setModalVisible(false)}
        onSelectPdf={(noteId, title) => handlePdfSelect(noteId, title)}
      />

       {quizModalVisible && quizData && (
              <QuizModal
                visible={quizModalVisible}
                onClose={() => setQuizModalVisible(false)}
                quizData={quizData}
              />
            )}
    </View>
  );
}

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
