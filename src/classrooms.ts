export const CLASSROOMS = [
  ...Array.from({ length: 12 }, (_, i) => `X-${i + 1}`),
  ...Array.from({ length: 12 }, (_, i) => `XI-${i + 1}`),
  ...Array.from({ length: 12 }, (_, i) => `XII-${i + 1}`),
  "Computer Club"
];

export function formatClassroomName(cls?: string): string {
  if (!cls) return "";
  if (cls.toLowerCase().includes("club") || cls.toLowerCase().includes("komputer") || cls.toLowerCase().includes("klub")) {
    return cls;
  }
  return `Kelas ${cls}`;
}
