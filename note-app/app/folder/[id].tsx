import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useFolderManager } from '@/hooks/useFolderManager';
import PlusIcon from '../../assets/images/square-plus-button-icon.svg';
import FolderIcon from '../../assets/images/folder.svg';
import AddOptionsModal from '@/components/Modals/AddOptionsModal';
import FolderFormModal from '@/components/Modals/FolderFormModal';
import FolderMoveModal from '@/components/Modals/FolderMoveModal';
import PdfUploadModal from '@/components/Modals/PdfUploadModal';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { getUserId } from '@/utils/auth'; // 🔥 이 줄이 있어야 getUserId() 사용 가능
import { useNoteManager, uploadNoteToServer } from '@/hooks/useNoteManager';
import { Note } from '@/types/note';
import NoteIcon from '../../assets/images/noteicon.svg';
import * as Sharing from 'expo-sharing';
import { API_BASE } from '@/utils/api';
import { useNoteActions } from '@/hooks/useNoteActions';
import RenameNoteModal from '@/components/Modals/RenameNoteModal';



export default function FolderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const currentFolderId = typeof id === 'string' ? id : null;

  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [colorEditMode, setColorEditMode] = useState(false);
  const [nameOnly, setNameOnly] = useState(false);
  const [movingFolderId, setMovingFolderId] = useState<string | null>(null);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const { notes, reloadNotes } = useNoteManager(currentFolderId);


  const [optionsVisibleNote, setOptionsVisibleNote] = useState<number | null>(null);
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);

  const { handleNoteAction } = useNoteActions(reloadNotes);

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);



  const {
    folders,
    createFolder,
    folderModalVisible,
    setFolderModalVisible,
    folderName,
    setFolderName,
    editMode,
    setEditMode,
    selectedIndex,
    setSelectedIndex,
    optionsVisible,
    setOptionsVisible,
    renameFolder,
    deleteFolder,
    selectedFolderId,
    setSelectedFolderId,
    folderColor,
    setFolderColor,
    updateFolderColor,
    moveFolder,
    openCreateModal,
  } = useFolderManager();

  useEffect(() => {
    if (currentFolderId) {
      setSelectedFolderId(currentFolderId);
    }
  }, [currentFolderId]);

    // PDF 편집/뷰어 화면 열기
    const openEditor = async (note: any) => {
      const id = note.id || note.noteId;
      const name = note.name || "제목 없음";

      if (!id) {
        alert("노트 식별자를 찾을 수 없어요.");
        return;
      }

      try {
        const url = `${API_BASE}/api/notes/${id}/file`;
        const target = `${FileSystem.documentDirectory}${id}.editor.pdf`;

        console.log("[FolderScreen] 편집용 다운로드 시작:", url);

        const { uri } = await FileSystem.downloadAsync(url, target);
        console.log("[FolderScreen] 다운로드 완료:", uri);

        const params = {
          pdfUri: encodeURIComponent(uri),
          name,
          noteId: id,
        };

        router.push({ pathname: "/pdf-editor", params });
      } catch (e) {
        console.error("[FolderScreen] PDF 열기 실패:", e);
        alert("PDF를 여는 중 오류가 발생했어요.");
      }
    };



  const buildBreadcrumbString = (folderId: string | null): string => {
    const names: string[] = [];
    let currentId = folderId;
    while (currentId) {
      const folder = folders.find(f => f._id === currentId);
      if (!folder) break;
      names.unshift(folder.name);
      currentId = folder.parentId;
    }
    return names.join(' → ');
  };

  const generateUUID = async (): Promise<string> => {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return [
      hex.substr(0, 8),
      hex.substr(8, 4),
      '4' + hex.substr(12, 3),
      ((parseInt(hex.substr(16, 2), 16) & 0x3f) | 0x80).toString(16) + hex.substr(18, 2),
      hex.substr(20, 12),
    ].join('-');
  };


  const handleMove = async (targetId: string | null) => {
    if (!movingFolderId) return;

    // 현재 이동 대상이 note인지 folder인지 구분
    const isNote = notes.some(n => n.id === movingFolderId);

    // ✅ "null" 또는 "ROOT"면 루트 이동 처리
    const safeTargetId = targetId === 'ROOT' || targetId === null ? null : targetId;

    if (isNote) {
      console.log('📦 PDF 이동 실행:', movingFolderId, '→', safeTargetId ?? '(루트)');
      // 서버로 이동 요청 (폴더 null 시 루트 이동)
      await fetch(`${API_BASE}/api/notes/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteId: movingFolderId,
          targetFolderId: safeTargetId,
        }),
      });
      reloadNotes();
    } else {
      console.log('📦 폴더 이동 실행:', movingFolderId, '→', safeTargetId ?? '(루트)');
      moveFolder(movingFolderId, safeTargetId);
    }

    setMoveModalVisible(false);
    setMovingFolderId(null);
  };


  const handlePickPdf = async () => {
    console.log('📂 handlePickPdf 함수 시작됨'); 
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (result.canceled || !result.assets?.length) return;
  
      const pdf = result.assets[0];
      const noteId = await generateUUID();
      const folderPath = `${FileSystem.documentDirectory}notes/${noteId}.note/`;
  
      await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });
  
      const pdfTargetPath = `${folderPath}${pdf.name}`;
      await FileSystem.copyAsync({ from: pdf.uri, to: pdfTargetPath });
  
      const userId = await getUserId();
      if (!userId) {
        console.warn('❗ userId 없음');
        return;
      }
  
      const metadata: Note = {
        id: noteId,
        name: pdf.name.replace(/\.pdf$/, ''),
        createdAt: new Date().toISOString(),
        pdfPath: pdfTargetPath,
        folderId: currentFolderId,
        userId,
      };
  
      await FileSystem.writeAsStringAsync(`${folderPath}metadata.json`, JSON.stringify(metadata));
  
      console.log('📥 로컬 저장 완료:', metadata);
      await uploadNoteToServer(metadata);
    } catch (err) {
      console.error('🚨 PDF 업로드 처리 중 오류:', err);
    }
  };

  
  const renderChildFolders = () => {
    return folders
      .filter(folder => folder.parentId === currentFolderId)
      .map((folder, index) => (
        <View key={folder._id} style={styles.folderContainer}>
          <TouchableOpacity
            style={styles.folderItem}
            onPress={() => router.push(`/folder/${folder._id}`)}
          >
            <FolderIcon width={150} height={150} color={folder.color || '#999'} />
          </TouchableOpacity>
          <View style={styles.folderLabelRow}>
            <Text style={styles.folderText}>{folder.name}</Text>
            <TouchableOpacity onPress={() => setOptionsVisible(optionsVisible === index ? null : index)}>
              <Text style={styles.dropdown}>▼</Text>
            </TouchableOpacity>
          </View>
          {optionsVisible === index && (
            <View style={styles.dropdownBox}>
              <TouchableOpacity onPress={() => {
                    setSelectedFolderId(folder._id); // ✅ index 대신 _id 사용
                    setEditMode(true);
                    setNameOnly(true);
                    setFolderName(folder.name);
                    setFolderModalVisible(true);
                    setOptionsVisible(null);
                  }}>
                    <Text style={styles.dropdownOption}>이름 변경</Text>
                  </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteFolder(folder._id)}>
                <Text style={styles.dropdownOption}>폴더 삭제</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setSelectedFolderId(folder._id); // ✅ 변경
                setEditMode(false);
                setColorEditMode(true);
                setFolderColor(folder.color || '#FFD700');
                setFolderModalVisible(true);
                setOptionsVisible(null);
              }}>
                <Text style={styles.dropdownOption}>색상 변경</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {
                setMovingFolderId(folder._id);
                setMoveModalVisible(true);
                setOptionsVisible(null);
              }}>
                <Text style={styles.dropdownOption}>폴더 이동</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ));
  };

  return (
    <View style={styles.container}>
      {/* 사이드바 */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>📝 Note-App</Text>
        {['문서', '즐겨찾기', '검색', 'Ai 기능'].map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => router.push(`/main?tab=${tab}`)}
            style={styles.tabButton}
          >
            <Text style={styles.tabText}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
  
      {/* 메인 컨텐츠 */}
      <View style={styles.wrapper}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace('/main?tab=document')
            }
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <View style={styles.titleWrapper}>
            <Text style={styles.headerText}>
              📁 {buildBreadcrumbString(currentFolderId)}
            </Text>
          </View>
        </View>
  
        {/* 폴더 + 노트 목록 */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.folderRow}>
            {/* ➕ 추가 버튼 */}
            <TouchableOpacity
              style={styles.folderContainer}
              onPress={() => setActionModalVisible(true)}
            >
              <View style={styles.folderItem}>
                <PlusIcon width={150} height={150} />
              </View>
            </TouchableOpacity>
  
            {/* 📁 하위 폴더 목록 */}
            {renderChildFolders()}
  
            {/* 📄 노트 목록 */}
            {notes.map((note, index) => (
              <View key={`${note.id || 'note'}-${index}`} style={styles.folderContainer}>
                {/* 노트 아이콘 */}
                <TouchableOpacity style={styles.folderItem} onPress={() => openEditor(note)}>
                  <NoteIcon width={120} height={120} />
                </TouchableOpacity>

                {/* 제목 + ▼ 버튼 */}
                <View style={styles.folderLabelRow}>
                  <Text style={styles.folderText}>{note.name}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setOptionsVisibleNote(optionsVisibleNote === index ? null : index)
                    }
                  >
                    <Text style={styles.dropdown}>▼</Text>
                  </TouchableOpacity>
                </View>

                {/* 드롭다운 메뉴 */}
                {optionsVisibleNote === index && (
                  <View style={styles.dropdownBox}>
                    {/* 이름 변경 */}
                    <TouchableOpacity
                      onPress={() => {
                        const noteId = note.id || note.noteId || note._id;
                        console.log('🧩 이름 변경 클릭됨, noteId:', noteId);
                        setSelectedNoteId(noteId);
                        setRenameModalVisible(true);
                        setOptionsVisibleNote(null);
                      }}
                    >
                      <Text style={styles.dropdownOption}>이름 변경</Text>
                    </TouchableOpacity>

                    {/* 삭제 */}
                    <TouchableOpacity
                      onPress={async () => {
                        await handleNoteAction('delete', note.noteId);
                        setOptionsVisibleNote(null);
                      }}
                    >
                      <Text style={styles.dropdownOption}>삭제</Text>
                    </TouchableOpacity>

                    {/* PDF 이동 */}
                    <TouchableOpacity
                      onPress={() => {
                        setMovingFolderId(note.noteId);
                        setMoveModalVisible(true);
                        setOptionsVisibleNote(null);
                      }}
                    >
                      <Text style={styles.dropdownOption}>PDF 이동</Text>
                    </TouchableOpacity>
                  </View>
                )}

              </View>
            ))}
          </View>
        </ScrollView>
      </View>
  
      {/* 모달들 */}
      <AddOptionsModal
        visible={actionModalVisible}
        onClose={() => setActionModalVisible(false)}
        onSelect={(action) => {
          if (action === '폴더 생성') {
            openCreateModal();
          } else if (action === 'PDF 업로드') {
            setPdfModalVisible(true);
          }
          setActionModalVisible(false);
        }}
      />
  
      <FolderFormModal
        visible={folderModalVisible}
        onClose={() => setFolderModalVisible(false)}
        folderName={folderName}
        setFolderName={setFolderName}
        folderColor={folderColor}
        setFolderColor={setFolderColor}
        editMode={editMode}
        colorOnly={colorEditMode}
        nameOnly={nameOnly}
        selectedFolderId={selectedFolderId}
        onSubmit={(idOrName, nameMaybe, colorMaybe) => {
          if (idOrName && nameMaybe && !colorMaybe) renameFolder(idOrName, nameMaybe);
          else if (idOrName && colorMaybe) updateFolderColor(idOrName, colorMaybe);
          else createFolder();
        }}
      />




  
      <FolderMoveModal
            visible={moveModalVisible}
            folders={folders}
            onSelect={handleMove}
            onClose={() => {
              setMoveModalVisible(false);
              setMovingFolderId(null);
            }}
          />
  
      <PdfUploadModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        onPickPdf={async () => {
          await handlePickPdf(); // PDF 저장 및 서버 업로드
          reloadNotes();         // 노트 목록 갱신
        }}
        currentFolderId={currentFolderId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 250,
    backgroundColor: '#f0f0f0',
    paddingTop: 40,
    paddingHorizontal: 8,
  },
  sidebarTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 32, textAlign: 'center', color: '#000' },
  tabButton: {
    paddingVertical: 16, paddingHorizontal: 12, marginBottom: 12,
    borderRadius: 6, backgroundColor: '#ddd',
  },
  tabText: { color: '#000', fontWeight: '600', textAlign: 'center' },
  wrapper: { flex: 1, backgroundColor: '#fff' },
  header: {
    alignItems: 'center', flexDirection: 'row', height: 60,
    backgroundColor: '#f0f0f0', justifyContent: 'center',
    paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#ccc',
  },
  backText: { fontSize: 22, fontWeight: 'bold', marginRight: 12 },
  titleWrapper: { flex: 1, alignItems: 'center' },
  headerText: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  scrollContent: { padding: 16 },
  folderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 33 },
  folderContainer: { width: 150, alignItems: 'center', marginBottom: 24 },
  folderItem: {
    width: 150, height: 150, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  folderLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  folderText: { fontSize: 14, fontWeight: '500' },
  dropdown: { fontSize: 16 },
  dropdownBox: { marginTop: 4, padding: 8, backgroundColor: '#eee', borderRadius: 8 },
  dropdownOption: { paddingVertical: 4, fontSize: 14 },
});
