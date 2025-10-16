import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import DocumentTab from '../components/DocumentTab';
import FavoriteTab from '../components/FavoriteTab';
import SearchTab from '../components/SearchTab';
import AiTab from '../components/AiTab';

export default function MainScreen() {
  const router = useRouter();
  const { tab: queryTab } = useLocalSearchParams();
  const [tab, setTab] = useState<'document' | 'favorite' | 'search' | 'ai'>('document');

  const [fontsLoaded] = useFonts({
    TitleFont: require('../assets/fonts/title.ttf'),
  });
  if (!fontsLoaded) return null;

  useEffect(() => {
    if (['document', 'favorite', 'search', 'ai'].includes(queryTab as string)) {
      setTab(queryTab as any);
    }
  }, [queryTab]);

  const navigateToTab = (newTab: typeof tab) => {
    setTab(newTab);
    router.push(`/main?tab=${newTab}`);
  };

  const renderContent = () => {
    switch (tab) {
      case 'document': return <DocumentTab />;
      case 'favorite': return <FavoriteTab />;
      case 'search': return <SearchTab />;
      case 'ai': return <AiTab />;
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* ✅ 사이드바 */}
      <View style={styles.sidebar}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/App_Icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.sidebarTitle, { fontFamily: 'TitleFont' }]}>에이쁠러쓰</Text>
        </View>

        {/* 탭 버튼 */}
        <TouchableOpacity
          style={[styles.tabButton, tab === 'document' && styles.activeTab]}
          onPress={() => navigateToTab('document')}
        >
          <Text style={[styles.tabText, tab === 'document' && styles.activeText]}>문서</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === 'favorite' && styles.activeTab]}
          onPress={() => navigateToTab('favorite')}
        >
          <Text style={[styles.tabText, tab === 'favorite' && styles.activeText]}>즐겨찾기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === 'search' && styles.activeTab]}
          onPress={() => navigateToTab('search')}
        >
          <Text style={[styles.tabText, tab === 'search' && styles.activeText]}>검색</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === 'ai' && styles.activeTab]}
          onPress={() => navigateToTab('ai')}
        >
          <Text style={[styles.tabText, tab === 'ai' && styles.activeText]}>AI 문제 생성</Text>
        </TouchableOpacity>
      </View>

      {/* 본문 */}
      <View style={{ flex: 1 }}>{renderContent()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 250,
    paddingTop: 60,
    paddingHorizontal: 18,
    backgroundColor: '#f8f8f8',
    // ❌ 경계선 제거
    borderRightWidth: 0,
  },


  // 로고
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    width: 85,
    height: 85,
    marginBottom: 8,
  },
  sidebarTitle: {
    fontSize: 30,
    color: '#111',
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // 탭 버튼
  tabButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  activeTab: {
    backgroundColor: '#111',
    borderColor: '#111',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  tabText: {
    fontSize: 17,
    color: '#444',
    fontWeight: '600',
    textAlign: 'center',
  },
  activeText: {
    color: '#fff',
    fontWeight: '700',
  },
});
