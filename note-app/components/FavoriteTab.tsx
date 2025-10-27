import React, { useEffect, useState } from "react";
import { View, ScrollView, Image, Text, TouchableOpacity, StyleSheet } from "react-native";
import Header from "@/components/Header";
import { API_BASE, BASE_URL } from "@/utils/api";
import { getUserId } from "@/utils/auth";
import { useRouter } from "expo-router";

export default function FavoriteTab() {
  const [favoriteNotes, setFavoriteNotes] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const userId = await getUserId();
      if (!userId) return;

      try {
        const res = await fetch(`${API_BASE}/api/notes?userId=${userId}&isFavorite=true`);
        const data = await res.json();
        setFavoriteNotes(data.notes || []);
      } catch (err) {
        console.error("🚨 즐겨찾기 노트 불러오기 오류:", err);
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header title="즐겨찾기" showLogout />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.noteGrid}>
          {favoriteNotes.length === 0 ? (
            <Text style={styles.emptyText}>즐겨찾기한 노트가 없습니다.</Text>
          ) : (
            favoriteNotes.map((note) => (
              <TouchableOpacity
                key={note._id}
                style={styles.noteCard}
                onPress={() => router.push(`/pdf-editor?noteId=${note.noteId}`)}
              >
                {note.pageImageIds?.[0] ? (
                  <Image
                    source={{ uri: `${BASE_URL}/api/notes/page/${note.pageImageIds[0]}` }}
                    style={styles.thumb}
                  />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={{ color: "#aaa" }}>미리보기 없음</Text>
                  </View>
                )}
                <Text style={styles.noteName}>{note.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16 },
  noteGrid: { flexDirection: "row", flexWrap: "wrap", gap: 20, justifyContent: "flex-start" },
  noteCard: { width: 150, alignItems: "center", marginBottom: 24 },
  thumb: { width: 150, height: 120, borderRadius: 10 },
  placeholder: {
    width: 150, height: 120, backgroundColor: "#eee",
    alignItems: "center", justifyContent: "center", borderRadius: 10,
  },
  noteName: { marginTop: 6, fontWeight: "500" },
  emptyText: { marginTop: 60, textAlign: "center", color: "#888" },
});
