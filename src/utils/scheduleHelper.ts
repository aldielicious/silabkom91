export interface SessionSlot {
  id: string;
  name: string;
  time: string;
}

export interface RestTime {
  time: string;
  name: string;
}

export function getDayOfWeekFromDateString(dateStr: string): number {
  if (!dateStr) return 1; // Default to Monday
  const parts = dateStr.split("-");
  if (parts.length !== 3) return 1;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  return date.getDay(); // 0: Sunday, 1: Monday, ..., 6: Saturday
}

export function getDayLabel(dayOfWeek: number): string {
  switch (dayOfWeek) {
    case 1:
      return "SENIN";
    case 5:
      return "JUM'AT";
    case 2:
    case 3:
    case 4:
      return "SELASA - RABU - KAMIS";
    default:
      // Treat Saturday and Sunday as general weekdays for simulation fallback
      return "SELASA - RABU - KAMIS";
  }
}

export function getSessionsForDate(dateStr: string): SessionSlot[] {
  const day = getDayOfWeekFromDateString(dateStr);
  
  if (day === 1) {
    // Monday Schedule (12 periods)
    return [
      { id: "jam-1", name: "Jam Ke-1 (Upacara)", time: "06:20 - 07:10" },
      { id: "jam-2", name: "Jam Ke-2", time: "07:20 - 08:00" },
      { id: "jam-3", name: "Jam Ke-3", time: "08:00 - 08:40" },
      { id: "jam-4", name: "Jam Ke-4", time: "08:40 - 09:20" },
      { id: "jam-5", name: "Jam Ke-5", time: "09:20 - 10:00" },
      { id: "jam-6", name: "Jam Ke-6", time: "10:10 - 10:50" },
      { id: "jam-7", name: "Jam Ke-7", time: "10:50 - 11:30" },
      { id: "jam-8", name: "Jam Ke-8", time: "11:30 - 12:10" },
      { id: "jam-9", name: "Jam Ke-9", time: "12:50 - 13:30" },
      { id: "jam-10", name: "Jam Ke-10", time: "13:30 - 14:10" },
      { id: "jam-11", name: "Jam Ke-11", time: "14:10 - 14:50" },
      { id: "jam-12", name: "Jam Ke-12", time: "14:50 - 15:30" },
      { id: "jam-13", name: "Di Luar Jam KBM", time: "Sesuai Kebutuhan" }
    ];
  } else if (day === 5) {
    // Friday Schedule (7 periods)
    return [
      { id: "jam-1", name: "Jam Ke-1 (Pembiasaan Positif)", time: "06:30 - 07:25" },
      { id: "jam-2", name: "Jam Ke-2", time: "07:25 - 08:05" },
      { id: "jam-3", name: "Jam Ke-3", time: "08:05 - 08:45" },
      { id: "jam-4", name: "Jam Ke-4", time: "08:45 - 09:25" },
      { id: "jam-5", name: "Jam Ke-5", time: "09:40 - 10:20" },
      { id: "jam-6", name: "Jam Ke-6", time: "10:20 - 11:00" },
      { id: "jam-7", name: "Jam Ke-7 (Ekskul Pramuka & Pilihan)", time: "13:00 - Selesai" },
      { id: "jam-8", name: "Di Luar Jam KBM", time: "Sesuai Kebutuhan" }
    ];
  } else {
    // Tuesday - Wednesday - Thursday Schedule (11 periods)
    return [
      { id: "jam-1", name: "Jam Ke-1", time: "06:30 - 07:15" },
      { id: "jam-2", name: "Jam Ke-2", time: "07:15 - 08:00" },
      { id: "jam-3", name: "Jam Ke-3", time: "08:00 - 08:45" },
      { id: "jam-4", name: "Jam Ke-4", time: "08:45 - 09:30" },
      { id: "jam-5", name: "Jam Ke-5", time: "09:45 - 10:30" },
      { id: "jam-6", name: "Jam Ke-6", time: "10:30 - 11:15" },
      { id: "jam-7", name: "Jam Ke-7", time: "11:15 - 12:00" },
      { id: "jam-8", name: "Jam Ke-8", time: "12:45 - 13:30" },
      { id: "jam-9", name: "Jam Ke-9", time: "13:30 - 14:15" },
      { id: "jam-10", name: "Jam Ke-10", time: "14:15 - 15:00" },
      { id: "jam-11", name: "Jam Ke-11", time: "15:00 - 15:45" },
      { id: "jam-12", name: "Di Luar Jam KBM", time: "Sesuai Kebutuhan" }
    ];
  }
}

export function getRestTimesForDate(dateStr: string): RestTime[] {
  const day = getDayOfWeekFromDateString(dateStr);
  if (day === 1) {
    return [
      { time: "07:10 - 07:20", name: "Istirahat" },
      { time: "10:00 - 10:10", name: "Istirahat" },
      { time: "12:10 - 12:50", name: "Istirahat" }
    ];
  } else if (day === 5) {
    return [
      { time: "09:25 - 09:40", name: "Istirahat" },
      { time: "11:00 - 13:00", name: "Istirahat & Kegiatan Keagamaan" }
    ];
  } else {
    return [
      { time: "09:30 - 09:45", name: "Istirahat" },
      { time: "12:00 - 12:45", name: "Istirahat" }
    ];
  }
}

export function getOutsideKBMExtraHour(dateStr: string): number {
  const day = getDayOfWeekFromDateString(dateStr);
  if (day === 1) return 13;
  if (day === 5) return 8;
  return 12; // Tuesday - Thursday
}
