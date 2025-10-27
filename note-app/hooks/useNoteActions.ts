import * as FileSystem from "expo-file-system/legacy";
import { API_BASE } from "@/utils/api";

/**
 * 📦 노트 이름 변경 / 삭제 / 이동 / 즐겨찾기 액션 전용 훅
 */
export const useNoteActions = (reloadNotes?: () => Promise<void> | void) => {
  const handleNoteAction = async (
    action: "rename" | "delete" | "move" | "favorite", // ✅ favorite 추가
    noteId: string,
    extra?: any
  ) => {
    const folderPath = `${FileSystem.documentDirectory}notes/${noteId}.note/`;
    const metaPath = `${folderPath}metadata.json`;
    console.log("🧭 handleNoteAction 시작:", action, noteId, metaPath);

    try {
      // ✅ 폴더 존재 보장
      const folderInfo = await FileSystem.getInfoAsync(folderPath);
      if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });
      }

      // ✅ metadata.json 존재 보장
      const metaInfo = await FileSystem.getInfoAsync(metaPath);
      if (!metaInfo.exists) {
        await FileSystem.writeAsStringAsync(
          metaPath,
          JSON.stringify({
            id: noteId,
            name: "Unknown",
            createdAt: new Date().toISOString(),
            folderId: null,
          })
        );
      }

      // ✅ 메타데이터 로드
      const metaStr = await FileSystem.readAsStringAsync(metaPath);
      const meta = JSON.parse(metaStr);

      switch (action) {
        // ─────────────────────────────────────────────
        // ✏️ 이름 변경
        case "rename": {
          const newName = extra?.newName?.trim();
          if (!newName) return;

          meta.name = newName;
          await FileSystem.writeAsStringAsync(metaPath, JSON.stringify(meta));

          await fetch(`${API_BASE}/api/notes/${noteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: newName }),
          });
          break;
        }

        // ─────────────────────────────────────────────
        // 🗑️ 삭제
        case "delete": {
          const noteFolderPath = `${FileSystem.documentDirectory}notes/${noteId}.note`;
          const delInfo = await FileSystem.getInfoAsync(noteFolderPath);
          if (delInfo.exists) {
            await FileSystem.deleteAsync(noteFolderPath, { idempotent: true });
          }

          await fetch(`${API_BASE}/api/notes/${noteId}`, { method: "DELETE" });
          break;
        }

        // ─────────────────────────────────────────────
        // 📂 폴더 이동
        case "move": {
          const newFolderId = extra?.targetFolderId ?? null;
          meta.folderId = newFolderId;
          await FileSystem.writeAsStringAsync(metaPath, JSON.stringify(meta));

          await fetch(`${API_BASE}/api/notes/${noteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId: newFolderId }),
          });
          break;
        }

        // ─────────────────────────────────────────────
        // ⭐ 즐겨찾기 토글
        case "favorite": {
          const current = extra?.current ?? false; // 현재 상태
          const newState = !current;

          try {
            const res = await fetch(`${API_BASE}/api/notes/${noteId}/favorite`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isFavorite: newState }),
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            console.log(`⭐ 즐겨찾기 상태 변경 성공: ${newState}`);
          } catch (err) {
            console.error("🚨 즐겨찾기 상태 변경 실패:", err);
          }
          break;
        }

        // ─────────────────────────────────────────────
        default:
          console.warn(`⚠️ 알 수 없는 액션: ${action}`);
      }

      // ✅ 목록 새로고침
      if (reloadNotes) {
        await reloadNotes();
      }
    } catch (err) {
      console.error(`🚨 handleNoteAction(${action}) 실패:`, err);
    }
  };

  return { handleNoteAction };
};
