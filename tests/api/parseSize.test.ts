import { parseSize } from '../../src/backend/media/parseSize';

describe('parseSize', () => {
  it('parses gigabytes', () => {
    expect(parseSize('1GB')).toBe(1024 ** 3);
  });
  it('parses megabytes', () => {
    expect(parseSize('500MB')).toBe(500 * 1024 ** 2);
  });
  it('parses fractional gigabytes', () => {
    expect(parseSize('0.5GB')).toBe(0.5 * 1024 ** 3);
  });
  it('parses kilobytes', () => {
    expect(parseSize('100kB')).toBe(100 * 1024);
  });
});
