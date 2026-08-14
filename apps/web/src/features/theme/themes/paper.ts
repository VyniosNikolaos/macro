import { defineLegacyDefaultTheme } from './defineLegacyDefaultTheme';

/** Warm off-white paper with a cool ink-blue accent. */
export const paperTheme = defineLegacyDefaultTheme({
  id: 'Paper',
  tokens: {
    a0: { l: 0.5, c: 0.13, h: 250 },
    a1: { l: 0.5, c: 0.13, h: 290 },
    a2: { l: 0.5, c: 0.13, h: 330 },
    a3: { l: 0.5, c: 0.13, h: 10 },
    a4: { l: 0.5, c: 0.13, h: 50 },
    b0: { l: 0.985, c: 0.006, h: 75 },
    b1: { l: 0.965, c: 0.007, h: 75 },
    b2: { l: 0.935, c: 0.008, h: 75 },
    b3: { l: 0.955, c: 0.007, h: 75 },
    b4: { l: 0.935, c: 0.008, h: 75 },
    c0: { l: 0.22, c: 0.008, h: 70 },
    c1: { l: 0.4, c: 0.007, h: 70 },
    c2: { l: 0.52, c: 0.006, h: 70 },
    c3: { l: 0.62, c: 0.005, h: 70 },
    c4: { l: 0.72, c: 0.004, h: 70 },
  },
});
