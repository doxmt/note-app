import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { clearUserId } from '@/utils/auth';
import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';

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

    const [fontsLoaded] = useFonts({
      TitleFont: require('@/assets/fonts/title.ttf'), // ✅ 경로 확인 필요
    });
    if (!fontsLoaded) return null;

  return (
    <BlurView intensity={40} tint="light" style={styles.header}>
      {/* 중앙 제목 */}
      <View style={styles.centerContainer}>
        <Text style={[styles.title, { fontFamily: 'TitleFont' }]}>{title}</Text>
      </View>

      {/* 우측 로그아웃 버튼 */}
      {showLogout && (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      )}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 55 : 40,
    paddingBottom: 15, // ⬆️ 기존 5 → 15로 늘리기 (여백 확보)
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
  },


  centerContainer: {
    flex: 1,
    alignItems: 'center',
  },
title: {
  fontSize: 38,
  fontWeight: '800',
  color: '#222',
  letterSpacing: 0.6,
  marginTop: -8, // 🔥 제목을 살짝 위로 밀기
},


  logoutButton: {
    position: 'absolute',
    right: 20,
    top: Platform.OS === 'ios' ? 60 : 45,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: '#ff6b6b',
    borderColor: '#ff6b6b',

  },

  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
