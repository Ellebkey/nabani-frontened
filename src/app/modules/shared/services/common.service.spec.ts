import { CommonService } from './common.service';

describe('CommonService', () => {
  let service: CommonService;

  beforeEach(() => {
    service = new CommonService();
  });

  describe('getMonthDateRange', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    const freezeTime = (date: Date): void => {
      jest.useFakeTimers();
      jest.setSystemTime(date);
    };

    it('should return the first and last day of a 28-day month', () => {
      freezeTime(new Date(2026, 1, 15, 12, 30));

      expect(service.getMonthDateRange()).toEqual({
        startDate: '2026-02-01',
        endDate: '2026-02-28'
      });
    });

    it('should return the first and last day of a 31-day month', () => {
      freezeTime(new Date(2026, 0, 20));

      expect(service.getMonthDateRange()).toEqual({
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      });
    });

    it('should handle February in a leap year', () => {
      freezeTime(new Date(2028, 1, 10));

      expect(service.getMonthDateRange()).toEqual({
        startDate: '2028-02-01',
        endDate: '2028-02-29'
      });
    });
  });

  describe('formatToISO', () => {
    it('should format a date as yyyy-MM-dd', () => {
      expect(service.formatToISO(new Date(2026, 5, 9))).toBe('2026-06-09');
    });

    it('should zero-pad month and day', () => {
      expect(service.formatToISO(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('should ignore the time portion of the date', () => {
      expect(service.formatToISO(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
    });
  });

  describe('combineDateAndTime', () => {
    it('should combine a Date and an HH:mm time into a UTC ISO string', () => {
      const result = service.combineDateAndTime(new Date(2026, 5, 9), '14:30');

      expect(result).toBe(new Date(2026, 5, 9, 14, 30, 0, 0).toISOString());
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should replace any existing time on the date and zero seconds/milliseconds', () => {
      const dateWithTime = new Date(2026, 5, 9, 23, 58, 57, 123);

      const result = service.combineDateAndTime(dateWithTime, '08:05');

      expect(result).toBe(new Date(2026, 5, 9, 8, 5, 0, 0).toISOString());
    });

    it('should not mutate the original date', () => {
      const original = new Date(2026, 5, 9, 1, 2, 3, 4);

      service.combineDateAndTime(original, '10:15');

      expect(original.getHours()).toBe(1);
      expect(original.getMinutes()).toBe(2);
      expect(original.getSeconds()).toBe(3);
    });

    it('should accept a local date-time string as the date input', () => {
      const result = service.combineDateAndTime('2026-06-09T10:00:00' as unknown as Date, '14:30');

      expect(result).toBe(new Date(2026, 5, 9, 14, 30, 0, 0).toISOString());
    });

    it('should handle midnight (00:00)', () => {
      const result = service.combineDateAndTime(new Date(2026, 5, 9, 12, 0), '00:00');

      expect(result).toBe(new Date(2026, 5, 9, 0, 0, 0, 0).toISOString());
    });

    it('should handle the end of the day (23:59)', () => {
      const result = service.combineDateAndTime(new Date(2026, 5, 9), '23:59');

      expect(result).toBe(new Date(2026, 5, 9, 23, 59, 0, 0).toISOString());
    });

    it('should return an empty string when the date is missing', () => {
      expect(service.combineDateAndTime(null as unknown as Date, '10:00')).toBe('');
      expect(service.combineDateAndTime(undefined as unknown as Date, '10:00')).toBe('');
    });

    it('should return an empty string when the time is missing', () => {
      expect(service.combineDateAndTime(new Date(2026, 5, 9), '')).toBe('');
      expect(service.combineDateAndTime(new Date(2026, 5, 9), null as unknown as string)).toBe('');
    });

    it('should return an empty string when both inputs are missing', () => {
      expect(service.combineDateAndTime(null as unknown as Date, '')).toBe('');
    });
  });

  describe('getDefaultDeleteConfirmation', () => {
    it('should build the confirmation config around the object name', () => {
      const config = service.getDefaultDeleteConfirmation({ objectName: 'expense' });

      expect(config.title).toBe('Remove expense');
      expect(config.message).toContain('Are you sure you want to remove this expense permanently?');
      expect(config.message).toContain('This action cannot be undone!');
    });

    it('should use the warning icon and a warn-colored confirm action', () => {
      const config = service.getDefaultDeleteConfirmation({ objectName: 'tag' });

      expect(config.icon).toEqual({
        show: true,
        name: 'heroicons_outline:exclamation-triangle',
        color: 'warn'
      });
      expect(config.actions?.confirm).toEqual({ show: true, label: 'Remove', color: 'warn' });
      expect(config.actions?.cancel).toEqual({ show: true, label: 'Cancel' });
    });

    it('should not be dismissible', () => {
      expect(service.getDefaultDeleteConfirmation({ objectName: 'income' }).dismissible).toBe(false);
    });
  });
});
