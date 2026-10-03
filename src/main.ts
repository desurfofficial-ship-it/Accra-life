import {
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType
} from './firebase';

// ===================== BLUEPRINT VALIDATION CONSTANTS =====================
const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const OWNER_ID_MAX_LEN = 128;
const PLAYER_ID_MAX_LEN = 64;
const NAME_MAX_LEN = 32;
const HOUSE_NAME_MAX_LEN = 64;
const STATUS_MAX_LEN = 64;
const LOG_MAX_ITEMS = 20;
const LOG_ITEM_MAX_LEN = 200;

const ALLOWED_CAREERS = [
  'unemployed',
  'trader',
  'developer',
  'teacher',
  'musician',
  'driver',
  'student'
] as const;

const ALLOWED_LOCATIONS = [
  'home',
  'makola',
  'labadi',
  'square',
  'legon',
  'kaneshie',
  'tech',
  'church',
  'mall',
  'circle'
] as const;

type CareerKey = (typeof ALLOWED_CAREERS)[number];
type LocationKey = (typeof ALLOWED_LOCATIONS)[number];

interface FriendNPC {
  id: 'ama' | 'kofi' | 'abena' | 'kwame' | 'efua';
  name: string;
  house: string;
  emoji: string;
  money: number;
  affinity: number;
  mood: string;
  bio: string;
  status: string;
  lastInteract: number;
  timesVisited: number;
  routine: Record<number, string>;
}

interface GameState {
  name: string;
  day: number;
  time: number;
  location: LocationKey;
  career: CareerKey;
  money: number;
  hunger: number;
  energy: number;
  happy: number;
  social: number;
  health: number;
  visiting: string | null;
  pendingInvite: string | null;
  friends: FriendNPC[];
  log: string[];
  version: number;
}

interface AccountInfo {
  playerId: string | null;
  uid: string | null;
  displayName: string | null;
  isGuest: boolean;
  createdAt: string | null;
}

// ===================== CORE DATA =====================
const LOCATIONS: Record<LocationKey, { name: string; emoji: string; desc: string; actions: string[] }> = {
  home: { name: 'Your Flat (Osu)', emoji: '🏠', desc: 'Your place in Osu.', actions: ['sleep', 'cook', 'watch', 'clean'] },
  makola: { name: 'Makola Market', emoji: '🛒', desc: 'Commercial heart of Accra.', actions: ['buy_food', 'sell', 'bargain', 'load_goods'] },
  labadi: { name: 'Labadi Beach', emoji: '🏖️', desc: 'Sand, sea, reset energy.', actions: ['swim', 'relax', 'kelewele', 'party'] },
  square: { name: 'Independence Square', emoji: '🇬🇭', desc: 'Black Star Square.', actions: ['reflect', 'photo', 'meet'] },
  legon: { name: 'University of Ghana', emoji: '🎓', desc: 'Legon campus.', actions: ['study', 'lecture', 'network'] },
  kaneshie: { name: 'Kaneshie', emoji: '🥬', desc: 'Fresh food and real energy.', actions: ['banku', 'hustle', 'gist'] },
  tech: { name: 'Tech Hub', emoji: '💻', desc: 'Where builders gather.', actions: ['code', 'pitch', 'freelance'] },
  church: { name: 'Church', emoji: '⛪', desc: 'Community and peace.', actions: ['worship', 'fellowship', 'donate'] },
  mall: { name: 'Accra Mall', emoji: '🏬', desc: 'Shopping and cinema.', actions: ['shop', 'cinema', 'foodcourt'] },
  circle: { name: 'Circle', emoji: '🚌', desc: 'Kwame Nkrumah Circle.', actions: ['street_food', 'side_hustle', 'observe'] }
};

const CAREERS: Record<CareerKey, { name: string; pay: number; desc: string; reqMoney: number }> = {
  unemployed: { name: 'Unemployed', pay: 0, desc: 'Pure hustle.', reqMoney: 0 },
  trader: { name: 'Market Trader', pay: 35, desc: 'Buy and sell.', reqMoney: 80 },
  developer: { name: 'Developer', pay: 70, desc: 'Build software.', reqMoney: 0 },
  teacher: { name: 'Teacher', pay: 45, desc: 'Teach the next generation.', reqMoney: 0 },
  musician: { name: 'Musician', pay: 30, desc: 'Create and perform.', reqMoney: 40 },
  driver: { name: 'Driver', pay: 40, desc: 'Move people around Accra.', reqMoney: 100 },
  student: { name: 'Student', pay: 10, desc: 'Focus on learning.', reqMoney: 0 }
};

const DIALOGUE: Record<string, { chat: string[]; hang: string[]; gift: string[] }> = {
  ama: {
    chat: ['How is life treating you?', 'You look well today.', 'Anything you need, just say.'],
    hang: ['We cooked and talked for hours.', 'She shared stories from work.'],
    gift: ['She pressed money into your hand.', "Ama: 'Take this. No argument.'"]
  },
  kofi: {
    chat: ['Any wahala? Talk to me.', 'You know I dey your side.', 'How the hustle?'],
    hang: ['You both fixed things and talked life.', 'Solid time with Kofi.'],
    gift: ['Kofi forced money into your hand.', "He wouldn't let you leave empty-handed."]
  },
  abena: {
    chat: ['You look like you need good news.', 'Come, sit. Tell me everything.'],
    hang: ['She ordered food for both of you.', 'Abena made you feel at home.'],
    gift: ['She sent you money without asking.', "Abena: 'Just a small something.'"]
  },
  kwame: {
    chat: ['The hustle continues. How far?', 'We go make am one day.'],
    hang: ['You talked goals and strategy.', 'Two grinders comparing notes.'],
    gift: ['He shared a small win with you.', "Kwame: 'We rise together.'"]
  },
  efua: {
    chat: ['Have you heard the latest highlife?', 'You need more music in your life.'],
    hang: ['Music, stories, pure vibes.', "Efua's energy is contagious."],
    gift: ['She gave you something thoughtful.', 'Efua always finds a way to bless people.']
  }
};

const DEFAULT_FRIENDS: FriendNPC[] = [
  { id: 'ama', name: 'Ama', house: "Ama's Place (Adenta)", emoji: '🏡', money: 240, affinity: 42, mood: 'content', bio: 'Works in banking. Steady and caring.', status: 'at home', lastInteract: 0, timesVisited: 0, routine: { 0: 'at home', 1: 'at work', 2: 'at home', 3: 'sleeping' } },
  { id: 'kofi', name: 'Kofi', house: "Kofi's Spot (Tema)", emoji: '🏠', money: 160, affinity: 38, mood: 'focused', bio: 'Mechanic and side hustler. Very loyal.', status: 'at work', lastInteract: 0, timesVisited: 0, routine: { 0: 'at work', 1: 'at work', 2: 'at home', 3: 'sleeping' } },
  { id: 'abena', name: 'Abena', house: "Abena's Flat (East Legon)", emoji: '🏢', money: 340, affinity: 55, mood: 'happy', bio: 'Runs a boutique. Generous when she can.', status: 'at home', lastInteract: 0, timesVisited: 0, routine: { 0: 'at home', 1: 'at shop', 2: 'out', 3: 'at home' } },
  { id: 'kwame', name: 'Kwame', house: "Kwame's Room (Madina)", emoji: '👨🏻', money: 95, affinity: 33, mood: 'tired', bio: 'Student and part-time rider.', status: 'at school', lastInteract: 0, timesVisited: 0, routine: { 0: 'at school', 1: 'riding', 2: 'at home', 3: 'sleeping' } },
  { id: 'efua', name: 'Efua', house: "Efua's Home (Dansoman)", emoji: '👩🏻', money: 190, affinity: 48, mood: 'cheerful', bio: 'Teacher by day, highlife lover by night.', status: 'at home', lastInteract: 0, timesVisited: 0, routine: { 0: 'at school', 1: 'at school', 2: 'at home', 3: 'out' } }
];

// ===================== STATE & ACCOUNT =====================
let account: AccountInfo = {
  playerId: null,
  uid: null,
  displayName: null,
  isGuest: true,
  createdAt: null
};

let state: GameState | null = null;
const TIME = ['Morning', 'Afternoon', 'Evening', 'Night'];
let sendTarget: string | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;

function generatePlayerId(): string {
  const raw = 'accra_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  return sanitizeId(raw, PLAYER_ID_MAX_LEN);
}

function sanitizeId(val: string, maxLen: number): string {
  const cleaned = val.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : 'accra_player';
}

function sanitizeString(val: string, maxLen: number, fallback: string): string {
  const trimmed = (val || '').trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : fallback;
}

function clampStat(v: number): number {
  return Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
}

function clampMoney(v: number): number {
  return Math.max(0, Math.min(100000000, Math.round(Number(v) || 0)));
}

function clampDay(v: number): number {
  return Math.max(1, Math.min(100000, Math.round(Number(v) || 1)));
}

function clampTime(v: number): number {
  return Math.max(0, Math.min(3, Math.round(Number(v) || 0)));
}

function sanitizeCareer(c: string): CareerKey {
  return (ALLOWED_CAREERS as readonly string[]).includes(c) ? (c as CareerKey) : 'unemployed';
}

function sanitizeLocation(l: string): LocationKey {
  return (ALLOWED_LOCATIONS as readonly string[]).includes(l) ? (l as LocationKey) : 'home';
}

function createDefaultState(name?: string | null): GameState {
  const safeName = sanitizeString(name || 'Accra Resident', NAME_MAX_LEN, 'Accra Resident');
  return {
    name: safeName,
    day: 1,
    time: 0,
    location: 'home',
    career: 'unemployed',
    money: 180,
    hunger: 75,
    energy: 85,
    happy: 65,
    social: 45,
    health: 90,
    visiting: null,
    pendingInvite: null,
    friends: JSON.parse(JSON.stringify(DEFAULT_FRIENDS)),
    log: [`Welcome ${safeName}. This is your life in Accra.`],
    version: 3
  };
}

const ACTIONS: Record<string, { title: string; cost: string; fn: () => void }> = {
  sleep: { title: 'Sleep', cost: 'Energy +++', fn: () => { change('energy', 50); change('hunger', -12); advanceTime(8); log('You slept well.'); } },
  cook: { title: 'Cook', cost: '₵6', fn: () => { if (spend(6)) { change('hunger', 40); change('happy', 8); log('Home-cooked meal.'); } } },
  watch: { title: 'Watch TV', cost: 'Happy +', fn: () => { change('happy', 18); change('energy', -6); advanceTime(2); log('Relaxed with a show.'); } },
  clean: { title: 'Clean', cost: 'Happy +', fn: () => { change('happy', 10); change('health', 5); change('energy', -10); log('Place feels better.'); } },
  buy_food: { title: 'Street food', cost: '₵12', fn: () => { if (spend(12)) { change('hunger', 42); change('happy', 10); log('Waakye hit different.'); } } },
  sell: { title: 'Sell goods', cost: 'Earn ₵25-60', fn: () => { const e = 25 + Math.floor(Math.random() * 36); change('money', e); change('energy', -18); log(`Sold goods for ₵${e}.`); } },
  bargain: { title: 'Bargain', cost: 'Skill', fn: () => { if (Math.random() > 0.35) { change('money', 18); log('Good bargain.'); } else { change('happy', -5); log('They held firm.'); } } },
  load_goods: { title: 'Load goods', cost: 'Earn ₵15', fn: () => { change('money', 15); change('energy', -20); log('Helped load goods.'); } },
  swim: { title: 'Swim', cost: 'Health +', fn: () => { change('energy', -16); change('health', 18); change('happy', 22); log('Ocean reset.'); } },
  relax: { title: 'Chill', cost: 'Happy ++', fn: () => { change('happy', 28); change('energy', 12); log('Beach therapy.'); } },
  kelewele: { title: 'Kelewele', cost: '₵8', fn: () => { if (spend(8)) { change('hunger', 28); change('happy', 18); log('Spicy kelewele.'); } } },
  party: { title: 'Party', cost: '₵35', fn: () => { if (spend(35)) { change('social', 35); change('happy', 30); change('energy', -25); log('Good night out.'); } }, },
  reflect: { title: 'Reflect', cost: 'Happy +', fn: () => { change('happy', 16); log('Quiet moment at the Square.'); } },
  photo: { title: 'Photos', cost: 'Happy +', fn: () => { change('happy', 12); log('Snapped some shots.'); } },
  meet: { title: 'Meet people', cost: 'Social ++', fn: () => { change('social', 26); log('New connections.'); } },
  study: { title: 'Study', cost: 'Energy -', fn: () => { change('energy', -22); change('happy', 6); if (state?.career === 'student') change('money', 8); log('Studied hard.'); } },
  lecture: { title: 'Lecture', cost: 'Energy -', fn: () => { change('energy', -16); change('social', 12); log('Attended lecture.'); } },
  network: { title: 'Network', cost: 'Social +++', fn: () => { change('social', 32); change('energy', -12); log('Network grew.'); } },
  banku: { title: 'Banku & Tilapia', cost: '₵28', fn: () => { if (spend(28)) { change('hunger', 55); change('happy', 22); change('health', 6); log('Banku and tilapia.'); } } },
  hustle: { title: 'Side hustle', cost: 'Earn ₵18-40', fn: () => { const e = 18 + Math.floor(Math.random() * 23); change('money', e); change('energy', -20); log(`Hustle paid ₵${e}.`); } },
  gist: { title: 'Catch gist', cost: 'Social +', fn: () => { change('social', 20); change('happy', 10); log('Got the latest gist.'); } },
  code: { title: 'Code', cost: 'Energy --', fn: () => { change('energy', -28); if (Math.random() > 0.45) { const e = 45 + Math.floor(Math.random() * 70); change('money', e); log(`Shipped work for ₵${e}.`); } else log('Coded for hours.'); } },
  pitch: { title: 'Pitch', cost: 'Risk', fn: () => { if (Math.random() > 0.55) { change('money', 120); change('happy', 35); log('Pitch went well!'); } else { change('happy', -12); log('Pitch missed.'); } } },
  freelance: { title: 'Freelance', cost: 'Earn ₵60-140', fn: () => { const e = 60 + Math.floor(Math.random() * 81); change('money', e); change('energy', -32); log(`Freelance: ₵${e}.`); } },
  worship: { title: 'Service', cost: 'Happy ++', fn: () => { change('happy', 28); change('social', 16); log('Service was uplifting.'); } },
  fellowship: { title: 'Fellowship', cost: 'Social ++', fn: () => { change('social', 28); change('happy', 16); log('Good fellowship.'); } },
  donate: { title: 'Give', cost: '₵20', fn: () => { if (spend(20)) { change('happy', 18); log('You gave.'); } } },
  shop: { title: 'Shop', cost: '₵20-80', fn: () => { const c = 20 + Math.floor(Math.random() * 61); if (spend(c)) { change('happy', 20); log(`Spent ₵${c}.`); } } },
  cinema: { title: 'Cinema', cost: '₵45', fn: () => { if (spend(45)) { change('happy', 30); change('social', 8); log('Watched a film.'); } } },
  foodcourt: { title: 'Food court', cost: '₵35', fn: () => { if (spend(35)) { change('hunger', 45); change('happy', 12); log('Ate at the mall.'); } } },
  street_food: { title: 'Street food', cost: '₵10', fn: () => { if (spend(10)) { change('hunger', 35); change('happy', 8); log('Quick bite.'); } }, },
  side_hustle: { title: 'Quick hustle', cost: 'Earn ₵12-30', fn: () => { const e = 12 + Math.floor(Math.random() * 19); change('money', e); change('energy', -14); log(`Quick ₵${e}.`); } },
  observe: { title: 'Observe', cost: 'Insight', fn: () => { change('happy', 12); log('Watched the city move.'); } }
};

// ===================== FIRESTORE CLOUD SYNC =====================
function getFriendVal(id: FriendNPC['id'], field: 'affinity' | 'money', fallback: number): number {
  const f = state?.friends.find(x => x.id === id);
  if (!f) return fallback;
  return field === 'affinity' ? clampStat(f.affinity) : clampMoney(f.money);
}

function buildSanitizedSavePayload(uid: string) {
  if (!state) state = createDefaultState(account.displayName);
  const safeOwnerId = sanitizeId(uid, OWNER_ID_MAX_LEN);
  const safePlayerId = sanitizeId(account.playerId || `accra_${safeOwnerId.slice(0, 12)}`, PLAYER_ID_MAX_LEN);
  const safeName = sanitizeString(state.name, NAME_MAX_LEN, 'Accra Resident');
  const safeCareer = sanitizeCareer(state.career);
  const safeLocation = sanitizeLocation(state.location);
  const rawLogs = Array.isArray(state.log) && state.log.length > 0 ? state.log : [`Day ${state.day}: Life in Accra.`];
  const safeLogs = rawLogs
    .slice(0, LOG_MAX_ITEMS)
    .map(entry => sanitizeString(String(entry), LOG_ITEM_MAX_LEN, 'Activity in Accra.'));

  return {
    ownerId: safeOwnerId,
    playerId: safePlayerId,
    name: safeName,
    career: safeCareer,
    location: safeLocation,
    day: clampDay(state.day),
    time: clampTime(state.time),
    money: clampMoney(state.money),
    hunger: clampStat(state.hunger),
    energy: clampStat(state.energy),
    happy: clampStat(state.happy),
    social: clampStat(state.social),
    health: clampStat(state.health),
    amaAffinity: getFriendVal('ama', 'affinity', 42),
    kofiAffinity: getFriendVal('kofi', 'affinity', 38),
    abenaAffinity: getFriendVal('abena', 'affinity', 55),
    kwameAffinity: getFriendVal('kwame', 'affinity', 33),
    efuaAffinity: getFriendVal('efua', 'affinity', 48),
    amaMoney: getFriendVal('ama', 'money', 240),
    kofiMoney: getFriendVal('kofi', 'money', 160),
    abenaMoney: getFriendVal('abena', 'money', 340),
    kwameMoney: getFriendVal('kwame', 'money', 95),
    efuaMoney: getFriendVal('efua', 'money', 190),
    recentLogs: safeLogs
  };
}

function buildSanitizedPublicProfilePayload(uid: string) {
  if (!state) state = createDefaultState(account.displayName);
  const safeOwnerId = sanitizeId(uid, OWNER_ID_MAX_LEN);
  const safePlayerId = sanitizeId(account.playerId || `accra_${safeOwnerId.slice(0, 12)}`, PLAYER_ID_MAX_LEN);
  const safeDisplayName = sanitizeString(state.name, NAME_MAX_LEN, 'Accra Resident');
  const safeHouseName = sanitizeString(`${safeDisplayName}'s Flat (Osu)`, HOUSE_NAME_MAX_LEN, 'Osu Flat');
  const safeCareer = sanitizeCareer(state.career);
  const locName = LOCATIONS[sanitizeLocation(state.location)]?.name || 'Accra';
  const safeStatus = sanitizeString(`At ${locName}`, STATUS_MAX_LEN, 'In Accra');

  return {
    ownerId: safeOwnerId,
    playerId: safePlayerId,
    displayName: safeDisplayName,
    houseName: safeHouseName,
    career: safeCareer,
    day: clampDay(state.day),
    status: safeStatus
  };
}

function applyFirestoreDocToState(data: Record<string, unknown>) {
  const base = createDefaultState(typeof data.name === 'string' ? data.name : account.displayName);
  base.name = sanitizeString(String(data.name || base.name), NAME_MAX_LEN, 'Accra Resident');
  base.career = sanitizeCareer(String(data.career || 'unemployed'));
  base.location = sanitizeLocation(String(data.location || 'home'));
  base.day = clampDay(Number(data.day ?? 1));
  base.time = clampTime(Number(data.time ?? 0));
  base.money = clampMoney(Number(data.money ?? 180));
  base.hunger = clampStat(Number(data.hunger ?? 75));
  base.energy = clampStat(Number(data.energy ?? 85));
  base.happy = clampStat(Number(data.happy ?? 65));
  base.social = clampStat(Number(data.social ?? 45));
  base.health = clampStat(Number(data.health ?? 90));

  const friendMap: Record<FriendNPC['id'], { aff: number; mon: number }> = {
    ama: { aff: clampStat(Number(data.amaAffinity ?? 42)), mon: clampMoney(Number(data.amaMoney ?? 240)) },
    kofi: { aff: clampStat(Number(data.kofiAffinity ?? 38)), mon: clampMoney(Number(data.kofiMoney ?? 160)) },
    abena: { aff: clampStat(Number(data.abenaAffinity ?? 55)), mon: clampMoney(Number(data.abenaMoney ?? 340)) },
    kwame: { aff: clampStat(Number(data.kwameAffinity ?? 33)), mon: clampMoney(Number(data.kwameMoney ?? 95)) },
    efua: { aff: clampStat(Number(data.efuaAffinity ?? 48)), mon: clampMoney(Number(data.efuaMoney ?? 190)) }
  };

  base.friends.forEach(f => {
    if (friendMap[f.id]) {
      f.affinity = friendMap[f.id].aff;
      f.money = friendMap[f.id].mon;
    }
  });

  if (Array.isArray(data.recentLogs) && data.recentLogs.length > 0) {
    base.log = data.recentLogs.map(x => String(x)).slice(0, LOG_MAX_ITEMS);
  }
  state = base;
}

async function syncCloudSave(user: User, showNotification = true): Promise<void> {
  if (!ID_REGEX.test(user.uid)) return;
  const userPath = `users/${user.uid}`;
  const profilePath = `publicProfiles/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const profileRef = doc(db, 'publicProfiles', user.uid);

  const saveBase = buildSanitizedSavePayload(user.uid);
  const profileBase = buildSanitizedPublicProfilePayload(user.uid);

  // Save private user game state
  let existingSaveSnap;
  try {
    existingSaveSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (existingSaveSnap && existingSaveSnap.exists()) {
    try {
      const { ownerId: _o, playerId: _p, ...mutableSaveFields } = saveBase;
      await updateDoc(userRef, {
        ...mutableSaveFields,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  } else {
    try {
      await setDoc(userRef, {
        ...saveBase,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
  }

  // Save public resident profile
  let existingProfileSnap;
  try {
    existingProfileSnap = await getDoc(profileRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, profilePath);
  }

  if (existingProfileSnap && existingProfileSnap.exists()) {
    try {
      const { ownerId: _o, playerId: _p, ...mutableProfileFields } = profileBase;
      await updateDoc(profileRef, {
        ...mutableProfileFields,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, profilePath);
    }
  } else {
    try {
      await setDoc(profileRef, {
        ...profileBase,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, profilePath);
    }
  }

  if (showNotification) {
    toast('Saved to Cloud & Locally');
  }
}

async function loadOrInitializeCloudUser(user: User): Promise<void> {
  const safeDisplayName = sanitizeString(user.displayName || 'Accra Resident', NAME_MAX_LEN, 'Accra Resident');
  const safePlayerId = sanitizeId(`accra_${user.uid.slice(0, 12)}`, PLAYER_ID_MAX_LEN);

  account = {
    playerId: safePlayerId,
    uid: user.uid,
    displayName: safeDisplayName,
    isGuest: false,
    createdAt: user.metadata.creationTime || new Date().toISOString()
  };

  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (snap && snap.exists()) {
    const data = snap.data();
    if (typeof data.playerId === 'string') {
      account.playerId = sanitizeId(data.playerId, PLAYER_ID_MAX_LEN);
    }
    applyFirestoreDocToState(data);
    localStorage.setItem('lifeInAccra_account', JSON.stringify(account));
    localStorage.setItem('lifeInAccra_state', JSON.stringify(state));
    enterGame();
    toast(`Welcome back, ${state?.name}! Cloud save loaded.`);
  } else {
    if (!state) {
      state = createDefaultState(safeDisplayName);
    } else {
      state.name = safeDisplayName;
    }
    localStorage.setItem('lifeInAccra_account', JSON.stringify(account));
    localStorage.setItem('lifeInAccra_state', JSON.stringify(state));
    await syncCloudSave(user, false);
    enterGame();
    toast(`Signed in as ${safeDisplayName}. Cloud save initialized!`);
  }
}

// ===================== AUTH & MULTIPLAYER ACTIONS =====================
async function signInWithGoogle(): Promise<void> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      closeCreate();
      closeLogin();
      closeAccount();
      await loadOrInitializeCloudUser(result.user);
    }
  } catch (err) {
    console.error('Google Sign-In error:', err);
    toast('Google Sign-In cancelled or failed');
  }
}

async function signOutAccount(): Promise<void> {
  try {
    if (auth.currentUser) {
      await fbSignOut(auth);
    }
  } catch (err) {
    console.error('Sign out error:', err);
  }
  localStorage.removeItem('lifeInAccra_account');
  closeAccount();
  document.getElementById('gameApp')?.classList.add('hidden');
  document.getElementById('authScreen')?.classList.remove('hidden');
  toast('Signed out');
}

function showVisitPlayerModal(): void {
  if (!auth.currentUser) {
    toast('Sign in with Google to visit other online residents');
    return;
  }
  const modal = document.getElementById('visitPlayerModal');
  const input = document.getElementById('visitPlayerUidInput') as HTMLInputElement | null;
  const resultBox = document.getElementById('visitPlayerResult');
  if (resultBox) resultBox.innerHTML = '';
  if (input) input.value = '';
  modal?.classList.add('show');
  input?.focus();
}

function closeVisitPlayerModal(): void {
  document.getElementById('visitPlayerModal')?.classList.remove('show');
}

async function lookupResidentByUid(): Promise<void> {
  if (!auth.currentUser) {
    toast('Sign in with Google first');
    return;
  }
  const input = document.getElementById('visitPlayerUidInput') as HTMLInputElement | null;
  const resultBox = document.getElementById('visitPlayerResult');
  const rawUid = (input?.value || '').trim();
  if (!rawUid || !ID_REGEX.test(rawUid) || rawUid.length > OWNER_ID_MAX_LEN) {
    toast('Enter a valid Resident UID');
    return;
  }

  const profilePath = `publicProfiles/${rawUid}`;
  let snap;
  try {
    snap = await getDoc(doc(db, 'publicProfiles', rawUid));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, profilePath);
  }

  if (!snap || !snap.exists()) {
    if (resultBox) {
      resultBox.innerHTML = `<div style="color:var(--danger);font-size:.9rem">No resident found with UID: ${rawUid}</div>`;
    }
    return;
  }

  const data = snap.data();
  const careerName = CAREERS[sanitizeCareer(String(data.career))]?.name || 'Resident';
  if (resultBox) {
    resultBox.innerHTML = `
      <div style="background:var(--surface2);padding:12px;border-radius:10px;margin-top:8px">
        <div style="font-weight:600;font-size:1rem">🏡 ${ String(data.houseName || 'Accra Flat') }</div>
        <div style="font-size:.88rem;color:var(--muted);margin-top:4px">
          Resident: <strong>${ String(data.displayName || 'Resident') }</strong> • ${careerName} (Day ${Number(data.day || 1)})<br>
          Status: ${ String(data.status || 'In Accra') }
        </div>
      </div>
    `;
  }
  if (state) {
    change('social', 10);
    change('happy', 8);
    log(`Visited ${String(data.displayName || 'a resident')}'s flat in Accra!`);
    render();
    toast(`Visited ${String(data.displayName || 'resident')}!`);
  }
}

function continueAsGuest(): void {
  account = {
    playerId: generatePlayerId(),
    uid: null,
    displayName: 'Guest',
    isGuest: true,
    createdAt: new Date().toISOString()
  };
  const saved = localStorage.getItem('lifeInAccra_state');
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch {
      state = createDefaultState('Guest');
    }
  } else {
    state = createDefaultState('Guest');
  }
  enterGame();
}

function showCreateAccount(): void {
  document.getElementById('createModal')?.classList.add('show');
  (document.getElementById('createName') as HTMLInputElement | null)?.focus();
}

function closeCreate(): void {
  document.getElementById('createModal')?.classList.remove('show');
}

function createAccount(): void {
  const input = document.getElementById('createName') as HTMLInputElement | null;
  const name = (input?.value || '').trim();
  if (!name || name.length < 2) {
    toast('Enter a name (at least 2 characters)');
    return;
  }
  const safeName = sanitizeString(name, NAME_MAX_LEN, 'Resident');
  account = {
    playerId: generatePlayerId(),
    uid: auth.currentUser?.uid || null,
    displayName: safeName,
    isGuest: !auth.currentUser,
    createdAt: new Date().toISOString()
  };
  state = createDefaultState(safeName);
  localStorage.setItem('lifeInAccra_account', JSON.stringify(account));
  saveGame();
  closeCreate();
  enterGame();
  toast(`Account created. Your ID: ${account.playerId?.slice(0, 12)}...`);
}

function showLogin(): void {
  document.getElementById('loginModal')?.classList.add('show');
}

function closeLogin(): void {
  document.getElementById('loginModal')?.classList.remove('show');
}

function importSave(): void {
  const input = document.getElementById('importCode') as HTMLTextAreaElement | null;
  const code = (input?.value || '').trim();
  if (!code) {
    toast('Paste a save code');
    return;
  }
  try {
    const data = JSON.parse(atob(code));
    if (data.account && data.state) {
      account = data.account;
      state = data.state;
      localStorage.setItem('lifeInAccra_account', JSON.stringify(account));
      localStorage.setItem('lifeInAccra_state', JSON.stringify(state));
      closeLogin();
      enterGame();
      toast('Save loaded');
    } else {
      throw new Error('Invalid');
    }
  } catch {
    toast('Invalid save code');
  }
}

function enterGame(): void {
  document.getElementById('authScreen')?.classList.add('hidden');
  document.getElementById('gameApp')?.classList.remove('hidden');
  updateFriendStatuses();
  render();
}

function logout(): void {
  const infoEl = document.getElementById('accountInfo');
  const cloudBadge = auth.currentUser
    ? `<span style="color:var(--green);font-size:.8rem">● Cloud Connected (${auth.currentUser.email || 'Google'})</span>`
    : `<span style="color:var(--muted);font-size:.8rem">○ Local Save Only (Sign in with Google for Cloud Sync)</span>`;

  if (infoEl) {
    infoEl.innerHTML = `
      <strong>${account.displayName || 'Resident'}</strong> ${account.isGuest ? '(Guest)' : ''}<br>
      ${cloudBadge}<br>
      Player ID: <code style="font-size:.8rem">${account.playerId || '—'}</code><br>
      ${auth.currentUser ? `Resident UID: <code style="font-size:.78rem">${auth.currentUser.uid}</code><br>` : ''}
      <span style="font-size:.8rem;color:var(--muted)">Created: ${account.createdAt ? new Date(account.createdAt).toLocaleDateString() : '—'}</span>`;
  }
  document.getElementById('accountModal')?.classList.add('show');
}

function closeAccount(): void {
  document.getElementById('accountModal')?.classList.remove('show');
}

function exportSave(): void {
  const payload = { account, state, exportedAt: new Date().toISOString() };
  const code = btoa(JSON.stringify(payload));
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      toast('Save code copied to clipboard');
    }).catch(() => {
      toast('Copied code to console');
      console.log(code);
    });
  } else {
    toast('Copied code to console');
    console.log(code);
  }
}

// ===================== HELPERS =====================
function change(stat: 'money' | 'hunger' | 'energy' | 'happy' | 'social' | 'health', amt: number): void {
  if (!state) return;
  if (stat === 'money') {
    state.money = clampMoney(state.money + amt);
  } else {
    state[stat] = clampStat(state[stat] + amt);
  }
}

function spend(amt: number): boolean {
  if (!state) return false;
  if (state.money < amt) {
    toast('Not enough ₵');
    return false;
  }
  state.money = clampMoney(state.money - amt);
  return true;
}

function log(msg: string): void {
  if (!state) return;
  const entry = sanitizeString(`Day ${state.day}: ${msg}`, LOG_ITEM_MAX_LEN, `Day ${state.day}: Activity`);
  state.log.unshift(entry);
  if (state.log.length > 50) state.log.pop();
}

function toast(msg: string): void {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function milestoneText(aff: number): string {
  if (aff >= 90) return 'Closest friend';
  if (aff >= 70) return 'Trusted friend';
  if (aff >= 55) return 'Good friend';
  if (aff >= 40) return 'Friend';
  if (aff >= 25) return 'Acquaintance';
  return 'New connection';
}

function updateFriendStatuses(): void {
  if (!state) return;
  state.friends.forEach(f => {
    f.status = f.routine[state!.time] || 'at home';
    if (Math.random() < 0.3) {
      f.mood = pick(['content', 'happy', 'focused', 'cheerful', 'tired', 'stressed', 'relaxed']);
    }
    f.money = clampMoney(f.money + 6 + Math.floor(Math.random() * 16));
  });
}

function advanceTime(hrs = 2): void {
  if (!state) return;
  state.time += Math.ceil(hrs / 3.5);
  while (state.time >= 4) {
    state.time -= 4;
    state.day = clampDay(state.day + 1);
    change('hunger', -18);
    change('energy', -8);
    change('social', -4);
    change('happy', -3);
    const pay = CAREERS[state.career]?.pay || 0;
    if (pay > 0) {
      change('money', pay);
      log(`Career pay +₵${pay}`);
    }
    updateFriendStatuses();
    log(`— Day ${state.day} —`);
    if (Math.random() < 0.38) generateInvite();
  }
  if (Math.random() < 0.2) randomSocialEvent();
  checkCritical();
  render();
}

function generateInvite(): void {
  if (!state) return;
  const available = state.friends.filter(f => f.affinity >= 28 && !['sleeping', 'at work', 'at school'].includes(f.status));
  if (!available.length) return;
  const f = pick(available);
  state.pendingInvite = f.id;
  const inviteTextEl = document.getElementById('inviteText');
  if (inviteTextEl) {
    inviteTextEl.textContent = pick([
      `${f.name} is inviting you over.`,
      `${f.name}: "You free? Come pass by."`,
      `${f.name} wants to hang out.`,
      `Message from ${f.name}: "I dey house, make you come."`
    ]);
  }
  document.getElementById('inviteBanner')?.classList.add('show');
  const acceptBtn = document.getElementById('acceptInviteBtn');
  if (acceptBtn) {
    acceptBtn.onclick = () => acceptInvite();
  }
}

function acceptInvite(): void {
  if (!state || !state.pendingInvite) return;
  visitFriend(state.pendingInvite);
  state.pendingInvite = null;
  document.getElementById('inviteBanner')?.classList.remove('show');
}

function dismissInvite(): void {
  if (!state) return;
  state.pendingInvite = null;
  document.getElementById('inviteBanner')?.classList.remove('show');
  toast('Invite dismissed');
}

function randomSocialEvent(): void {
  if (!state) return;
  const f = pick(state.friends);
  if (f.affinity >= 50 && Math.random() > 0.45 && f.money > 45) {
    const amt = 15 + Math.floor(Math.random() * 35);
    f.money = clampMoney(f.money - amt);
    change('money', amt);
    f.affinity = clampStat(f.affinity + 3);
    log(`${f.name} sent you ₵${amt}. ${pick(DIALOGUE[f.id].gift)}`);
    toast(`${f.name} sent you ₵${amt}`);
  } else if (f.affinity >= 30) {
    log(`${f.name} checked on you.`);
  }
}

function checkCritical(): void {
  if (!state) return;
  if (state.hunger <= 5) {
    change('health', -8);
    toast("You're starving");
  }
  if (state.energy <= 5) toast('Exhausted — sleep');
  if (state.health <= 15) toast('Health is low');
}

// ===================== RENDER & ACTIONS =====================
function render(): void {
  if (!state) return;
  const charNameEl = document.getElementById('charName');
  const charJobEl = document.getElementById('charJob');
  const playerIdEl = document.getElementById('playerIdDisplay');

  if (charNameEl) charNameEl.textContent = state.name;
  if (charJobEl) charJobEl.textContent = CAREERS[state.career]?.name || 'Unemployed';
  if (playerIdEl) {
    const syncStatus = auth.currentUser ? '☁️ Cloud' : '💾 Local';
    playerIdEl.textContent = `${syncStatus} • ID: ${account.playerId ? account.playerId.slice(0, 16) : '—'}`;
  }

  const stats = [
    { key: 'money', label: 'Wallet', val: `₵${state.money}`, num: state.money, cls: 'money' },
    { key: 'hunger', label: 'Hunger', val: state.hunger, num: state.hunger, cls: 'hunger' },
    { key: 'energy', label: 'Energy', val: state.energy, num: state.energy, cls: 'energy' },
    { key: 'happy', label: 'Happy', val: state.happy, num: state.happy, cls: 'happy' },
    { key: 'social', label: 'Social', val: state.social, num: state.social, cls: 'social' },
    { key: 'health', label: 'Health', val: state.health, num: state.health, cls: 'health' }
  ];

  const statsEl = document.getElementById('stats');
  if (statsEl) {
    statsEl.innerHTML = stats.map(s => {
      const low = s.key !== 'money' && s.num < 20 ? ' low' : '';
      const bar = s.key === 'money' ? '' : `<div class="stat-bar"><div class="stat-bar-fill" style="width:${s.num}%"></div></div>`;
      return `<div class="stat ${s.cls}${low}"><div class="stat-label">${s.label}</div><div class="stat-value">${s.val}</div>${bar}</div>`;
    }).join('');
  }

  const dayInfoEl = document.getElementById('dayInfo');
  if (dayInfoEl) dayInfoEl.textContent = `Day ${state.day} • ${TIME[state.time]}`;

  const npcPanel = document.getElementById('npcPanel');
  const locationCard = document.getElementById('locationCard');
  const actionsEl = document.getElementById('actions');

  if (state.visiting) {
    const f = state.friends.find(x => x.id === state!.visiting);
    if (f) {
      if (locationCard) {
        locationCard.innerHTML = `<div class="location-emoji">${f.emoji}</div><div class="location-name">${f.house}</div><div class="location-desc">${f.bio}</div>`;
      }
      if (actionsEl) actionsEl.innerHTML = '';
      if (npcPanel) npcPanel.style.display = 'block';
      const npcTitle = document.getElementById('npcTitle');
      const npcInfo = document.getElementById('npcInfo');
      const npcMood = document.getElementById('npcMood');
      const npcMilestone = document.getElementById('npcMilestone');
      const npcActions = document.getElementById('npcActions');

      if (npcTitle) npcTitle.textContent = `With ${f.name}`;
      if (npcInfo) npcInfo.innerHTML = `Wallet: ₵${f.money} • Friendship: ${f.affinity}/100 • ${f.status}`;
      if (npcMood) npcMood.textContent = `Mood: ${f.mood}`;
      if (npcMilestone) npcMilestone.textContent = milestoneText(f.affinity);

      let acts = `<button class="small primary" onclick="openSend('${f.id}')">Send Money</button>
        <button class="small" onclick="chatFriend('${f.id}')">Chat</button>
        <button class="small" onclick="hangOut('${f.id}')">Hang out</button>`;
      if (f.affinity >= 40) acts += ` <button class="small" onclick="eatTogether('${f.id}')">Eat together</button>`;
      if (f.affinity >= 55) acts += ` <button class="small" onclick="deepTalk('${f.id}')">Deep talk</button>`;
      if (f.affinity >= 70) acts += ` <button class="small" onclick="askFavor('${f.id}')">Ask favor</button>`;
      acts += ` <button class="small" onclick="leaveFriend()">Leave</button>`;
      if (npcActions) npcActions.innerHTML = acts;
    }
  } else {
    const loc = LOCATIONS[state.location] || LOCATIONS.home;
    if (locationCard) {
      locationCard.innerHTML = `<div class="location-emoji">${loc.emoji}</div><div class="location-name">${loc.name}</div><div class="location-desc">${loc.desc}</div>`;
    }
    if (actionsEl) {
      actionsEl.innerHTML = loc.actions.map(k => {
        const a = ACTIONS[k];
        return `<button class="action-btn" onclick="doAction('${k}')"><span class="title">${a.title}</span><span class="cost">${a.cost}</span></button>`;
      }).join('');
    }
    if (npcPanel) npcPanel.style.display = 'none';
  }

  const c = CAREERS[state.career] || CAREERS.unemployed;
  const careerInfo = document.getElementById('careerInfo');
  const careerActions = document.getElementById('careerActions');
  if (careerInfo) careerInfo.textContent = `${c.name} — ${c.desc}${c.pay ? ` (+₵${c.pay}/day)` : ''}`;
  if (careerActions) {
    careerActions.innerHTML = `<button class="small" onclick="showCareerModal()">Switch</button>${state.career !== 'unemployed' ? ` <button class="small" onclick="workShift()">Work shift</button>` : ''}`;
  }

  const locationsList = document.getElementById('locationsList');
  if (locationsList) {
    locationsList.innerHTML = Object.entries(LOCATIONS).map(([k, l]) =>
      `<button class="loc-btn ${!state!.visiting && k === state!.location ? 'active' : ''}" onclick="travel('${k}')"><span>${l.emoji}</span><span>${l.name}</span></button>`
    ).join('');
  }

  const friendsList = document.getElementById('friendsList');
  if (friendsList) {
    friendsList.innerHTML = state.friends.map(f =>
      `<button class="friend-btn ${state!.visiting === f.id ? 'active' : ''}" onclick="visitFriend('${f.id}')">
        <span>${f.emoji}</span><span>${f.name}</span>
        <span class="meta">${f.status}<br>₵${f.money} • ${f.affinity}</span>
      </button>`
    ).join('');
  }

  const logEl = document.getElementById('log');
  if (logEl) {
    logEl.innerHTML = state.log.slice(0, 9).map(e => `<div class="log-entry">${e}</div>`).join('') || "<div class='log-entry'>Your life begins...</div>";
  }
}

function doAction(key: string): void {
  if (!state) return;
  if (state.energy < 8 && key !== 'sleep') { toast('Too tired'); return; }
  if (state.time === 3 && key !== 'sleep') { toast("It's night. Go sleep."); return; }
  ACTIONS[key]?.fn();
  if (key !== 'sleep') advanceTime(2); else render();
}

function travel(key: LocationKey): void {
  if (!state) return;
  if (state.visiting) state.visiting = null;
  if (key === state.location && !state.visiting) return;
  if (state.energy < 10) { toast('Too tired'); return; }
  if (state.time === 3) { toast('Night. Stay home.'); return; }
  state.location = sanitizeLocation(key);
  state.visiting = null;
  change('energy', -8);
  change('money', -3);
  log(`Went to ${LOCATIONS[state.location].name}`);
  advanceTime(1);
}

function visitFriend(id: string): void {
  if (!state) return;
  const f = state.friends.find(x => x.id === id);
  if (!f) return;
  if (f.status === 'sleeping') { toast(`${f.name} is sleeping`); return; }
  if (state.energy < 10) { toast('Too tired'); return; }
  if (state.time === 3) { toast('Too late'); return; }
  state.visiting = id;
  f.lastInteract = state.day;
  f.timesVisited = (f.timesVisited || 0) + 1;
  change('energy', -10);
  change('money', -5);
  change('social', 8);
  log(`Visited ${f.name}`);
  advanceTime(1);
}

function leaveFriend(): void {
  if (!state) return;
  state.visiting = null;
  log('You left.');
  render();
}

function chatFriend(id: string): void {
  if (!state) return;
  const f = state.friends.find(x => x.id === id);
  if (!f) return;
  const line = pick(DIALOGUE[f.id].chat);
  f.affinity = clampStat(f.affinity + 5);
  f.lastInteract = state.day;
  change('social', 14);
  change('happy', 10);
  change('energy', -5);
  log(`${f.name}: "${line}"`);
  advanceTime(1);
}

function hangOut(id: string): void {
  if (!state) return;
  const f = state.friends.find(x => x.id === id);
  if (!f) return;
  if (state.energy < 15) { toast('Too tired'); return; }
  f.affinity = clampStat(f.affinity + 10);
  f.lastInteract = state.day;
  change('social', 24);
  change('happy', 18);
  change('energy', -15);
  log(`Hung out with ${f.name}. ${pick(DIALOGUE[f.id].hang)}`);
  advanceTime(2);
}

function eatTogether(id: string): void {
  if (!state) return;
  const f = state.friends.find(x => x.id === id);
  if (!f) return;
  if (state.money < 20) { toast('Not enough'); return; }
  change('money', -20);
  f.money = clampMoney(f.money - 10);
  f.affinity = clampStat(f.affinity + 8);
  f.lastInteract = state.day;
  change('hunger', 40);
  change('social', 18);
  change('happy', 16);
  log(`Ate together with ${f.name}`);
  advanceTime(2);
}

function deepTalk(id: string): void {
  if (!state) return;
  const f = state.friends.find(x => x.id === id);
  if (!f) return;
  f.affinity = clampStat(f.affinity + 12);
  f.lastInteract = state.day;
  change('social', 20);
  change('happy', 22);
  change('energy', -8);
  log(`Deep talk with ${f.name}`);
  if (f.affinity >= 70) toast(`You and ${f.name} are trusted friends`);
  advanceTime(2);
}

function askFavor(id: string): void {
  if (!state) return;
  const f = state.friends.find(x => x.id === id);
  if (!f) return;
  if (f.affinity < 70) { toast('Not close enough'); return; }
  f.lastInteract = state.day;
  if (Math.random() > 0.28) {
    const amt = 25 + Math.floor(Math.random() * 45);
    if (f.money >= amt) {
      f.money = clampMoney(f.money - amt);
      change('money', amt);
      f.affinity = clampStat(f.affinity + 3);
      log(`${f.name} helped with ₵${amt}`);
      toast(`${f.name} came through`);
    } else {
      log(`${f.name} wanted to help but is tight.`);
    }
  } else {
    f.affinity = clampStat(f.affinity - 3);
    log(`${f.name} couldn't help this time.`);
  }
  advanceTime(1);
}

function openSend(id: string): void {
  if (!state) return;
  sendTarget = id;
  const f = state.friends.find(x => x.id === id);
  if (!f) return;
  const sendToText = document.getElementById('sendToText');
  const sendAmount = document.getElementById('sendAmount') as HTMLInputElement | null;
  if (sendToText) sendToText.textContent = `Send to ${f.name} (₵${f.money})`;
  if (sendAmount) sendAmount.value = '';
  document.getElementById('sendModal')?.classList.add('show');
}

function closeSendModal(): void {
  document.getElementById('sendModal')?.classList.remove('show');
  sendTarget = null;
}

function confirmSend(): void {
  if (!state || !sendTarget) return;
  const sendAmount = document.getElementById('sendAmount') as HTMLInputElement | null;
  const amt = Math.floor(Number(sendAmount?.value || 0));
  if (!amt || amt < 1) { toast('Enter amount'); return; }
  if (amt > state.money) { toast('Not enough'); return; }
  const f = state.friends.find(x => x.id === sendTarget);
  if (!f) return;
  state.money = clampMoney(state.money - amt);
  f.money = clampMoney(f.money + amt);
  f.affinity = clampStat(f.affinity + Math.min(18, Math.floor(amt / 8)));
  f.lastInteract = state.day;
  change('social', 8);
  change('happy', 6);
  log(`Sent ₵${amt} to ${f.name}`);
  closeSendModal();
  render();
  toast(`Sent ₵${amt}`);
}

function workShift(): void {
  if (!state) return;
  if (state.energy < 25) { toast('Too tired'); return; }
  const pay = Math.round((CAREERS[state.career].pay || 20) * 1.4);
  change('money', pay);
  change('energy', -30);
  log(`Worked a shift. +₵${pay}`);
  advanceTime(4);
}

function showCareerModal(): void {
  if (!state) return;
  const optionsEl = document.getElementById('careerOptions');
  if (optionsEl) {
    optionsEl.innerHTML = Object.entries(CAREERS).map(([k, c]) => {
      const locked = Boolean(c.reqMoney && state!.money < c.reqMoney);
      return `<button style="text-align:left;padding:12px" ${locked ? 'disabled' : ''} onclick="setCareer('${k}')"><strong>${c.name}</strong>${c.pay ? ` • ₵${c.pay}/day` : ''}<br><span style="font-size:.8rem;color:var(--muted)">${c.desc}${locked ? ` (Need ₵${c.reqMoney})` : ''}</span></button>`;
    }).join('');
  }
  document.getElementById('careerModal')?.classList.add('show');
}

function closeCareerModal(): void {
  document.getElementById('careerModal')?.classList.remove('show');
}

function setCareer(key: CareerKey): void {
  if (!state) return;
  const c = CAREERS[key];
  if (!c) return;
  if (c.reqMoney && state.money < c.reqMoney) { toast('Not enough'); return; }
  if (c.reqMoney) change('money', -c.reqMoney);
  state.career = sanitizeCareer(key);
  log(`Started as ${c.name}`);
  closeCareerModal();
  render();
}

function showSummary(): void {
  if (!state) return;
  const c = CAREERS[state.career];
  const top = state.friends.slice().sort((a, b) => b.affinity - a.affinity).map(f => `${f.name} (${f.affinity} — ${milestoneText(f.affinity)})`).join('<br>');
  const summaryBody = document.getElementById('summaryBody');
  if (summaryBody) {
    summaryBody.innerHTML = `<strong>${state.name}</strong><br>Day ${state.day} • ${c.name}<br><br>Wallet: ₵${state.money}<br>Hunger ${state.hunger} • Energy ${state.energy}<br>Happy ${state.happy} • Social ${state.social} • Health ${state.health}<br><br><strong>Friendships</strong><br>${top}`;
  }
  document.getElementById('summaryModal')?.classList.add('show');
}

function closeSummary(): void {
  document.getElementById('summaryModal')?.classList.remove('show');
}

function promptNewGame(): void {
  state = createDefaultState(account.displayName || 'Resident');
  closeAccount();
  render();
  toast('New life started');
}

async function saveGame(): Promise<void> {
  localStorage.setItem('lifeInAccra_account', JSON.stringify(account));
  localStorage.setItem('lifeInAccra_state', JSON.stringify(state));
  if (auth.currentUser) {
    await syncCloudSave(auth.currentUser, true);
  } else {
    toast('Saved locally');
  }
}

// Expose handlers to window for HTML onclick attributes
Object.assign(window, {
  signInWithGoogle,
  signOutAccount,
  showVisitPlayerModal,
  closeVisitPlayerModal,
  lookupResidentByUid,
  continueAsGuest,
  showCreateAccount,
  closeCreate,
  createAccount,
  showLogin,
  closeLogin,
  importSave,
  logout,
  closeAccount,
  exportSave,
  doAction,
  travel,
  visitFriend,
  leaveFriend,
  chatFriend,
  hangOut,
  eatTogether,
  deepTalk,
  askFavor,
  openSend,
  closeSendModal,
  confirmSend,
  workShift,
  showCareerModal,
  closeCareerModal,
  setCareer,
  showSummary,
  closeSummary,
  promptNewGame,
  saveGame,
  acceptInvite,
  dismissInvite
});

// ===================== INIT & AUTH LISTENER =====================
const savedAccount = localStorage.getItem('lifeInAccra_account');
if (savedAccount) {
  try {
    account = JSON.parse(savedAccount);
    const savedState = localStorage.getItem('lifeInAccra_state');
    if (savedState) state = JSON.parse(savedState);
    else state = createDefaultState(account.displayName);
    enterGame();
  } catch {
    // Fallback to auth screen
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadOrInitializeCloudUser(user);
  }
});
