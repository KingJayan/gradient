import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react-native';
import { renderScreen, navigation, dataContext } from '../../test/render';
import { useDataCache } from '../../context/data-context';
import HomeScreen from '../home';
import GradesScreen from '../grades';
import GPACalculatorScreen from '../gpa-calc';
import ScheduleScreen from '../schedule';
import PlannerScreen from '../planner';

jest.mock('../../context/data-context', () => ({ useDataCache: jest.fn() }));

const mockUseDataCache = useDataCache as jest.MockedFunction<typeof useDataCache>;

const grades = [
  { className: 'Algebra II', average: 95.5, teacher: 'Mr. Ruiz', room: '101', period: '1', categories: [] },
];
const courses = [
  { id: 'algebra-ii', name: 'Algebra II', credits: 1, grade: 95.5, weight: 0, excluded: false },
];
const assignments = [
  {
    id: 'a1',
    title: 'Chapter 4 problems',
    dueDate: '2099-01-05',
    class: 'Algebra II',
    completed: false,
    source: 'hac' as const,
  },
];
const schedule = [{ id: '1', name: 'Algebra II', teacher: 'Mr. Ruiz', room: '101' }];

const cases = [
  {
    name: 'Home',
    element: <HomeScreen navigation={navigation} />,
    loaded: { grades, courses },
    emptyLoaded: { grades: [], courses: [] },
    dataText: 'Weighted GPA',
    emptyText: '—',
  },
  {
    name: 'Grades',
    element: <GradesScreen />,
    loaded: { grades },
    emptyLoaded: { grades: [] },
    dataText: 'Algebra II',
    emptyText: 'No grades yet',
  },
  {
    name: 'GPA',
    element: <GPACalculatorScreen />,
    loaded: { courses },
    emptyLoaded: { courses: [] },
    dataText: 'Current GPA',
    emptyText: 'No courses to calculate',
  },
  {
    name: 'Schedule',
    element: <ScheduleScreen />,
    loaded: { schedule },
    emptyLoaded: { schedule: [] },
    dataText: 'Algebra II',
    emptyText: 'No schedule data',
  },
  {
    name: 'Planner',
    element: <PlannerScreen />,
    loaded: { assignments },
    emptyLoaded: { assignments: [] },
    dataText: 'Chapter 4 problems',
    emptyText: 'All caught up!',
  },
];

afterEach(() => jest.clearAllMocks());

describe.each(cases)('$name screen', ({ element, loaded, emptyLoaded, dataText, emptyText }) => {
  it('renders the loading skeleton while the dashboard is in flight', () => {
    mockUseDataCache.mockReturnValue(dataContext({ loading: true }));
    renderScreen(element);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('renders the error with a working retry when the dashboard fails', async () => {
    const ctx = dataContext({ error: 'Network unavailable' });
    mockUseDataCache.mockReturnValue(ctx);
    renderScreen(element);

    expect(screen.getByText('Network unavailable')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Retry'));
    });
    expect(ctx.loadGradesAndCourses).toHaveBeenCalled();
  });

  it('renders the empty state when the dashboard resolves with nothing', () => {
    mockUseDataCache.mockReturnValue(dataContext(emptyLoaded));
    renderScreen(element);
    expect(screen.getByText(emptyText)).toBeTruthy();
  });

  it('renders the data once the dashboard resolves', () => {
    mockUseDataCache.mockReturnValue(dataContext(loaded));
    renderScreen(element);
    expect(screen.getByText(dataText)).toBeTruthy();
  });
});
