export const isValidDate = (d: unknown): d is Date =>
  d instanceof Date && !isNaN(+d) && +d > +new Date("1971-01-01");

export const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
