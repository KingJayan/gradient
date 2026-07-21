import { gradeLetter, gradeColor, gradeColorFromLetter, onPrimary } from '../colors';

describe('gradeLetter', () => {
  it.each([
    [100, 'A'],
    [90, 'A'],
    [89.9, 'B'],
    [80, 'B'],
    [70, 'C'],
    [60, 'D'],
    [59.9, 'F'],
    [0, 'F'],
  ])('maps %p to %p', (avg, letter) => {
    expect(gradeLetter(avg)).toBe(letter);
  });

  it('keeps fractional averages on the band their integer part belongs to', () => {
    expect(gradeLetter(89.5)).toBe('B');
    expect(gradeLetter(92.5)).toBe('A');
    expect(gradeLetter(96.5)).toBe('A');
  });
});

describe('gradeColor', () => {
  it('routes through gradeLetter so the color always matches the shown letter', () => {
    for (const avg of [0, 59.9, 60, 69.9, 70, 79.9, 80, 89.5, 89.9, 90, 92.5, 96.5, 100]) {
      expect(gradeColor(avg)).toBe(gradeColorFromLetter(gradeLetter(avg)));
    }
  });

  it('distinguishes D from F', () => {
    expect(gradeColor(65)).not.toBe(gradeColor(55));
  });
});

describe('onPrimary', () => {
  it('picks dark text on light backgrounds and light text on dark ones', () => {
    expect(onPrimary('#00F5A0')).toBe('#111827');
    expect(onPrimary('#060F0B')).toBe('#FFFFFF');
  });
});
