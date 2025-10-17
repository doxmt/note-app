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

interface Section {
  title: string;
  subtitle?: string;
  keywords?: string[];
  content: string;
  examples?: string[];
  takeaway?: string;
  insight?: string;
}

interface SummaryData {
  overview: string;
  sections: Section[];
  conclusion: string;
}

interface SummaryModalProps {
  visible: boolean;
  summary: SummaryData | null;
  onClose: () => void;
}

export default function SummaryModal({ visible, summary, onClose }: SummaryModalProps) {
  if (!summary) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 📘 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>📘 요약 결과</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color="#333" />
            </Pressable>
          </View>

          {/* 🧾 본문 */}
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
            <View style={styles.summaryCard}>
              {/* 전체 개요 */}
              {summary.overview ? (
                <View style={[styles.sectionBlock, { marginBottom: 20 }]}>
                  <Text style={styles.overviewTitle}>요약</Text>
                  <Text style={styles.overviewText}>{summary.overview}</Text>
                </View>
              ) : null}

              {/* 각 섹션 */}
              {summary.sections?.map((sec, i) => (
                <View key={i} style={styles.sectionBlock}>
                  {/* 제목 + 소제목 */}
                  <Text style={styles.sectionTitle}>{sec.title}</Text>
                  {sec.subtitle && (
                    <Text style={styles.sectionSubtitle}>{sec.subtitle}</Text>
                  )}

                  {/* 키워드 */}
                  {sec.keywords && sec.keywords.length > 0 && (
                    <View style={styles.keywordWrap}>
                      {sec.keywords.map((kw, idx) => (
                        <Text key={idx} style={styles.keywordTag}>
                          #{kw}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* 본문 */}
                  <Text style={styles.sectionContent}>{sec.content}</Text>

                  {/* 예시 */}
                  {sec.examples && sec.examples.length > 0 && (
                    <View style={styles.exampleBlock}>
                      <Text style={styles.exampleTitle}>📎 예시</Text>
                      {sec.examples.map((ex, idx) => (
                        <Text key={idx} style={styles.exampleText}>
                          • {ex}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* 학습 포인트 / 인사이트 */}
                  {sec.takeaway && (
                    <Text style={styles.takeaway}>💡 {sec.takeaway}</Text>
                  )}
                  {sec.insight && (
                    <Text style={styles.insight}>🔍 {sec.insight}</Text>
                  )}
                </View>
              ))}

              {/* 결론 */}
              {summary.conclusion ? (
                <View style={[styles.sectionBlock, { marginTop: 20 }]}>
                  <Text style={styles.conclusionTitle}>결론</Text>
                  <Text style={styles.conclusionText}>
                    {summary.conclusion}
                  </Text>
                </View>
              ) : null}
            </View>
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
  /* 배경 및 컨테이너 */
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    width: "100%",
    maxHeight: "85%",
    paddingVertical: 16,
    paddingHorizontal: 18,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },

  /* 헤더 */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#005BBB",
  },
  closeButton: {
    padding: 6,
  },

  /* 스크롤 */
  scroll: { flexGrow: 0 },
  scrollInner: { paddingBottom: 20 },

  /* 요약 카드 */
  summaryCard: {
    backgroundColor: "#F7FAFF",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: "#cde",
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  /* 공통 섹션 블록 */
  sectionBlock: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E7FF",
  },

  /* 개요 */
  overviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 6,
  },
  overviewText: {
    fontSize: 15,
    color: "#222",
    lineHeight: 24,
  },

  /* 섹션 타이틀 */
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
    paddingLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 6,
    marginLeft: 8,
  },
  sectionContent: {
    fontSize: 15,
    color: "#333",
    lineHeight: 25,
    marginTop: 4,
  },

  /* 키워드 */
  keywordWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 6,
    marginLeft: 4,
  },
  keywordTag: {
    backgroundColor: "#E0F0FF",
    color: "#007AFF",
    fontSize: 13,
    fontWeight: "500",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },

  /* 예시 */
  exampleBlock: {
    marginTop: 8,
    marginLeft: 6,
    backgroundColor: "#F0F7FF",
    borderRadius: 10,
    padding: 8,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#004C99",
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
  },

  /* 학습 포인트 */
  takeaway: {
    fontSize: 14,
    color: "#006400",
    fontWeight: "600",
    marginTop: 8,
  },
  insight: {
    fontSize: 14,
    color: "#FF6B00",
    fontWeight: "600",
    marginTop: 4,
  },

  /* 결론 */
  conclusionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FF6B00",
    marginBottom: 6,
  },
  conclusionText: {
    fontSize: 15,
    color: "#222",
    lineHeight: 25,
  },

  /* 닫기 버튼 */
  footerButton: {
    alignSelf: "center",
    marginTop: 14,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 42,
    borderRadius: 12,
  },
  footerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
