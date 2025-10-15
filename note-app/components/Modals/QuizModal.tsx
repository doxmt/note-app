import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  ScrollView,
} from "react-native";

interface Quiz {
  type: "blank" | "mcq" | "short";
  question: string;
  options?: string[];
  answer: string;
}

interface QuizModalProps {
  visible: boolean;
  onClose: () => void;
  quizData: { quizzes: Quiz[] };
}

export default function QuizModal({ visible, onClose, quizData }: QuizModalProps) {
  const [quizList, setQuizList] = useState<Quiz[]>(quizData.quizzes || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [round, setRound] = useState(1);
  const [results, setResults] = useState<boolean[]>([]);

  const [roundFinished, setRoundFinished] = useState(false);
  const [incorrectList, setIncorrectList] = useState<Quiz[]>([]);
  const [allDone, setAllDone] = useState(false);

  const currentQuiz = quizList[currentIndex];
  const total = quizList.length;

  const handleSubmit = () => {
    if (isAnswered) return;

    let correct = false;

    if (currentQuiz.type === "blank") {
      const normalized = userAnswer.trim().replace(/\s+/g, "");
      const answerNormalized = currentQuiz.answer.trim().replace(/\s+/g, "");

      // 🚫 빈 입력은 무조건 오답
      if (!normalized) {
        correct = false;
      } else {
        // ✅ 완전 일치만 정답 처리 (부분 일치 허용 X)
        correct = normalized === answerNormalized;
      }
    } else if (currentQuiz.type === "mcq") {
      correct = userAnswer === currentQuiz.answer;
    } else {
      // short 형은 채점 없이 정답 보기만
      correct = false;
    }

    setIsAnswered(true);
    setIsCorrect(correct);
    setResults((prev) => {
      const copy = [...prev];
      copy[currentIndex] = correct;
      return copy;
    });
  };



  const handleNext = () => {
    if (currentIndex + 1 < total) {
      setCurrentIndex((i) => i + 1);
      setUserAnswer("");
      setIsAnswered(false);
      setIsCorrect(null);
    } else {
      handleRoundFinish();
    }
  };

  const handleRoundFinish = () => {
    const incorrect = quizList.filter((_, i) => results[i] === false);
    if (incorrect.length === 0) {
      setAllDone(true);
    } else {
      setRoundFinished(true);
      setIncorrectList(incorrect);
    }
  };

  const restartIncorrect = () => {
    setQuizList(incorrectList);
    setCurrentIndex(0);
    setUserAnswer("");
    setIsAnswered(false);
    setIsCorrect(null);
    setResults([]);
    setRound((r) => r + 1);
    setRoundFinished(false);
  };

  const renderQuizContent = () => {
    // 🔸 라운드 종료 후 결과 화면
    if (roundFinished) {
      return (
        <View style={styles.center}>
          <Text style={styles.roundTitle}>Round {round} 결과</Text>
          <Text style={styles.summaryText}>
            ✅ 맞은 문제: {results.filter((r) => r).length} / {total}
          </Text>
          <Text style={styles.summaryText}>
            ❌ 틀린 문제: {results.filter((r) => !r).length}
          </Text>

          <View style={styles.buttonRow}>
            {incorrectList.length > 0 && (
              <Pressable style={[styles.button, styles.orangeButton]} onPress={restartIncorrect}>
                <Text style={styles.buttonText}>❌ 오답 다시 풀기</Text>
              </Pressable>
            )}
            <Pressable style={[styles.button, styles.grayButton]} onPress={onClose}>
              <Text style={styles.buttonText}>🚪 학습 종료</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // 🔸 모든 문제 완벽히 맞춘 경우
    if (allDone) {
      return (
        <View style={styles.center}>
          <Text style={styles.roundTitle}>🎉 모든 문제를 완벽하게 맞췄어요!</Text>
          <Pressable style={[styles.button, styles.blueButton]} onPress={onClose}>
            <Text style={styles.buttonText}>닫기</Text>
          </Pressable>
        </View>
      );
    }

    // 🔸 문제 풀이 화면
    return (
      <View style={{ flex: 1 }}>
        {/* 상단 바 (라운드 표시 + 학습 종료 버튼) */}
        <View style={styles.topBar}>
          <Text style={styles.roundTitle}>Round {round}</Text>
          <Pressable onPress={onClose} style={styles.exitButton}>
            <Text style={styles.exitText}>🚪 종료</Text>
          </Pressable>
        </View>

        <Text style={styles.questionCount}>
          문제 {currentIndex + 1} / {total}
        </Text>

        <ScrollView style={{ maxHeight: 300 }}>
          <Text style={styles.questionText}>{currentQuiz.question}</Text>

          {/* 입력 영역 */}
          {currentQuiz.type === "blank" && (
            <TextInput
              placeholder="정답을 입력하세요"
              value={userAnswer}
              onChangeText={setUserAnswer}
              editable={!isAnswered}
              style={styles.input}
            />
          )}

          {currentQuiz.type === "mcq" &&
            currentQuiz.options?.map((opt, idx) => (
              <Pressable
                key={idx}
                style={[
                  styles.option,
                  isAnswered && opt === currentQuiz.answer
                    ? { backgroundColor: "#4CAF50" }
                    : isAnswered && userAnswer === opt && opt !== currentQuiz.answer
                    ? { backgroundColor: "#F44336" }
                    : userAnswer === opt
                    ? { backgroundColor: "#ddd" }
                    : null,
                ]}
                onPress={() => !isAnswered && setUserAnswer(opt)}
              >
                <Text style={styles.optionText}>{opt}</Text>
              </Pressable>
            ))}

          {currentQuiz.type === "short" && (
            <Text style={styles.shortText}>이 문제는 서술형입니다. 정답을 직접 생각해보세요.</Text>
          )}
        </ScrollView>

        {/* 피드백 */}
        {isAnswered && (
          <View style={styles.feedbackBox}>
            {isCorrect ? (
              <Text style={styles.correctText}>✅ 정답입니다!</Text>
            ) : currentQuiz.type === "short" ? (
              <Text style={styles.correctText}>💡 정답: {currentQuiz.answer}</Text>
            ) : (
              <Text style={styles.incorrectText}>❌ 오답입니다. 정답: {currentQuiz.answer}</Text>
            )}
          </View>
        )}

        {/* 버튼 */}
        <View style={styles.buttonRow}>
          {!isAnswered ? (
            <Pressable style={[styles.button, styles.blueButton]} onPress={handleSubmit}>
              <Text style={styles.buttonText}>제출</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.button, styles.orangeButton]} onPress={handleNext}>
              <Text style={styles.buttonText}>
                {currentIndex + 1 === total ? "결과 보기" : "다음 문제"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.fullscreenOverlay}>
      <View style={styles.quizContainer}>{renderQuizContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenOverlay: {
    position: "absolute",
    top: 105,     // 헤더 높이 (유지)
    left: 0,     // ✅ 사이드바 영역까지 포함하게 변경
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 999,
  },

  quizContainer: {
    flex: 1,
    padding: 20,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  exitButton: {
    backgroundColor: "#999",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  exitText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  center: { alignItems: "center" },
  roundTitle: { fontSize: 20, fontWeight: "bold" },
  questionCount: { fontSize: 15, color: "#666", marginBottom: 8 },
  questionText: { fontSize: 17, marginBottom: 14, color: "#222", fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  shortText: { color: "#555", fontStyle: "italic", marginVertical: 10 },
  option: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  optionText: { fontSize: 15, color: "#333" },
  feedbackBox: { marginTop: 16, alignItems: "center" },
  correctText: { color: "#4CAF50", fontWeight: "bold", fontSize: 16 },
  incorrectText: { color: "#F44336", fontWeight: "bold", fontSize: 16 },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 10,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  blueButton: { backgroundColor: "#007AFF" },
  orangeButton: { backgroundColor: "#FF9500" },
  grayButton: { backgroundColor: "#999" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  summaryText: { fontSize: 16, marginVertical: 4, color: "#333" },
});
