// app/findpassword.tsx

import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { API_BASE } from '../utils/api';
import { useFonts } from 'expo-font';

export default function FindpasswordScreen() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    TitleFont: require('../assets/fonts/title.ttf'),
  });
  if (!fontsLoaded) return null;

  const handleSendResetLink = async () => {
    if (!email) {
      Alert.alert('입력 오류', '이메일을 입력해주세요.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/user/find-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert('이메일 발송 완료', '비밀번호 재설정 링크가 이메일로 전송되었습니다.');
        router.back();
      } else {
        Alert.alert('오류', data.message || '문제가 발생했습니다.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('서버 오류', '요청 중 문제가 발생했습니다.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* 로고 + 제목 */}
        <View style={styles.titleContainer}>
          <Image
            source={require('../assets/images/App_Icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text style={[styles.title, { fontFamily: 'TitleFont' }]}>에이쁠러쓰</Text>
          <Text style={styles.subtitle}>비밀번호 재설정</Text>
        </View>

        {/* 이메일 입력 */}
        <TextInput
          style={styles.input}
          placeholder="이메일 주소"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#aaa"
        />

        {/* 버튼 */}
        <TouchableOpacity style={styles.resetBtn} onPress={handleSendResetLink}>
          <Text style={styles.resetText}>링크 보내기</Text>
        </TouchableOpacity>

        {/* 뒤로가기 */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← 로그인으로 돌아가기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f0fa', // 💜 배경색 (LinearGradient 대신)
  },
  card: {
    backgroundColor: '#fff',
    width: 400,
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    width: 90,
    height: 90,
    marginBottom: 10,
  },
  title: {
    fontSize: 40,
    color: '#333',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 18,
    color: '#666',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
    fontSize: 16,
    color: '#333',
  },
  resetBtn: {
    backgroundColor: '#ff6b6b',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  resetText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
  },
  backText: {
    color: '#666',
    textDecorationLine: 'underline',
  },
});
