import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto'; // ✅ uuid 대체용
import { getUserId } from '@/utils/auth';
import { API_BASE } from '@/utils/api';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPickImage: () => void;
  currentFolderId: string | null;
};

export default function UploadImageModal({
  visible,
  onClose,
  onPickImage,
  currentFolderId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleImagePick = async () => {
    try {
      // ✅ 갤러리 접근 권한 요청
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
        return;
      }

      // ✅ 갤러리 열기 (최신 Expo 방식)
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // ✅ 올바른 버전
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;

      setLoading(true);
      setMessage(null);

      const { uri, fileName } = result.assets[0];
      const name = fileName || `image-${Date.now()}.png`;
      const fileNameWithoutExt = name.replace(/\.(jpg|jpeg|png|heic)$/i, '');

      const userId = await getUserId();
      const noteId = Crypto.randomUUID(); // ✅ 안전한 Expo 방식

      // ✅ 로컬 .note 폴더 생성
      await createNoteFile(uri, fileNameWithoutExt, userId, currentFolderId);

      // ✅ 서버 업로드
      await uploadImageToServer(uri, {
        userId,
        noteId,
        name: fileNameWithoutExt,
        createdAt: new Date().toISOString(),
        folderId: currentFolderId ?? '',
      });

      setMessage('✅ 이미지 업로드 완료!');
      setTimeout(() => {
        onPickImage();
        onClose();
      }, 1000);
    } catch (error) {
      console.error('🚨 이미지 업로드 오류:', error);
      setMessage('⚠️ 업로드 중 오류가 발생했어요.');
    } finally {
      setLoading(false);
    }
  };

  // ───────────────────────────────
  const createNoteFile = async (
    imageUri: string,
    fileName: string,
    userId: string,
    currentFolderId: string | null
  ) => {
    const noteDir = `${FileSystem.documentDirectory}notes/${fileName}.note/`;
    const imageDest = `${noteDir}image.png`;
    const metaDest = `${noteDir}metadata.json`;

    try {
      const notesDir = `${FileSystem.documentDirectory}notes/`;
      const notesDirInfo = await FileSystem.getInfoAsync(notesDir);
      if (!notesDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(notesDir, { intermediates: true });
        console.log('📂 notes 폴더 생성됨');
      }

      await FileSystem.makeDirectoryAsync(noteDir, { intermediates: true });
      console.log('📁 노트 폴더 생성 완료');

      await FileSystem.copyAsync({ from: imageUri, to: imageDest });
      console.log('🖼️ 이미지 복사 완료');

      const metadata = {
        id: `${fileName}-${Date.now()}`,
        name: fileName,
        createdAt: new Date().toISOString(),
        originalFile: 'image.png',
        folderId: currentFolderId,
        userId,
        type: 'image',
      };

      await FileSystem.writeAsStringAsync(metaDest, JSON.stringify(metadata));
      console.log('📝 메타데이터 저장 완료');
    } catch (err) {
      console.error('🚨 createNoteFile 에러:', err);
    }
  };

  // ───────────────────────────────
  const uploadImageToServer = async (uri: string, info: any) => {
    console.log('📡 이미지 서버 업로드 시작');

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: `${info.noteId}.png`,
      type: 'image/png',
    } as any);
    formData.append('userId', info.userId);
    formData.append('noteId', info.noteId);
    formData.append('name', info.name);
    formData.append('createdAt', info.createdAt);
    formData.append('folderId', info.folderId);

    const res = await fetch(`${API_BASE}/api/notes/upload-image`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    console.log('✅ 업로드 응답:', data);
    if (!res.ok) throw new Error(data.error || '이미지 업로드 실패');
  };

  // ───────────────────────────────
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>🖼️ 이미지 업로드</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#000" />
          ) : (
            <>
              <TouchableOpacity style={styles.button} onPress={handleImagePick}>
                <Text style={styles.buttonText}>갤러리에서 선택</Text>
              </TouchableOpacity>
              {message && <Text style={styles.message}>{message}</Text>}
            </>
          )}

          <Pressable onPress={onClose}>
            <Text style={styles.cancel}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ───────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
  },
  cancel: {
    marginTop: 20,
    color: '#999',
  },
});
