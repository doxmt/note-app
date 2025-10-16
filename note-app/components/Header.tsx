import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { clearUserId } from '@/utils/auth'; // ✅ userId 삭제 함수 사용

interface HeaderProps {
  title: string;
  showLogout?: boolean; // 로그아웃 버튼 표시 여부 (기본값 false)
}

export default function Header({ title, showLogout = false }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      console.log('🧭 로그아웃 버튼 클릭됨');
      await clearUserId(); // ✅ userId 제거
      router.replace('/'); // ✅ 올바른 경로 (app/login.tsx → screens/LoginScreen.tsx)
    } catch (err) {
      console.error('🚨 로그아웃 실패:', err);
      Alert.alert('오류', '로그아웃 중 문제가 발생했습니다.');
    }
  };

  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>{title}</Text>

      {showLogout && (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
  },
  logoutButton: {
    backgroundColor: '#FF5555',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
