// utils/auth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ 로그인 시 userId 저장
export const saveUserId = async (userId: string) => {
  try {
    await AsyncStorage.setItem('userId', userId);
  } catch (err) {
    console.error('userId 저장 실패', err);
  }
};

// ✅ 저장된 userId 가져오기
export const getUserId = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('userId');
  } catch (err) {
    console.error('userId 가져오기 실패', err);
    return null;
  }
};

// ✅ 로그아웃 시 userId 제거
export const clearUserId = async () => {
  try {
    await AsyncStorage.removeItem('userId');
    console.log('🧹 userId 삭제 완료');
  } catch (err) {
    console.error('userId 삭제 실패', err);
  }
};
