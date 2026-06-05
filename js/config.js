// ============================================
// CONFIGURACIÓN Y VARIABLES GLOBALES
// ============================================

// Supabase
const SB = 'https://etapmrnynqtqqjleujok.supabase.co';
const KEY = 'sb_publishable_1GjAGxMyz7BTBa4NLVzAEw_-GPKqFCN';
const BUCKET = 'mda-photos';
const STORAGE_URL = SB + '/storage/v1/object/' + BUCKET + '/';
const STORAGE_PUBLIC = SB + '/storage/v1/object/public/' + BUCKET + '/';

// Variables globales
let MACHINES = [];
let adminUnlocked = false;
let editingId = null;
let photosEditingId = null;
let modalNewFile = null;
let cfg = { q: 5, t: 8, types: [], diff: 'normal' };

const DIFFICULTIES = {
  facil:   { label: '🟢 Fácil',   tMachine: 15, tComm: 20, speedMult: 0.6,  displayMult: 1.0  },
  normal:  { label: '🟡 Normal',  tMachine: 8,  tComm: 12, speedMult: 0.85, displayMult: 1.15 },
  dificil: { label: '🔴 Difícil', tMachine: 5,  tComm: 8,  speedMult: 1.0,  displayMult: 1.3  }
};
// finalMult asegura que respuestas perfectas alcancen exactamente el techo de displayMult
Object.values(DIFFICULTIES).forEach(d => {
  d.finalMult = d.displayMult * 100 / Math.round(10 + 90 * d.speedMult);
});
let playerName = '';
let publicUploadFiles = [];
let publicUploadMachineId = null;

// Quiz variables
let qCorrect = 0, qWrong = 0, qScore = 0, qIdx = -1, qAnswered = false;
let qQueue = [], qTotal = 0, qNum = 0, qStart = 0;
let timerInt = null, autoTO = null;
let qQuestionQueue = [], qCurrentQ = null;

// Community questions admin
let pendingQuestions = [], approvedQuestions = [], _editingQuestionId = null;
const CIRC = 131.9;
const imgCache = {};
const IMG_CACHE_MAX = 150;

const HONOR_LIST = {
  messa:  { scoreMult: 1.3 },
  obrist: { graceFactor: 0.5, excludeFromPrizes: true }
};

// Competencia
let compState = { active: false, endTime: null, prize: '', compId: '' };
let compCountdownInt = null;

// Max pts config
let maxPtsConfig = { 5: 1000, 10: 1200, 20: 1300 };
let resetConfig = { prize: '' };

// Winners y notes mgmt
let allWinnersMgmt = [];
let allNotesMgmt = [];
let allScoresMgmt = [];
let editingScoreId = null;

// Gallery
let galleryPhotos = [], galleryIdx = 0, lbMachineId = null;