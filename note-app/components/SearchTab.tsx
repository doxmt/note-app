import { View } from 'react-native';
import SectionHeader from '../components/common/SectionHeader';
import Header from '@/components/Header';

export default function DocumentTab() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Header title="검색" showLogout />
    </View>
  );
}
