// app/login.tsx

import { API_BASE } from '@/utils/api';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { saveUserId } from '../utils/auth';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const [fontsLoaded] = useFonts({
    TitleFont: require('../assets/fonts/title.ttf'),
  });
  if (!fontsLoaded) return null;

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.status === 200 && data.user) {
        await saveUserId(data.user._id);
        router.replace('/main');
      } else {
        console.log('❌ 로그인 실패:', data.message);
      }
    } catch (err) {
      console.error('로그인 중 오류:', err);
    }
  };

  return (
    <LinearGradient colors={['#a8edea', '#fed6e3']} style={styles.container}>
      <View style={styles.card}>
        {/* 로고 + 제목 */}
        <View style={styles.titleContainer}>
          <Image
            source={require('../assets/images/App_Icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          {/* ✅ 타이틀만 변경 */}
          <Text style={[styles.title, { fontFamily: 'TitleFont' }]}>에이쁠러쓰</Text>
        </View>

        {/* 입력창 */}
        <TextInput
          style={[styles.input, emailFocused && styles.inputFocused]}
          placeholder="이메일"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#aaa"
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
        />
        <TextInput
          style={[styles.input, passwordFocused && styles.inputFocused]}
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#aaa"
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
        />

        {/* 버튼 */}
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
          <Text style={styles.loginText}>로그인</Text>
        </TouchableOpacity>

        <View style={styles.subButtons}>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text style={styles.link}>회원가입</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/findpassword')}>
            <Text style={styles.link}>비밀번호 찾기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 42,
    color: '#333',
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
  inputFocused: {
    borderColor: '#ff6b6b',
    backgroundColor: '#fff',
    shadowColor: '#ff6b6b',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  loginBtn: {
    backgroundColor: '#ff6b6b',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  loginText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  subButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  link: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
