// Konstanta global game Bike Challenge (Tahap 1 – Prototype Racing)

export const ROAD_WIDTH = 8;
export const ROAD_HALF = ROAD_WIDTH / 2;
export const WALL_X = ROAD_HALF + 2.6; // pagar bambu di tepi lintasan
export const GRAVITY = 26;

export const COLORS = {
  electric: 0x1e6bff,
  orange: 0xff8a1f,
  yellow: 0xffd21f,
};

// Statistik sepeda (Speed, Acceleration, Handling, Jump) – baru Starter BMX di prototype
export const BIKES = {
  starter: {
    id: "starter",
    name: "Starter BMX",
    maxSpeed: 16,
    accel: 6.8,
    handling: 1.0,
    jump: 8.4,
  },
};

// Empat lawan AI sesuai GDD
export const RIVALS = [
  {
    id: "kakang",
    name: "Kakang",
    desc: "Cepat di lintasan lurus",
    color: 0xe53935,
    straight: 16.0,
    corner: 12.0,
    boost: false,
    lane: -2.4,
  },
  {
    id: "zaki",
    name: "Zaki",
    desc: "Ahli tikungan",
    color: 0x2e9e4f,
    straight: 14.1,
    corner: 14.9,
    boost: false,
    lane: 2.4,
  },
  {
    id: "emji",
    name: "Emji",
    desc: "Agresif memakai boost",
    color: 0x8e3fd1,
    straight: 13.9,
    corner: 13.0,
    boost: true,
    lane: -0.9,
  },
  {
    id: "afkar",
    name: "Afkar",
    desc: "Stabil dan konsisten",
    color: 0x00a3b8,
    straight: 14.6,
    corner: 14.4,
    boost: false,
    lane: 0.9,
  },
];

export const DIFFICULTY = { easy: 0.9, normal: 1.0, hard: 1.07 };
export const DEFAULT_DIFFICULTY = "normal";
