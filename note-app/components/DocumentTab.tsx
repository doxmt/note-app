import React, { useState,useEffect } from 'react';
import { Image } from 'react-native';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Header from '@/components/Header';

import PlusIcon from '../assets/images/square-plus-button-icon.svg';
import FolderIcon from '../assets/images/folder2.svg';
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
} from '@/hooks/useNoteManager';
import { useNoteActions } from '@/hooks/useNoteActions';
import RenameNoteModal from '@/components/Modals/RenameNoteModal';
import { BASE_URL } from '@/utils/api';

// 모달
import AddOptionsModal from './Modals/AddOptionsModal';
import FolderFormModal from './Modals/FolderFormModal';
import FolderMoveModal from './Modals/FolderMoveModal';
import PdfUploadModal from './Modals/PdfUploadModal';
import PdfThumbnail from 'react-native-pdf-thumbnail';


function PdfPreviewItem({ note, onPress }: { note: any; onPress: () => void }) {
  const [thumbUri, setThumbUri] = useState<string | null>(null);

  useEffect(() => {
    if (note.pageImageIds && note.pageImageIds.length > 0) {
      // ✅ 서버에 저장된 첫 번째 페이지 이미지 사용
      setThumbUri(`${BASE_URL}/api/notes/page/${note.pageImageIds[0]}`);
    }
  }, [note.pageImageIds]);

  return (
    <TouchableOpacity style={styles.folderItem} onPress={onPress}>
      {thumbUri ? (
        <Image
          source={{ uri: thumbUri }}
          style={{ width: 170, height: 120, borderRadius: 12 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 150,
            height: 150,
            borderRadius: 12,
            backgroundColor: '#f0f0f0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#aaa' }}>미리보기 없음</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}




// ─────────────────────────────────────────────────────────────
// UUID 간소화
const generateUUID = (): string => Crypto.randomUUID();

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
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

    // 폴더/노트 이동
    const handleMove = async (targetId: string) => {
        if (!movingFolderId) return;
        const isNote = rootNotes.some((n) => pickNoteId(n) === movingFolderId);

        if (isNote) {
            await handleNoteAction('move', movingFolderId, { targetFolderId: targetId });
        } else {
            moveFolder(movingFolderId, targetId);
        }

        setMoveModalVisible(false);
        setMovingFolderId(null);
    };

    // PDF 업로드
    const handlePickPdf = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
            if (result.canceled || !result.assets?.length) return;

            const pdf = result.assets[0];
            const noteId = generateUUID();
            const folderPath = `${FileSystem.documentDirectory}notes/${noteId}.note/`;

            await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });

            const safeName = pdf.name || `${noteId}.pdf`;
            const pdfTargetPath = `${folderPath}${safeName}`;
            await FileSystem.copyAsync({ from: pdf.uri, to: pdfTargetPath });

            const userId = await getUserId();
            if (!userId) {
                Alert.alert('오류', '사용자 ID가 없습니다.');
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

            await uploadNoteToServer(metadata);
            reloadNotes();
        } catch (err) {
            console.error('🚨 PDF 업로드 처리 중 오류:', err);
            Alert.alert('오류', 'PDF 업로드 중 문제가 발생했습니다.');
        }
    };

    // PDF 편집기 열기
    const openEditor = async (note: any) => {
        const id = pickNoteId(note);
        const name = pickNoteName(note);
        if (!id) {
            Alert.alert('오류', '노트 식별자를 찾을 수 없습니다.');
            return;
        }

        try {
            const url = `${BASE_URL}/api/notes/${id}/file`;
            const target = `${FileSystem.documentDirectory}${id}.editor.pdf`;
            console.log('[DocTab] 편집용 다운로드 시작:', url);

            const { uri } = await FileSystem.downloadAsync(url, target);
            console.log('[DocTab] 편집용 다운로드 완료:', uri);

            const params = {
                pdfUri: encodeURIComponent(uri),
                name,
                noteId: id,
            };
            router.push({ pathname: '/pdf-editor', params });
        } catch (e) {
            console.error('[DocTab] 편집 진입 실패:', e);
            Alert.alert('오류', '편집기를 열지 못했습니다.');
        }
    };

    return (
         <View style={styles.wrapper}>
            <Header title="문서" showLogout />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.folderRow}>

                    <TouchableOpacity
                        style={styles.folderContainer}
                        onPress={() => setActionModalVisible(true)}
                    >
                        <View style={styles.folderItem}>
                            <PlusIcon width={150} height={150} />
                        </View>
                    </TouchableOpacity>

                    {/* 📁 폴더 목록 */}
                    {folders
                        .filter((f) => f.parentId === null)
                        .map((folder, index) => (
                            <View key={folder._id} style={styles.folderContainer}>
                                <TouchableOpacity
                                    style={styles.folderItem}
                                    onPress={() => router.push(`/folder/${folder._id}`)}
                                >
                                    <FolderIcon
                                        width={170}
                                        height={170}
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

                    {/* 📄 루트 노트 목록 */}
                    {rootNotes.map((note: any, index: number) => {
                        const id = pickNoteId(note);
                        return (
                            <View key={id} style={styles.folderContainer}>
                                <TouchableOpacity
                                  style={styles.folderItem}
                                  onPress={() => openEditor(note)}
                                >
                                  <PdfPreviewItem note={note} />
                                </TouchableOpacity>


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

                                {optionsVisibleNote === index && (
                                    <View style={styles.dropdownBox}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                const noteId = note.id || note.noteId || note._id;
                                                setSelectedNoteId(noteId);
                                                setRenameModalVisible(true);
                                                setOptionsVisibleNote(null);
                                            }}
                                        >
                                            <Text style={styles.dropdownOption}>이름 변경</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={async () => {
                                                await handleNoteAction('delete', note.noteId);
                                                setOptionsVisibleNote(null);
                                            }}
                                        >
                                            <Text style={styles.dropdownOption}>삭제</Text>
                                        </TouchableOpacity>

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
                    if (action === '폴더 생성') openCreateModal();
                    else if (action === 'PDF 업로드') setPdfModalVisible(true);
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
                    if (selectedNoteId) {
                        await handleNoteAction('rename', selectedNoteId, { newName });
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

// 스타일
const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: 'rgba(255,255,255,0)' },

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
