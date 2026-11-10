// Definisi lintasan & tema visual
import { TRACK1_POINTS, TRACK1_CONTENT } from './trackData.js';

const DAY = {
  sky: { top: 0x2f7fe8, mid: 0x8cc8ff, hor: 0xdff2ff },
  fog: 0xdff2ff, fogRange: [90, 520],
  hemi: { sky: 0xdcefff, ground: 0x7a9a55, intensity: 1.15 },
  sun: { color: 0xfff0d0, intensity: 2.3, offset: [55, 85, 40], disc: [500, 700, 700] },
  ground: { base: '#62b043', noise: ['#58a23a', '#6cbd4b', '#4f9833'] },
  road: 'asphalt', shoulder: '#a58559',
  rice: [['#79c142', '#5aa534', '#a6d96a'], ['#8fcf4a', '#6db83a', '#b8e07a'], ['#d8c553', '#bfa93f', '#ecdc7a']],
  houses: 26, palms: 320, bushes: 160, fields: 34, flags: true,
  mountains: [0x4f9a68, 0x5f8fbd],
};

const SUNSET = {
  ...DAY,
  sky: { top: 0x5a4aa8, mid: 0xff8f5c, hor: 0xffd6a0 },
  fog: 0xffcf9e, fogRange: [80, 480],
  hemi: { sky: 0xffe0c0, ground: 0x8a7a45, intensity: 1.0 },
  sun: { color: 0xffa860, intensity: 2.2, offset: [90, 38, -35], disc: [-600, 180, -800] },
  ground: { base: '#80b03c', noise: ['#74a232', '#8cc046', '#689628'] },
  rice: [['#d8c553', '#bfa93f', '#ecdc7a'], ['#e3cf5e', '#c9b244', '#f2e486'], ['#8fcf4a', '#6db83a', '#b8e07a']],
  mountains: [0x6a5a8a, 0x8a6a9a],
};

const DIRT = {
  ...DAY,
  sky: { top: 0x4a8fe0, mid: 0xa8d0f5, hor: 0xf0e6d0 },
  fog: 0xf0e4cc, fogRange: [80, 460],
  hemi: { sky: 0xfff0d8, ground: 0x9a7a4a, intensity: 1.1 },
  sun: { color: 0xfff0d0, intensity: 2.4, offset: [-60, 85, 50], disc: [-500, 700, 700] },
  ground: { base: '#a98d52', noise: ['#9a7f48', '#b89c60', '#8c723e'] },
  road: 'dirt', shoulder: '#8a6a3a',
  rice: [['#c9b25a', '#a8923f', '#dcc872'], ['#b9a052', '#9a8440', '#d0bb6c'], ['#a9b955', '#8a9a40', '#c0cf6c']],
  houses: 8, palms: 130, bushes: 260, fields: 8, flags: false,
  mountains: [0x8a7a55, 0x7a8aa5],
};

export const TRACKS = {
  'kampung-1': {
    id: 'kampung-1', name: 'Kampung Race 1', sub: 'Jalan Sawah', world: 'Kampung Race', emoji: '🌾',
    desc: 'Jalan kampung berkelok di antara sawah dan pohon kelapa.',
    points: TRACK1_POINTS, startS: 30, seed: 7, theme: DAY, content: TRACK1_CONTENT,
    climb: 'Bukit landai: naik-turun sampai sekitar 8 m.',
    // [pecahan panjang lintasan, tinggi (m)]: bukit-bukit kecil yang bergelombang
    hills: [[0, 0], [0.05, 0], [0.17, 3], [0.28, 7], [0.36, 6], [0.43, 0.5], [0.5, 4], [0.56, 3], [0.59, 0.5], [0.66, 4], [0.76, 8], [0.88, 3], [0.95, 0], [1, 0]],
  },
  'kampung-2': {
    id: 'kampung-2', name: 'Kampung Race 2', sub: 'Sawah Senja', world: 'Kampung Race', emoji: '🌅',
    desc: 'Balapan sore hari melewati sawah menguning. Lebih panjang dan berkelok.',
    points: [[0, 20], [0, 0], [0, -100], [40, -190], [110, -250], [190, -270], [260, -330], [270, -430], [220, -510], [140, -560], [70, -640], [60, -740], [110, -820], [190, -870], [250, -950], [240, -1050]],
    startS: 30, seed: 21, theme: SUNSET,
    climb: 'Perbukitan: tanjakan dan turunan sampai sekitar 13 m.',
    hills: [[0, 0], [0.05, 0], [0.14, 5], [0.25, 11], [0.33, 9], [0.395, 0.5], [0.46, 6], [0.56, 11], [0.64, 6], [0.69, 0.5], [0.76, 7], [0.86, 13], [0.94, 5], [0.98, 0], [1, 0]],
    gen: { seed: 21, gapMin: 28, gapMax: 44, weights: { pothole: 3, puddle: 2, ramp: 2 }, bridges: [0.36, 0.7], goats: 7 },
  },
  'dirt-1': {
    id: 'dirt-1', name: 'Dirt Track 1', sub: 'Lintasan BMX', world: 'Dirt Track', emoji: '🏜️',
    desc: 'Jalan tanah penuh tikungan, ramp, dan genangan. Pegangan sepeda sangat penting!',
    points: [[0, 20], [0, 0], [0, -80], [-40, -150], [-110, -190], [-160, -260], [-130, -340], [-60, -380], [0, -450], [20, -540], [-30, -620], [-100, -660], [-140, -740], [-90, -820], [-20, -860], [40, -940]],
    startS: 30, seed: 33, theme: DIRT,
    climb: 'Rute gunung! Mendaki sampai sekitar 26 m, lalu turun ke lembah dan mendaki lagi.',
    // rute gunung: mendaki ke puncak, turun lembah, mendaki lagi, finis di atas bukit
    hills: [[0, 0], [0.04, 0], [0.14, 7], [0.26, 16], [0.37, 27], [0.45, 12], [0.52, 1], [0.6, 8], [0.7, 22], [0.78, 30], [0.86, 20], [0.93, 12], [1, 12]],
    gen: { seed: 33, gapMin: 14, gapMax: 25, weights: { pothole: 3, puddle: 3, ramp: 4 }, bridges: [0.55], goats: 5 },
  },
};
export const TRACK_ORDER = ['kampung-1', 'kampung-2', 'dirt-1'];
