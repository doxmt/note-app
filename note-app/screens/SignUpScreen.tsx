// app/signup.tsx

import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { API_BASE } from '../utils/api';
import { useFonts } from 'expo-font';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    TitleFont: require('../assets/fonts/title.ttf'),
  });
  if (!fontsLoaded) return null;

  const handleEmailVerify = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert('인증 메일 전송 완료', '메일함을 확인해주세요!');
      } else {
        Alert.alert('실패', data.message || '메일 전송 실패');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('서버 오류', '이메일 인증 요청 중 문제가 발생했습니다.');
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('입력 오류', '모든 정보를 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('비밀번호 불일치', '비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert('회원가입 성공', '이제 로그인해주세요!');
        router.replace('/');
      } else {
        Alert.alert('회원가입 실패', data.message || '서버 오류');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('서버 오류', '회원가입 중 문제가 발생했습니다.');
    }
  };

  const checkEmailVerified = async () => {
    if (!email) return;

    try {
      const res = await fetch(`${API_BASE}/api/user/is-verified?email=${email}`);
      const data = await res.json();

      if (data.verified) {
        setEmailVerified(true);
        console.log('✅ 인증됨! 더 이상 확인 안 함');
        return true;
      }
    } catch (err) {
      console.error('이메일 인증 확인 오류:', err);
    }

    return false;
  };

  useEffect(() => {
    if (!email) return;

    const interval = setInterval(async () => {
      const verified = await checkEmailVerified();

      if (verified) clearInterval(interval);
    }, 3000);

    return () => clearInterval(interval);
  }, [email]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* 제목 */}
        <View style={styles.titleContainer}>
          <Image
            source={require('../assets/images/App_Icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text style={[styles.title, { fontFamily: 'TitleFont' }]}>에이쁠러쓰</Text>
          <Text style={styles.subtitle}>회원가입</Text>
        </View>

        {/* 이메일 입력 + 인증 버튼 */}
        <View style={styles.emailRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="이메일"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity style={styles.verifyButton} onPress={handleEmailVerify}>
            <Text style={styles.verifyText}>인증</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.verifyStatus}>
          {emailVerified ? '✅ 이메일 인증 완료' : '❗ 이메일 인증 필요'}
        </Text>

        {/* 비밀번호 */}
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#aaa"
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholderTextColor="#aaa"
        />

        {/* 회원가입 버튼 */}
        <TouchableOpacity style={styles.signUpBtn} onPress={handleSignUp}>
          <Text style={styles.signUpText}>회원가입</Text>
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
    backgroundColor: '#f3f0fa', // 💜 LinearGradient 대신 단색 배경
  },
  card: {
    backgroundColor: '#fff',
    width: 420,
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
    marginBottom: 30,
  },
  icon: {
    width: 90,
    height: 90,
    marginBottom: 8,
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
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
    fontSize: 16,
    color: '#333',
  },
  verifyButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  verifyText: {
    color: '#fff',
    fontWeight: '600',
  },
  verifyStatus: {
    marginBottom: 16,
    color: '#555',
    fontSize: 14,
    width: '100%',
    textAlign: 'left',
  },
  signUpBtn: {
    backgroundColor: '#ff6b6b',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  signUpText: {
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
