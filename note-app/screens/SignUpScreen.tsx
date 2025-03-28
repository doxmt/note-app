import { StyleSheet, Text, View } from 'react-native';
import React from 'react';

export default function SignUpScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입 페이지</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  }
});
