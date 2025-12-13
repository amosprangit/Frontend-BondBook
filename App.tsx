import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import Toast from 'react-native-toast-message';
import AppNavigator from './navigation/AppNavigator';
import { store } from './store';

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
      <Toast />
    </Provider>
  );
}
