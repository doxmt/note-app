// hooks/useFolderManager.ts
import axios from 'axios';
import { useEffect, useState } from 'react';
import { getUserId } from '../utils/auth';
import { API_BASE } from '@/utils/api';
import { Folder } from '@/types/folder';

export function useFolderManager() {
  

const [folders, setFolders] = useState<Folder[]>([]);
  const [folderName, setFolderName] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState<number | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderColor, setFolderColor] = useState<string>('#fff');

  

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserIdAndFolders = async () => {
      const id = await getUserId();
      setUserId(id);
  
      if (id) {
        try {
          const res = await axios.get(`${API_BASE}/api/folders/list`, {
            params: { userId: id },
          });
  
          if (res.status === 200) {
            setFolders(res.data.folders); // 전체 폴더 데이터 저장
          }
        } catch (err: any) {
          console.error('폴더 불러오기 실패:', err.response?.data || err.message);
        }
      }
    };
  
    fetchUserIdAndFolders();
  }, []);
  
  
  

  const openCreateModal = () => {
    setEditMode(false);
    setFolderName('');
    setFolderModalVisible(true);
  };

  // hooks/useFolderManager.ts
  const createFolder = async () => {
    if (folderName.trim() === '') return;
  
    // ✅ 폴더 색상 지정이 없거나 기본값이면 회색으로 대체
    const colorToUse = folderColor && folderColor !== '#fff' ? folderColor : '#999';
  
    console.log('📦 createFolder() 호출됨');
    console.log('userId:', userId);
    console.log('folderName:', folderName);
  
    try {
      console.log('➡️ 폴더 생성 요청:', {
        userId,
        name: folderName,
        parentId: selectedFolderId,
        color: colorToUse,
      });
  
      const res = await axios.post(`${API_BASE}/api/folders/create`, {
        userId,
        name: folderName,
        parentId: selectedFolderId ?? null,
        color: colorToUse,
      });
  
      if (res.status === 201) {
        setFolders(prev => [...prev, res.data.folder]);
        setFolderName('');
        setFolderColor('#fff'); // 색상 초기화
        setFolderModalVisible(false);
        setSelectedFolderId(null);
      }
    } catch (error: any) {
      console.error('폴더 생성 실패:', error.response?.data || error.message);
    }
  };
  
  


  const deleteFolder = async (folderId: string) => {
    try {
      const res = await axios.post(`${API_BASE}/api/folders/delete`, { folderId });
  
      if (res.status === 200) {
        const updated = folders.filter(folder => folder._id !== folderId);
        setFolders(updated);
      }
    } catch (error: any) {
      console.error('폴더 삭제 실패:', error.response?.data || error.message);
    }
  
    setOptionsVisible(null);
  };

  // ✏️ 폴더 이름 변경
  const renameFolder = async (folderId: string, newName: string) => {
      console.log('📦 rename 요청:', { folderId, newName });

    if (!folderId || !newName || !newName.trim()) return;
    try {
      const res = await axios.patch(`${API_BASE}/api/folders/rename`, {
        folderId,
        newName,
      });

      if (res.status === 200) {
        // ✅ 클라이언트 상태 즉시 반영
        setFolders((prev) =>
          prev.map((folder) =>
            folder._id === folderId ? { ...folder, name: newName } : folder
          )
        );
        console.log('✅ 폴더 이름 변경 성공:', newName);
      }
    } catch (error: any) {
      console.error('폴더 이름 변경 실패:', error.response?.data || error.message);
    }
  };

  // 🎨 폴더 색상 변경
  const updateFolderColor = async (folderId: string, newColor: string) => {
    try {
      const res = await axios.patch(`${API_BASE}/api/folders/color`, {
        folderId,
        color: newColor,
      });

      if (res.status === 200) {
        setFolders((prev) =>
          prev.map((folder) =>
            folder._id === folderId ? { ...folder, color: newColor } : folder
          )
        );
        console.log('✅ 폴더 색상 변경 성공:', newColor);
      }
    } catch (error: any) {
      console.error('폴더 색상 변경 실패:', error.response?.data || error.message);
    }
  };


  const moveFolder = async (sourceId: string, targetId: string | null) => {
    try {
      // ✅ "null" 문자열을 진짜 null로 변환
      const safeTargetId = !targetId || targetId === 'null' || targetId === 'undefined'
        ? null
        : targetId;

      const res = await axios.patch(`${API_BASE}/api/folders/move`, {
        folderId: sourceId,
        newParentId: safeTargetId,
      });

      if (res.status === 200) {
        const updated = folders.map(folder =>
          folder._id === sourceId ? { ...folder, parentId: safeTargetId } : folder
        );
        setFolders(updated);
        console.log('✅ 폴더 이동 성공:', sourceId, '→', safeTargetId ?? '(루트)');
      }
    } catch (error: any) {
      console.error('폴더 이동 실패:', error.response?.data || error.message);
    }
  };

  
  
  
  

  
  return {
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
    selectedFolderId,
    setSelectedFolderId,
    folderColor,
    setFolderColor,
    updateFolderColor,
    moveFolder
  };
  
}