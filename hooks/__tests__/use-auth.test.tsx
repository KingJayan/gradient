import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { act, renderHook } from '@testing-library/react-native';
import { useAuth } from '../use-auth';
import { LOCAL_KEYS, SECURE_KEYS } from '../../utils/storage';

describe('useAuth.deleteAccount', () => {
  it('erases every credential, cache, and personal record on the device', async () => {
    await Promise.all(Object.values(SECURE_KEYS).map((key) => SecureStore.setItemAsync(key, 'x')));
    await AsyncStorage.multiSet(Object.values(LOCAL_KEYS).map((key) => [key, '{}']));

    const { result } = renderHook(() => useAuth());
    await act(() => result.current.deleteAccount());

    for (const key of Object.values(SECURE_KEYS)) {
      expect(await SecureStore.getItemAsync(key)).toBeNull();
    }
    for (const key of Object.values(LOCAL_KEYS)) {
      expect(await AsyncStorage.getItem(key)).toBeNull();
    }
    expect(result.current.state.isLoggedOut).toBe(true);
  });
});
