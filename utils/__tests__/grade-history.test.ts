import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordGradeSnapshot, classTrend, gpaSeries, loadGradeHistory } from '../grade-history';
import { Course } from '../gpa-calculator';

beforeEach(async () => {
  await AsyncStorage.clear();
});

const course = (name: string, grade: number): Course => ({
  id: name,
  name,
  credits: 1,
  grade,
  weight: 0,
  excluded: false,
});

describe('recordGradeSnapshot', () => {
  it('returns no changes on the first snapshot but records a baseline', async () => {
    const changes = await recordGradeSnapshot([{ className: 'Chem', average: 84 }]);
    expect(changes).toEqual([]);
    expect(await loadGradeHistory()).toHaveLength(1);
  });

  it('detects a changed average against the last snapshot', async () => {
    await recordGradeSnapshot([{ className: 'Chem', average: 84 }]);
    const changes = await recordGradeSnapshot([{ className: 'Chem', average: 88 }]);
    expect(changes).toEqual([{ className: 'Chem', from: 84, to: 88 }]);
  });

  it('ignores ungraded (NaN) averages and unchanged snapshots', async () => {
    await recordGradeSnapshot([{ className: 'Chem', average: 84 }]);
    const changes = await recordGradeSnapshot([
      { className: 'Chem', average: 84 },
      { className: 'Art', average: NaN },
    ]);
    expect(changes).toEqual([]);
    expect(await loadGradeHistory()).toHaveLength(1);
  });
});

describe('trends', () => {
  it('classTrend returns the ordered averages for a class', async () => {
    await recordGradeSnapshot([{ className: 'Chem', average: 84 }]);
    await recordGradeSnapshot([{ className: 'Chem', average: 88 }]);
    expect(classTrend(await loadGradeHistory(), 'Chem')).toEqual([84, 88]);
  });

  it('gpaSeries recomputes GPA per snapshot from course weights', async () => {
    await recordGradeSnapshot([{ className: 'Chem', average: 84 }]);
    await recordGradeSnapshot([{ className: 'Chem', average: 95 }]);
    const series = gpaSeries(await loadGradeHistory(), [course('Chem', 84)]);
    expect(series.map((s) => s.gpa)).toEqual([3, 4]);
  });
});
