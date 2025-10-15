import { useEffect, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import axios from "axios";
import { API_BASE } from "@/utils/api";
import { getUserId } from "@/utils/auth";
import { Note } from "@/types/note";

// 🗑️ 로컬 노트 폴더 삭제
export const deleteNote = async (noteId: string) => {
  try {
    const noteFolderPath = `${FileSystem.documentDirectory}notes/${noteId}.note/`;
    const info = await FileSystem.getInfoAsync(noteFolderPath);

    if (info.exists) {
      await FileSystem.deleteAsync(noteFolderPath, { idempotent: true });
      console.log(`🗑️ 노트 삭제 완료: ${noteId}`);
    } else {
      console.warn("⚠️ 삭제하려는 노트 폴더가 존재하지 않음");
    }
  } catch (err) {
    console.error("🚨 노트 삭제 오류:", err);
  }
};

// 📥 서버에서 노트 목록 조회
export const fetchNotesFromServer = async (
  userId: string,
  folderId: string | null
): Promise<Note[]> => {
  try {
    const res = await axios.get(`${API_BASE}/api/notes`, {
      params: { userId, folderId },
    });
    return res.data.notes;
  } catch (err: any) {
    console.error(
      "🚨 서버에서 노트 목록 불러오기 실패:",
      err.response?.data || err.message
    );
    return [];
  }
};

// ⬆️ PDF(파일) + 메타데이터 업로드
export const uploadNoteToServer = async (note: Note) => {
  console.log("📡 uploadNoteToServer 시작");

  try {
    if (!note.pdfPath) {
      throw new Error("pdfPath가 비어 있음 (file:// 경로 필요)");
    }

    // ✅ 업로드 대상 파일 존재 여부 확인
    const info = await FileSystem.getInfoAsync(note.pdfPath);
    if (!info.exists) {
      throw new Error(`업로드 대상 파일이 존재하지 않음: ${note.pdfPath}`);
    }

    // ✅ 임시(tmp) 경로 문제 방지 → 안전한 경로로 복사
    const safeDir = `${FileSystem.documentDirectory}upload-buffer/`;
    await FileSystem.makeDirectoryAsync(safeDir, { intermediates: true });
    const safePath = `${safeDir}${note.id}.pdf`;

    await FileSystem.copyAsync({ from: note.pdfPath, to: safePath });

    // ✅ 파일명 생성
    const fallbackName = `${note.id}.pdf`;
    const filename = decodeURIComponent(
      note.pdfPath.split("/").pop() || fallbackName
    );

    // ✅ 업로드 실행
    const uploadUrl = `${API_BASE}/api/notes/upload`;
    const result = await FileSystem.uploadAsync(uploadUrl, safePath, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: "file", // 서버 multer.single('file') 와 일치해야 함
      mimeType: "application/pdf",
      parameters: {
        userId: note.userId,
        noteId: note.id,
        name: note.name,
        createdAt: note.createdAt,
        folderId: note.folderId ?? "null",
      },
      headers: { Accept: "application/json" },
    });

    console.log("✅ 업로드 응답 status:", result.status);
    console.log("✅ 업로드 응답 body:", result.body);

    // ✅ 중복 noteId (409) 시 새 ID로 재시도
    if (result.status === 409) {
      console.warn("⚠️ 중복 noteId 감지, 새 ID로 재시도");
      note.id = crypto.randomUUID();
      return await uploadNoteToServer(note);
    }

    // ✅ 기타 오류
    if (result.status < 200 || result.status >= 300) {
      throw new Error(`업로드 실패: HTTP ${result.status} ${result.body}`);
    }

    // ✅ 업로드 후 임시 파일 삭제
    await FileSystem.deleteAsync(safePath, { idempotent: true });
    console.log("🧹 임시 파일 정리 완료:", safePath);
  } catch (err: any) {
    console.error("🚨 노트 업로드 실패:", err.message || err);
    throw err;
  }
};

// 📊 훅: 현재 폴더 기준으로 서버 노트 로드
export const useNoteManager = (currentFolderId: string | null) => {
  const [notes, setNotes] = useState<Note[]>([]);

  const loadNotes = async () => {
    console.log("📡 서버에서 노트 불러오는 중...");
    try {
      const userId = await getUserId();
      if (!userId) {
        console.warn("❌ 사용자 ID 없음. 노트 불러오기 중단");
        return;
      }

      const serverNotes = await fetchNotesFromServer(
        userId,
        currentFolderId ?? null
      );
      setNotes(serverNotes);
    } catch (err) {
      console.error("노트 로딩 오류:", err);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [currentFolderId]);

  return {
    notes,
    reloadNotes: loadNotes,
    uploadNoteToServer, // 업로드 후 reloadNotes() 호출 권장
  };
};
