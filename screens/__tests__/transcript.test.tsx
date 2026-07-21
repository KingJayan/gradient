import { screen, fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../test/render';
import { useScreenData } from '../../hooks/use-screen-data';
import { TranscriptEntry } from '../../services/api/transcript';
import TranscriptScreen from '../transcript';

jest.mock('../../hooks/use-screen-data', () => ({ useScreenData: jest.fn() }));

const mockUseScreenData = useScreenData as jest.MockedFunction<typeof useScreenData>;

const entries: TranscriptEntry[] = [
  { year: '2024-2025', semester: 'Fall', course: 'Algebra II', grade: 'A', credits: 1, gradePoints: 4 },
];

function query(overrides: Partial<ReturnType<typeof useScreenData>>) {
  return { data: null, error: null, loading: false, refetch: jest.fn(async () => {}), ...overrides };
}

afterEach(() => jest.clearAllMocks());

describe('Transcript screen', () => {
  it('renders the loading skeleton while the transcript is in flight', () => {
    mockUseScreenData.mockReturnValue(query({ loading: true }));
    renderScreen(<TranscriptScreen />);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });

  it('renders the error with a working retry when the fetch fails', () => {
    const q = query({ error: 'Could not reach HAC' });
    mockUseScreenData.mockReturnValue(q);
    renderScreen(<TranscriptScreen />);

    expect(screen.getByText('Could not reach HAC')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Retry'));
    expect(q.refetch).toHaveBeenCalled();
  });

  it('renders the empty state when the transcript resolves with no entries', () => {
    mockUseScreenData.mockReturnValue(query({ data: [] }));
    renderScreen(<TranscriptScreen />);
    expect(screen.getByText('No transcript data available.')).toBeTruthy();
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('renders the years and cumulative GPA once the transcript resolves', () => {
    mockUseScreenData.mockReturnValue(query({ data: entries }));
    renderScreen(<TranscriptScreen />);

    expect(screen.getByText('4.00')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('2024-2025, GPA 4.00'));
    expect(screen.getByText('Algebra II')).toBeTruthy();
  });
});
