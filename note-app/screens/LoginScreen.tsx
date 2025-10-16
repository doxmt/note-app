import { API_BASE } from '@/utils/api';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useState,useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import { saveUserId } from '../utils/auth';
import { Animated } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const fullText = "AI와 함께하는 A+로 향하는 당신의 공부 메이트";
  const [displayedText, setDisplayedText] = useState("");
  const penX = useRef(new Animated.Value(0)).current;

useEffect(() => {
  let i = 0;
  let interval;

  const startAnimation = () => {
    interval = setInterval(() => {
      setDisplayedText(fullText.slice(0, i));

      Animated.timing(penX, {
        toValue: i * 28,
        duration: 60,
        useNativeDriver: true,
      }).start();

      i++;

      // ✨ 다 써졌을 때
      if (i > fullText.length) {
        clearInterval(interval);

        // 1.2초 멈춘 후 한 번에 지우기
        setTimeout(() => {
          setDisplayedText(""); // 전체 한 번에 제거
          Animated.timing(penX, {
            toValue: 0, // 펜 위치도 처음으로
            duration: 500,
            useNativeDriver: true,
          }).start();

          // 다시 쓰기 시작
          i = 0;
          setTimeout(startAnimation, 1000); // 1초 뒤 재시작
        }, 1200);
      }
    }, 80);
  };

  startAnimation();

  return () => clearInterval(interval);
}, []);




  // ✅ title.ttf 폰트 로드
  const [fontsLoaded] = useFonts({
    TitleFont: require('../assets/fonts/title.ttf'),
  });

  // 📌 로딩 중엔 null 반환 (AppLoading 필요 없음)
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
        console.log('✅ 로그인 성공:', data);
        await saveUserId(data.user._id);
        router.replace('/main');
      } else {
        console.log('❌ 로그인 실패:', data.message);
      }
    } catch (err) {
      console.error('로그인 중 오류:', err);
    }
  };

  const handleSignUp = () => router.push('/signup');

  return (
    <View style={styles.container}>
      {/* 제목 + 아이콘 */}
      <View style={styles.titleContainer}>
        <Image
          source={require('../assets/images/App_Icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
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
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonOutline]} onPress={handleSignUp}>
          <Text style={styles.buttonOutlineText}>회원가입</Text>
        </TouchableOpacity>
      </View>

      {/* 비밀번호 찾기 */}
      <TouchableOpacity onPress={() => router.push('/findpassword')}>
        <Text style={styles.findText}>🔐 비밀번호 찾기</Text>
      </TouchableOpacity>

        <View style={styles.sloganContainer}>
          <Text style={[styles.slogan, { fontFamily: 'TitleFont' }]}>{displayedText}</Text>
          <Animated.View style={[styles.pen, { transform: [{ translateX: penX }] }]}>
            <Image
               source={require('../assets/images/pen.png')}
               resizeMode="contain"
              style={styles.penImage}
            />
          </Animated.View>
        </View>


    </View>


  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#fff',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  icon: {
    width: 150,
    height: 150,
    marginRight: 10,
  },
  title: {
    fontSize: 80,
    color: '#000',
    textAlign: 'center',
  },
  input: {
    height: 55,
    borderColor: '#ddd',
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 18,
    paddingHorizontal: 16,
    backgroundColor: '#fafafa',
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    transition: 'all 0.2s', // RN에서는 시각적으로는 작동X, 그러나 유지 가능
  },
  inputFocused: {
    borderColor: '#000',          // 포커스 시 테두리 진하게
    backgroundColor: '#fff',      // 배경 조금 밝게
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    gap: 10,
  },
  button: {
    backgroundColor: 'black',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
  },
  buttonOutline: {
    backgroundColor: 'white',
    borderColor: 'black',
    borderWidth: 1,
  },
  buttonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  buttonOutlineText: {
    color: 'black',
    fontWeight: '500',
    fontSize: 16,
  },
  findText: {
    marginTop: 20,
    color: '#444',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
sloganContainer: {
  marginTop: 100,
  alignItems: 'flex-start', // ✅ 왼쪽 정렬
  justifyContent: 'center',
  position: 'relative',
  width: '100%',             // ✅ 부모 기준으로 넓이 확보
  paddingHorizontal: 24,
  left : 130,
},

slogan: {
  fontSize: 50,
  lineHeight: 70,
  color: '#333',
  textAlign: 'left',        // ✅ 왼쪽부터 글자 써지게
  fontStyle: 'italic',
  letterSpacing: 1,
  includeFontPadding: false,
  textAlignVertical: 'center',
  width: '100%',             // ✅ 글자 폭이 부모에 맞게 확장
},

pen: {
  position: 'absolute',
  bottom: -70,
  left: 4,                 // ✅ Text 시작점과 동일한 위치
},

penImage: {
  width: 130,
  height: 130,
},



});
