import * as FileSystem from "expo-file-system/legacy";
import { API_BASE } from "@/utils/api";

/**
 * 📦 노트 이름 변경 / 삭제 / 이동 액션 전용 훅
 * - metadata.json 및 폴더 존재 여부 자동 복구
 * - 서버(DB) 업데이트 포함
 * - reloadNotes()로 UI 즉시 최신화
 */
export const useNoteActions = (reloadNotes?: () => Promise<void> | void) => {
  const handleNoteAction = async (
    action: "rename" | "delete" | "move",
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
        console.warn(`⚠️ 노트 폴더 없음. 새로 생성: ${folderPath}`);
        await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });
      }

      // ✅ metadata.json 존재 보장
      const metaInfo = await FileSystem.getInfoAsync(metaPath);
      if (!metaInfo.exists) {
        console.warn(`⚠️ metadata.json 없음. 새로 생성: ${metaPath}`);
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

      // ✅ 안전하게 읽기
      const metaStr = await FileSystem.readAsStringAsync(metaPath);
      const meta = JSON.parse(metaStr);
      console.log("📄 기존 메타데이터:", meta);

      switch (action) {
        // ─────────────────────────────────────────────
        // 🔹 이름 변경
        case "rename": {
          const newName = extra?.newName?.trim();
          console.log("✏️ 이름 변경 시도:", newName);
          if (!newName) return;

          meta.name = newName;
          await FileSystem.writeAsStringAsync(metaPath, JSON.stringify(meta));
          console.log("✅ 로컬 이름 변경 완료:", newName);

          // 서버(DB) 업데이트
          try {
            const res = await fetch(`${API_BASE}/api/notes/${noteId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: newName }),
            });

            if (!res.ok) {
              const text = await res.text();
              throw new Error(`HTTP ${res.status}: ${text}`);
            }

            console.log("✅ 서버(DB) 이름 변경 완료");
          } catch (serverErr: any) {
            console.error("🚨 서버 이름 변경 실패:", serverErr.message || serverErr);
          }
          break;
        }

        // ─────────────────────────────────────────────
        // 🔹 삭제
        case "delete": {
          console.log("🗑️ 노트 삭제 시도:", noteId);

          const noteFolderPath = `${FileSystem.documentDirectory}notes/${noteId}.note`;
          const delInfo = await FileSystem.getInfoAsync(noteFolderPath);
          if (delInfo.exists) {
            await FileSystem.deleteAsync(noteFolderPath, { idempotent: true });
            console.log("✅ 로컬 노트 삭제 완료");
          } else {
            console.warn("⚠️ 삭제하려는 노트 폴더가 존재하지 않음");
          }

          // 서버(DB) 삭제
          try {
            const res = await fetch(`${API_BASE}/api/notes/${noteId}`, {
              method: "DELETE",
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            console.log("✅ 서버(DB) 노트 삭제 완료");
          } catch (serverErr) {
            console.error("🚨 서버 노트 삭제 실패:", serverErr);
          }
          break;
        }

        // ─────────────────────────────────────────────
        // 🔹 폴더 이동
        case "move": {
          const newFolderId = extra?.targetFolderId ?? null;
          if (newFolderId === undefined) {
            console.warn("⚠️ 이동 대상 폴더 ID 없음");
            return;
          }

          meta.folderId = newFolderId;
          await FileSystem.writeAsStringAsync(metaPath, JSON.stringify(meta));
          console.log("📂 로컬 폴더 이동 완료:", newFolderId ?? "(루트)");

          try {
            const res = await fetch(`${API_BASE}/api/notes/${noteId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ folderId: newFolderId }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            console.log("✅ 서버(DB) 폴더 이동 완료");
          } catch (serverErr) {
            console.error("🚨 서버 폴더 이동 실패:", serverErr);
          }
          break;
        }

        // ─────────────────────────────────────────────
        default:
          console.warn(`⚠️ 알 수 없는 액션: ${action}`);
      }

      // ✅ 목록 새로고침
      if (reloadNotes) {
        console.log("🔄 reloadNotes 호출");
        await reloadNotes();
      }
    } catch (err) {
      console.error(`🚨 handleNoteAction(${action}) 실패:`, err);
    }
  };

  return { handleNoteAction };
};
