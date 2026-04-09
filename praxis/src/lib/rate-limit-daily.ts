type Usage = { count: number; date: string };

function todayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function createDailyLimiter(limit: number) {
  const map = new Map<string, Usage>();
  return {
    isExceeded(userId: string): boolean {
      const u = map.get(userId);
      return !!(u && u.date === todayIsoDate() && u.count >= limit);
    },
    recordSuccess(userId: string): void {
      const d = todayIsoDate();
      const u = map.get(userId);
      if (u && u.date === d) u.count += 1;
      else map.set(userId, { count: 1, date: d });
    },
  };
}

export const copilotDailyLimiter = createDailyLimiter(100);
export const analyticsInsightDailyLimiter = createDailyLimiter(20);
