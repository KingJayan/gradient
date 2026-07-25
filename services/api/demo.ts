import Constants from 'expo-constants';

export const DEMO_MODE: boolean = Constants.expoConfig?.extra?.demoMode !== false;

export const DEMO_CREDENTIALS = {
  username: 'demo',
  password: 'demo',
  hacUrl: 'https://demo.gradient.app/',
};

export const DEMO_STUDENT_NAME = 'Demo Student';

export function isDemoUser(username: string): boolean {
  return DEMO_MODE && username === DEMO_CREDENTIALS.username;
}

function day(offset: number): string {
  return new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
}

const AVERAGES: Record<string, string> = {
  'AP Calculus BC': '96.83',
  'AP English Literature': '92.50',
  'Honors Chemistry': '89.14',
  'World History': '85.20',
  'Spanish III': '78.45',
  'Concert Band': '100.00',
};

const CLASS_DETAILS: Record<string, { period: string; teacher: string; room: string }> = {
  'AP Calculus BC': { period: '1', teacher: 'Ruiz, M', room: '204' },
  'AP English Literature': { period: '2', teacher: 'Okafor, A', room: '118' },
  'Honors Chemistry': { period: '3', teacher: 'Lindqvist, P', room: 'S12' },
  'World History': { period: '5', teacher: 'Bhatt, R', room: '221' },
  'Spanish III': { period: '6', teacher: 'Delgado, C', room: '109' },
  'Concert Band': { period: '7', teacher: 'Whitfield, J', room: 'BAND' },
};

function assignmentRows(className: string): string[][] {
  const base = [
    ['Unit Review', 'Homework', '92', '100'],
    ['Quiz 3', 'Quizzes', '48', '50'],
    ['Chapter Test', 'Tests', '', '100'],
  ];
  return base.map(([name, category, score, total], i) => [
    day(i * 4 - 4),
    day(i * 4 - 11),
    `${className}: ${name}`,
    category,
    score,
    total,
  ]);
}

const TRANSCRIPT_GRADES: Record<string, string> = {
  'AP Calculus BC': 'A',
  'AP English Literature': 'A-',
  'Honors Chemistry': 'B+',
  'World History': 'B',
  'Spanish III': 'C+',
  'Concert Band': 'A',
};

const CLASSES = Object.keys(AVERAGES);

function payload(endpoint: string): unknown {
  switch (endpoint) {
    case 'profiles':
      return [{ id: 'demo', name: DEMO_STUDENT_NAME }];
    case 'averages':
      return AVERAGES;
    case 'assignments':
      return Object.fromEntries(
        CLASSES.map((name) => [
          name,
          { average: AVERAGES[name], assignments: assignmentRows(name), categories: [] },
        ])
      );
    case 'reportcard':
      return {
        headers: ['Course', 'Description', 'Period', 'Teacher', 'Room'],
        data: CLASSES.map((name, i) => [
          `MTH${100 + i}`,
          name,
          CLASS_DETAILS[name].period,
          CLASS_DETAILS[name].teacher,
          CLASS_DETAILS[name].room,
        ]),
      };
    case 'transcript':
      return {
        '1': {
          year: '2024-2025',
          semester: 'Full Year',
          data: [
            ['Course', 'Description', 'Grade', 'Credit'],
            ...CLASSES.map((name, i) => [
              `MTH${100 + i}`,
              name,
              TRANSCRIPT_GRADES[name],
              '1.0',
            ]),
          ],
        },
      };
    default:
      return undefined;
  }
}

export function demoPayload(endpoint: string, username: string): unknown {
  return isDemoUser(username) ? payload(endpoint) : undefined;
}
