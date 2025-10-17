import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { clearUserId } from '@/utils/auth';

interface HeaderProps {
  title: string;
  showLogout?: boolean;
}

export default function Header({ title, showLogout = false }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      console.log('🧭 로그아웃 버튼 클릭됨');
      await clearUserId();
      router.replace('/');
    } catch (err) {
      console.error('🚨 로그아웃 실패:', err);
      Alert.alert('오류', '로그아웃 중 문제가 발생했습니다.');
    }
  };

  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>

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
    backgroundColor: '#fafafa',
    paddingTop: 55,
    paddingBottom: 18,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    color: '#222',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  logoutButton: {
    backgroundColor: '#111',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,

    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
