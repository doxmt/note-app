import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

import PlusIcon from '../assets/images/square-plus-button-icon.svg';
import FolderIcon from '../assets/images/folder.svg';
import NoteIcon from '../assets/images/noteicon.svg';

import { useFolderManager } from '../hooks/useFolderManager';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

import { getUserId } from '@/utils/auth';
import { Note } from '@/types/note';
import {
    useNoteManager,
    uploadNoteToServer,
    // deleteNote,
} from '@/hooks/useNoteManager';
import { API_BASE } from '@/utils/api';

// 모달 (현재 파일 기준 상대경로)
import AddOptionsModal from './Modals/AddOptionsModal';
import FolderFormModal from './Modals/FolderFormModal';
import FolderMoveModal from './Modals/FolderMoveModal';
import PdfUploadModal from './Modals/PdfUploadModal';

import { useNoteActions } from '@/hooks/useNoteActions';
import RenameNoteModal from '@/components/Modals/RenameNoteModal';


// ─────────────────────────────────────────────────────────────
// UUID
const generateUUID = async (): Promise<string> => {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    const hex = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return [
        hex.substr(0, 8),
        hex.substr(8, 4),
        '4' + hex.substr(12, 3),
        ((parseInt(hex.substr(16, 2), 16) & 0x3f) | 0x80).toString(16) +
        hex.substr(18, 2),
        hex.substr(20, 12),
    ].join('-');
};

// note 객체에서 안전하게 id/name 추출
const pickNoteId = (n: any): string =>
    String(n?.noteId ?? n?._id ?? n?.id ?? '');

const pickNoteName = (n: any): string =>
    String(n?.name ?? n?.fileName ?? '제목 없음');

// ─────────────────────────────────────────────────────────────

export default function DocumentTab() {
    const router = useRouter();

    // 폴더 훅
    const {
        folders,
        folderName,
        setFolderName,
        folderModalVisible,
        setFolderModalVisible,
        optionsVisible,
        setOptionsVisible,
        selectedIndex,
        setSelectedIndex,
        editMode,
        setEditMode,
        openCreateModal,
        createFolder,
        deleteFolder,
        renameFolder,
        folderColor,
        setFolderColor,
        updateFolderColor,
        moveFolder,
    } = useFolderManager();

    // 노트 훅 (루트의 노트만 표시)
    const { notes: rootNotes, reloadNotes } = useNoteManager(null);
    const { handleNoteAction } = useNoteActions(reloadNotes);

    // 로컬 상태
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [colorEditMode, setColorEditMode] = useState(false);
    const [moveModalVisible, setMoveModalVisible] = useState(false);
    const [movingFolderId, setMovingFolderId] = useState<string | null>(null);
    const [pdfModalVisible, setPdfModalVisible] = useState(false);
    const [currentFolderId] = useState<string | null>(null);
    const [nameOnly, setNameOnly] = useState(false);

    const [optionsVisibleNote, setOptionsVisibleNote] = useState<number | null>(null);
    const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);

    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);




    // 폴더 이동
    const handleMove = async (targetId: string) => {
      if (!movingFolderId) return;

      // 1️⃣ 현재 이동 대상이 note인지 folder인지 구분
      const isNote = rootNotes.some((n) => pickNoteId(n) === movingFolderId);

      const safeTargetId = targetId === 'ROOT' || targetId === null ? null : targetId;

      if (isNote) {
        // 🧩 노트 이동
        console.log('📦 노트 이동 실행:', movingFolderId, '→', targetId);
        await handleNoteAction('move', movingFolderId, { targetFolderId: targetId });
      } else {
        // 📁 폴더 이동
        console.log('📦 폴더 이동 실행:', movingFolderId, '→', targetId);
        moveFolder(movingFolderId, targetId);
      }

      setMoveModalVisible(false);
      setMovingFolderId(null);
    };


    // PDF 업로드 → 로컬 보관 → 메타 작성 → 서버 메타 업로드
    const handlePickPdf = async () => {
        console.log('📂 handlePickPdf 함수 시작됨');
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
            });
            if (result.canceled || !result.assets?.length) return;

            const pdf = result.assets[0];
            const noteId = await generateUUID();
            const folderPath = `${FileSystem.documentDirectory}notes/${noteId}.note/`;

            await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });

            const safeName = pdf.name || `${noteId}.pdf`;
            const pdfTargetPath = `${folderPath}${safeName}`;
            await FileSystem.copyAsync({ from: pdf.uri, to: pdfTargetPath });

            const userId = await getUserId();
            if (!userId) {
                Alert.alert('오류', '사용자 ID가 없다.');
                return;
            }

            const metadata: Note = {
                id: noteId,
                name: safeName.replace(/\.pdf$/i, ''),
                createdAt: new Date().toISOString(),
                pdfPath: pdfTargetPath,
                folderId: currentFolderId,
                userId,
            };

            await FileSystem.writeAsStringAsync(
                `${folderPath}metadata.json`,
                JSON.stringify(metadata)
            );

            console.log('📥 로컬 저장 완료:', metadata);
            await uploadNoteToServer(metadata); // 메타 서버 저장
            reloadNotes();
        } catch (err) {
            console.error('🚨 PDF 업로드 처리 중 오류:', err);
            Alert.alert('오류', 'PDF 업로드 중 문제가 발생했다.');
        }
    };

    // --- 1. openViewer 함수 삭제 ---
    // 더 이상 사용하지 않으므로 관련 함수를 깨끗하게 제거했습니다.

    // 편집 화면 열기
    const openEditor = async (note: any) => {
        const id = pickNoteId(note);
        const name = pickNoteName(note);
        if (!id) {
            Alert.alert('오류', '노트 식별자를 찾을 수 없다.');
            return;
        }

        try {
            const url = `${API_BASE}/api/notes/${id}/file`;
            const target = `${FileSystem.documentDirectory}${id}.editor.pdf`;
            console.log('[DocTab] 편집용 다운로드 시작:', url, '→', target);

            const { uri } = await FileSystem.downloadAsync(url, target);
            console.log('[DocTab] 편집용 다운로드 완료:', uri);

            // ✅ 반드시 encodeURIComponent
            const params = {
                pdfUri: encodeURIComponent(uri),
                name,
                noteId: id,
            };
            console.log('[DocTab] push params:', params);

            router.push({ pathname: '/pdf-editor', params });
        } catch (e) {
            console.error('[DocTab] 편집 진입 실패:', e);
            Alert.alert('오류', '편집기를 열지 못했다.');
        }
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.header}>
                <Text style={styles.headerText}>문서</Text>
            </View>

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

                    {/* 📁 상위(루트) 폴더 목록 */}
                    {folders
                        .filter((f) => f.parentId === null)
                        .map((folder, index) => (
                            <View key={folder._id} style={styles.folderContainer}>
                                <TouchableOpacity
                                    style={styles.folderItem}
                                    onPress={() => router.push(`/folder/${folder._id}`)}
                                >
                                    <FolderIcon
                                        width={150}
                                        height={150}
                                        color={folder.color || '#999'}
                                    />
                                </TouchableOpacity>

                                <View style={styles.folderLabelRow}>
                                    <Text style={styles.folderText}>{folder.name}</Text>
                                    <TouchableOpacity
                                        onPress={() =>
                                            setOptionsVisible(optionsVisible === index ? null : index)
                                        }
                                    >
                                        <Text style={styles.dropdown}>▼</Text>
                                    </TouchableOpacity>
                                </View>

                                {optionsVisible === index && (
                                    <View style={styles.dropdownBox}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedIndex(index);
                                                setEditMode(true);
                                                setFolderName(folder.name);
                                                setFolderColor(folder.color || '#FFD700');
                                                setFolderModalVisible(true);
                                                setOptionsVisible(null);
                                            }}
                                        >
                                            <Text style={styles.dropdownOption}>이름 변경</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity onPress={() => deleteFolder(folder._id)}>
                                            <Text style={styles.dropdownOption}>폴더 삭제</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedIndex(index);
                                                setColorEditMode(true);
                                                setFolderModalVisible(true);
                                                setFolderColor(folder.color || '#FFD700');
                                                setOptionsVisible(null);
                                            }}
                                        >
                                            <Text style={styles.dropdownOption}>색상 변경</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => {
                                                setMovingFolderId(folder._id);
                                                setMoveModalVisible(true);
                                                setOptionsVisible(null);
                                            }}
                                        >
                                            <Text style={styles.dropdownOption}>폴더 이동</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))}

                    {/* 📄 루트 노트 목록 (PDF 아이콘 + 드롭다운) */}
                    {rootNotes.map((note: any, index: number) => {
                      const id = pickNoteId(note);
                      return (
                        <View key={id} style={styles.folderContainer}>
                          {/* PDF 아이콘 */}
                          <TouchableOpacity
                            style={styles.folderItem}
                            onPress={() => openEditor(note)}
                          >
                            <NoteIcon width={120} height={120} />
                          </TouchableOpacity>

                          {/* 제목 + ▼ 드롭다운 */}
                          <View style={styles.folderLabelRow}>
                            <Text style={styles.folderText}>{pickNoteName(note)}</Text>
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
                                  const noteId = note.id || note.noteId || note._id; // 안전하게
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
                      );
                    })}

                </View>
            </ScrollView>

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
                onClose={() => {
                    setFolderModalVisible(false);
                    setEditMode(false);
                    setColorEditMode(false);
                    setNameOnly(false);
                    setFolderName('');
                    setFolderColor('#FFD700');
                }}
                folderName={folderName}
                setFolderName={setFolderName}
                folderColor={folderColor}
                setFolderColor={setFolderColor}
                onSubmit={editMode ? renameFolder : createFolder}
                editMode={editMode}
                colorOnly={colorEditMode}
                nameOnly={nameOnly}
                updateColor={updateFolderColor}
                selectedFolderIndex={selectedIndex}
                folders={folders}
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

            <RenameNoteModal
              visible={renameModalVisible}
              onClose={() => setRenameModalVisible(false)}
              onSubmit={async (newName) => {
                console.log('📢 RenameNoteModal onSubmit 실행됨:', newName, selectedNoteId);
                if (selectedNoteId) {
                  await handleNoteAction('rename', selectedNoteId, { newName });
                } else {
                  console.log('⚠️ selectedNoteId 없음!');
                }
                setRenameModalVisible(false);
              }}
            />



            <PdfUploadModal
                visible={pdfModalVisible}
                onClose={() => setPdfModalVisible(false)}
                onPickPdf={async () => {
                    await handlePickPdf();
                    reloadNotes();
                }}
                currentFolderId={currentFolderId}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: '#fff' },
    header: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: '#f0f0f0',
    },
    headerText: { fontSize: 26, fontWeight: 'bold', color: '#000' },
    scrollContent: { padding: 16 },
    folderRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 33,
    },
    folderContainer: {
        width: 150,
        alignItems: 'center',
        marginBottom: 24,
    },
    folderItem: {
        width: 150,
        height: 150,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    folderLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
    },
    folderText: { fontSize: 14, fontWeight: '500' },
    dropdown: { fontSize: 16 },
    dropdownBox: {
        marginTop: 4,
        padding: 8,
        backgroundColor: '#eee',
        borderRadius: 8,
    },
    dropdownOption: { paddingVertical: 4, fontSize: 14 },
});