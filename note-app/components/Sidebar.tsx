// components/common/Sidebar.tsx
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFonts } from 'expo-font';

interface SidebarProps {
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  navigateMode?: boolean; // 💡 true면 router.push()로 이동
}

export default function Sidebar({ activeTab = 'document', onSelectTab, navigateMode = false }: SidebarProps) {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    TitleFont: require('@/assets/fonts/title.ttf'),
  });
  if (!fontsLoaded) return null;

  const handlePress = (key: string) => {
    if (navigateMode) {
      router.push(`/main?tab=${key}`); // ✅ 다른 화면에서 main으로 이동
    } else if (onSelectTab) {
      onSelectTab(key); // ✅ 상태 기반 전환
    }
  };

  return (
    <LinearGradient colors={['#a8edea', '#fed6e3']} style={styles.sidebar}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/App_Icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.sidebarTitle, { fontFamily: 'TitleFont' }]}>에이쁠러쓰</Text>
      </View>

      {[
        { key: 'document', label: '문서' },
        { key: 'favorite', label: '즐겨찾기' },
        { key: 'search', label: 'PDF 요약' },
        { key: 'ai', label: '퀴즈 생성' },
      ].map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[styles.tabButton, activeTab === key && styles.activeTab]}
          onPress={() => handlePress(key)}
        >
          <Text style={[styles.tabText, activeTab === key && styles.activeText]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 250, paddingTop: 60, paddingHorizontal: 18, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  logo: { width: 85, height: 85, marginBottom: 8 },
  sidebarTitle: { fontSize: 30, color: '#111', textAlign: 'center', fontWeight: '700', letterSpacing: 0.5 },
  tabButton: { backgroundColor: 'rgba(255,255,255,0.8)', paddingVertical: 16, borderRadius: 14, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  activeTab: { backgroundColor: '#ff6b6b', borderColor: '#ff6b6b' },
  tabText: { fontSize: 17, color: '#444', fontWeight: '600' },
  activeText: { color: '#fff', fontWeight: '700' },
});
