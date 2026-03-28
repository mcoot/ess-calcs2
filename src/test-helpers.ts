/** Create a UTC Date — shorthand for test data. */
export function d(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m - 1, day));
}
