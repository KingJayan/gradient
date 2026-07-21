import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { AuthContext, AuthContextType, Student } from '../auth-context';
import { DataProvider, useDataCache } from '../data-context';
import { fetchGrades } from '../../services/api/grades';
import { fetchAssignments } from '../../services/api/assignments';
import { fetchSchedule } from '../../services/api/schedule';
import { invalidateAllQueries } from '../../hooks/use-hac-query';

jest.mock('../../services/api/grades', () => ({
  fetchGrades: jest.fn(),
  fetchCourses: jest.fn(async () => []),
}));
jest.mock('../../services/api/assignments', () => ({ fetchAssignments: jest.fn(async () => []) }));
jest.mock('../../services/api/schedule', () => ({ fetchSchedule: jest.fn(async () => []) }));

const user: Student = { id: '1', username: 'student', hacUrl: 'https://hac.example.org' };

const grades = [
  { className: 'Algebra II', average: 95.5, teacher: '', room: '', period: '', categories: [] },
];

function authValue(current: Student | null): AuthContextType {
  return {
    state: { isLoggedOut: !current, userToken: current ? 'authenticated' : null, user: current },
    bootstrapAsync: jest.fn(async () => {}),
    login: jest.fn(async () => {}),
    logout: jest.fn(async () => {}),
    deleteAccount: jest.fn(async () => {}),
  };
}

function Probe() {
  const { cache } = useDataCache();
  return <Text testID="count">{cache.grades ? cache.grades.length : 'none'}</Text>;
}

function Tree({ current }: { current: Student | null }) {
  return (
    <AuthContext.Provider value={authValue(current)}>
      <DataProvider>
        <Probe />
      </DataProvider>
    </AuthContext.Provider>
  );
}

beforeEach(async () => {
  invalidateAllQueries();
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await SecureStore.setItemAsync('userPass', 'hunter2');
  (fetchGrades as jest.Mock).mockResolvedValue(grades);
  (fetchAssignments as jest.Mock).mockResolvedValue([]);
  (fetchSchedule as jest.Mock).mockResolvedValue([]);
});

describe('DataProvider', () => {
  it('fetches the dashboard once credentials resolve', async () => {
    const { getByTestId } = render(<Tree current={user} />);

    await waitFor(() => expect(getByTestId('count')).toHaveTextContent('1'));
    expect(fetchGrades).toHaveBeenCalledTimes(1);
  });

  it('clears the cache when the user logs out', async () => {
    const { getByTestId, rerender } = render(<Tree current={user} />);
    await waitFor(() => expect(getByTestId('count')).toHaveTextContent('1'));

    await act(async () => {
      rerender(<Tree current={null} />);
    });

    expect(getByTestId('count')).toHaveTextContent('none');
    expect(await AsyncStorage.getItem('hacQueryCache')).toBeNull();
  });
});
