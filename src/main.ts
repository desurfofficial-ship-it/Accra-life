import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  limit,
  onSnapshot,
  Unsubscribe,
  Timestamp
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType
} from './firebase';

Object.assign(window, {
  continueAsGuest,
  showEmailAuth,
  closeEmailModal,
  submitEmailAuth,
  signInWithGoogle,
  showImport,
  closeImport,
  importSave,
  showAccount,
  closeAccount,
  exportSave,
  signOutUser,
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
  dismissInvite,
  addRealFriend,
  visitRealFriend,
  closeRealVisit,
  sendMoneyToReal,
  openFriendChat,
  closeFriendChat,
  sendFriendMessage,
  chatFromVisitModal
});

// ===================== GAME DATA =====================
const LOCATIONS: Record<string, { name: string; emoji: string; desc: string; actions: string[] }> = {
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

const CAREERS: Record<string, { name: string; pay: number; desc: string; reqMoney: number }> = {
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

interface FriendNPC {
  id: string;
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

interface RealFriend {
  uid: string;
  displayName: string;
  addedAt?: unknown;
  day?: number;
  career?: string;
  money?: number;
  location?: string;
  online?: boolean;
  lastActiveMs?: number;
}

interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  text: string;
  read: boolean;
  createdAtMs: number;
}

const DEFAULT_FRIENDS: FriendNPC[] = [
  { id: 'ama', name: 'Ama', house: "Ama's Place (Adenta)", emoji: '🏡', money: 240, affinity: 42, mood: 'content', bio: 'Works in banking. Steady and caring.', status: 'at home', lastInteract: 0, timesVisited: 0, routine: { 0: 'at home', 1: 'at work', 2: 'at home', 3: 'sleeping' } },
  { id: 'kofi', name: 'Kofi', house: "Kofi's Spot (Tema)", emoji: '🏠', money: 160, affinity: 38, mood: 'focused', bio: 'Mechanic and side hustler. Very loyal.', status: 'at work', lastInteract: 0, timesVisited: 0, routine: { 0: 'at work', 1: 'at work', 2: 'at home', 3: 'sleeping' } },
  { id: 'abena', name: 'Abena', house: "Abena's Flat (East Legon)", emoji: '🏢', money: 340, affinity: 55, mood: 'happy', bio: 'Runs a boutique. Generous when she can.', status: 'at home', lastInteract: 0, timesVisited: 0, routine: { 0: 'at home', 1: 'at shop', 2: 'out', 3: 'at home' } },
  { id: 'kwame', name: 'Kwame', house: "Kwame's Room (Madina)", emoji: '👨🏻', money: 95, affinity: 33, mood: 'tired', bio: 'Student and part-time rider.', status: 'at school', lastInteract: 0, timesVisited: 0, routine: { 0: 'at school', 1: 'riding', 2: 'at home', 3: 'sleeping' } },
  { id: 'efua', name: 'Efua', house: "Efua's Home (Dansoman)", emoji: '👩🏻', money: 190, affinity: 48, mood: 'cheerful', bio: 'Teacher by day, highlife lover by night.', status: 'at home', lastInteract: 0, timesVisited: 0, routine: { 0: 'at school', 1: 'at school', 2: 'at home', 3: 'out' } }
];

interface GameState {
  name: string;
  day: number;
  time: number;
  location: string;
  career: string;
  money: number;
  hunger: number;
  energy: number;
  happy: number;
  social: number;
  health: number;
  visiting: string | null;
  pendingInvite: string | null;
  visitingReal?: string | null;
  friends: FriendNPC[];
  realFriends?: RealFriend[];
  log: string[];
  version: number;
}

interface AccountInfo {
  playerId: string | null;
  displayName: string | null;
  isGuest: boolean;
  uid: string | null;
}

let account: AccountInfo = { playerId: null, displayName: null, isGuest: true, uid: null };
let state: GameState | null = null;
let currentUser: User | null = null;
let realVisitTarget: RealFriend | null = null;
let activeChatFriend: { uid: string; displayName: string } | null = null;
let activeChatUnsub: Unsubscribe | null = null;
let inboxUnsub: Unsubscribe | null = null;
let friendsListUnsub: Unsubscribe | null = null;
const friendProfileUnsubs: Record<string, Unsubscribe> = {};
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let presenceCheckTimer: ReturnType<typeof setInterval> | null = null;
const PRESENCE_TIMEOUT_MS = 65000;
const unreadByFriend: Record<string, number> = {};

const TIME = ['Morning', 'Afternoon', 'Evening', 'Night'];
let sendTarget: string | null = null;
let authMode: 'signup' | 'login' = 'signup';
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let authSyncLock = false;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setCloudStatus(msg: string, cls: 'on' | 'off' | 'err'): void {
  const el = document.getElementById('cloudStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = 'cloud-status ' + (cls || 'off');
}

function generatePlayerId(): string {
  return 'accra_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function createDefaultState(name?: string | null): GameState {
  const safeName = (name || 'Accra Resident').trim().slice(0, 64) || 'Accra Resident';
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
    visitingReal: null,
    friends: JSON.parse(JSON.stringify(DEFAULT_FRIENDS)),
    realFriends: [],
    log: [`Welcome ${safeName}. This is your life in Accra.`],
    version: 4
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
  party: { title: 'Party', cost: '₵35', fn: () => { if (spend(35)) { change('social', 35); change('happy', 30); change('energy', -25); log('Good night out.'); } } },
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
  street_food: { title: 'Street food', cost: '₵10', fn: () => { if (spend(10)) { change('hunger', 35); change('happy', 8); log('Quick bite.'); } } },
  side_hustle: { title: 'Quick hustle', cost: 'Earn ₵12-30', fn: () => { const e = 12 + Math.floor(Math.random() * 19); change('money', e); change('energy', -14); log(`Quick ₵${e}.`); } },
  observe: { title: 'Observe', cost: 'Insight', fn: () => { change('happy', 12); log('Watched the city move.'); } }
};

// ===================== AUTH & CLOUD SAVE =====================
function continueAsGuest(): void {
  account = { playerId: generatePlayerId(), displayName: 'Guest', isGuest: true, uid: null };
  const saved = localStorage.getItem('lifeInAccra_state');
  if (saved) {
    try { state = JSON.parse(saved); } catch { state = createDefaultState('Guest'); }
  } else {
    state = createDefaultState('Guest');
  }
  localStorage.setItem('lifeInAccra_account', JSON.stringify(account));
  enterGame();
}

function showEmailAuth(mode: 'signup' | 'login'): void {
  authMode = mode;
  const titleEl = document.getElementById('emailModalTitle');
  const descEl = document.getElementById('emailModalDesc');
  const nameInput = document.getElementById('authDisplayName');
  const submitBtn = document.getElementById('emailSubmitBtn');

  if (titleEl) titleEl.textContent = mode === 'signup' ? 'Create Account' : 'Sign In';
  if (descEl) descEl.textContent = mode === 'signup' ? 'Email + password. Progress syncs to the cloud.' : 'Sign in to load your cloud save.';
  if (nameInput) nameInput.style.display = mode === 'signup' ? 'block' : 'none';
  if (submitBtn) submitBtn.textContent = mode === 'signup' ? 'Create' : 'Sign In';
  document.getElementById('emailModal')?.classList.add('show');
}

function closeEmailModal(): void {
  document.getElementById('emailModal')?.classList.remove('show');
}

async function submitEmailAuth(): Promise<void> {
  const emailInput = document.getElementById('authEmail') as HTMLInputElement | null;
  const passInput = document.getElementById('authPassword') as HTMLInputElement | null;
  const nameInput = document.getElementById('authDisplayName') as HTMLInputElement | null;

  const email = (emailInput?.value || '').trim();
  const password = passInput?.value || '';
  const displayName = (nameInput?.value || '').trim().slice(0, 64) || (email.split('@')[0] || 'Player').slice(0, 64);

  if (!email || password.length < 6) {
    toast('Valid email + password (6+ chars) required');
    return;
  }

  authSyncLock = true;
  try {
    let cred;
    if (authMode === 'signup') {
      cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
    } else {
      cred = await signInWithEmailAndPassword(auth, email, password);
    }
    currentUser = cred.user;
    account = {
      playerId: currentUser.uid,
      displayName: (currentUser.displayName || displayName).slice(0, 64),
      isGuest: false,
      uid: currentUser.uid
    };
    localStorage.setItem('lifeInAccra_account', JSON.stringify(account));

    const loaded = await loadCloudSave(currentUser.uid);
    if (!loaded) {
      state = createDefaultState(account.displayName);
      await cloudSave();
    }
    closeEmailModal();
    enterGame();
    toast(authMode === 'signup' ? 'Account created + cloud save on' : 'Signed in');
  } catch (e: unknown) {
    console.error(e);
    const err = e as { code?: string; message?: string };
    let msg = err.message || 'Auth failed';
    if (err.code === 'auth/email-already-in-use') msg = 'Email already registered. Sign in instead.';
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Wrong email or password.';
    if (err.code === 'auth/user-not-found') msg = 'No account with that email.';
    if (err.code === 'auth/operation-not-allowed') msg = 'Email/Password not enabled in Firebase Console — or use Google Sign-In.';
    toast(msg);
  } finally {
    authSyncLock = false;
  }
}

async function signInWithGoogle(): Promise<void> {
  authSyncLock = true;
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    currentUser = cred.user;
    const safeName = (currentUser.displayName || currentUser.email?.split('@')[0] || 'Player').slice(0, 64);
    account = {
      playerId: currentUser.uid,
      displayName: safeName,
      isGuest: false,
      uid: currentUser.uid
    };
    localStorage.setItem('lifeInAccra_account', JSON.stringify(account));

    const loaded = await loadCloudSave(currentUser.uid);
    if (!loaded) {
      state = createDefaultState(account.displayName);
      await cloudSave();
    }
    closeEmailModal();
    closeAccount();
    enterGame();
    toast('Signed in with Google + cloud save on');
  } catch (e: unknown) {
    console.error('Google Sign-In error:', e);
    toast('Google Sign-In cancelled or failed');
  } finally {
    authSyncLock = false;
  }
}

async function loadCloudSave(uid: string): Promise<boolean> {
  const playerPath = `players/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'players', uid));
    if (snap.exists()) {
      const data = snap.data();
      if (data && data.state && typeof data.state === 'object') {
        state = data.state as GameState;
        if (!state.realFriends) state.realFriends = [];
        localStorage.setItem('lifeInAccra_state', JSON.stringify(state));
        return true;
      } else if (data && typeof data.money === 'number' && typeof data.day === 'number') {
        const migrated = createDefaultState(typeof data.name === 'string' ? data.name : account.displayName);
        migrated.day = Number(data.day) || 1;
        migrated.time = Number(data.time) || 0;
        migrated.money = Number(data.money) || 180;
        migrated.hunger = Number(data.hunger ?? 75);
        migrated.energy = Number(data.energy ?? 85);
        migrated.happy = Number(data.happy ?? 65);
        migrated.social = Number(data.social ?? 45);
        migrated.health = Number(data.health ?? 90);
        if (typeof data.career === 'string') migrated.career = data.career;
        if (typeof data.location === 'string') migrated.location = data.location;
        state = migrated;
        localStorage.setItem('lifeInAccra_state', JSON.stringify(state));
        await cloudSave();
        return true;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, playerPath);
  }
  return false;
}

async function cloudSave(): Promise<boolean> {
  if (!currentUser) return false;
  if (!state) state = createDefaultState(account.displayName);

  const safeDisplayName = (account.displayName || state.name || 'Player').trim().slice(0, 64) || 'Player';
  const safeDay = Math.max(1, Math.min(100000, Math.round(Number(state.day) || 1)));
  const safeCareer = Object.prototype.hasOwnProperty.call(CAREERS, state.career) ? state.career : 'unemployed';
  const nowTs = Timestamp.now();

  const playerPath = `players/${currentUser.uid}`;
  const profilePath = `profiles/${currentUser.uid}`;

  try {
    await setDoc(doc(db, 'players', currentUser.uid), {
      ownerId: currentUser.uid,
      displayName: safeDisplayName,
      state: {
        ...state,
        log: (state.log || []).slice(0, 20)
      },
      updatedAt: nowTs
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, playerPath);
  }

  try {
    await setDoc(doc(db, 'profiles', currentUser.uid), {
      ownerId: currentUser.uid,
      displayName: safeDisplayName,
      day: safeDay,
      career: safeCareer,
      money: Math.max(0, Math.round(Number(state.money) || 0)),
      location: state.location || 'home',
      online: true,
      lastActiveMs: Date.now(),
      lastActive: nowTs,
      updatedAt: nowTs
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, profilePath);
  }

  return true;
}

function showImport(): void {
  document.getElementById('importModal')?.classList.add('show');
}

function closeImport(): void {
  document.getElementById('importModal')?.classList.remove('show');
}

function importSave(): void {
  const input = document.getElementById('importCode') as HTMLTextAreaElement | null;
  const code = (input?.value || '').trim();
  if (!code) { toast('Paste a save code'); return; }
  try {
    const data = JSON.parse(atob(code));
    if (data.account && data.state) {
      account = data.account;
      state = data.state;
      localStorage.setItem('lifeInAccra_account', JSON.stringify(account));
      localStorage.setItem('lifeInAccra_state', JSON.stringify(state));
      closeImport();
      enterGame();
      toast('Save loaded');
    } else throw new Error('Invalid');
  } catch {
    toast('Invalid save code');
  }
}

function enterGame(): void {
  document.getElementById('authScreen')?.classList.add('hidden');
  document.getElementById('gameApp')?.classList.remove('hidden');
  const canAdd = Boolean(currentUser);
  const addRow = document.getElementById('addFriendRow');
  const realLabel = document.getElementById('realFriendsLabel');
  if (addRow) addRow.style.display = canAdd ? 'flex' : 'none';
  if (realLabel) realLabel.style.display = canAdd ? 'block' : 'none';
  updateFriendStatuses();
  if (canAdd) {
    startPresenceHeartbeat();
    loadRealFriends();
    startInboxListener();
  }
  render();
}

function showAccount(): void {
  const cloud = currentUser
    ? `Signed in: ${currentUser.email || currentUser.uid}<br>DB: <code style="font-size:.7rem">${firebaseConfig.firestoreDatabaseId}</code>`
    : 'Local / Guest only';
  const infoEl = document.getElementById('accountInfo');
  if (infoEl) {
    infoEl.innerHTML = `
      <strong>${account.displayName || 'Resident'}</strong> ${account.isGuest ? '(Guest)' : ''}<br>
      Player ID: <code style="font-size:.75rem">${account.playerId || '—'}</code><br>
      <span style="font-size:.8rem;color:var(--muted)">${cloud}</span>`;
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
    navigator.clipboard.writeText(code).then(() => toast('Save code copied')).catch(() => {
      toast('Save code logged to console');
      console.log(code);
    });
  } else {
    toast('Save code logged to console');
    console.log(code);
  }
}

async function signOutUser(): Promise<void> {
  closeFriendChat();
  await stopPresenceHeartbeat();
  clearFriendListeners();
  if (inboxUnsub) {
    inboxUnsub();
    inboxUnsub = null;
  }
  try {
    await fbSignOut(auth);
  } catch (e) {
    console.error(e);
  }
  currentUser = null;
  localStorage.removeItem('lifeInAccra_account');
  localStorage.removeItem('lifeInAccra_state');
  state = null;
  closeAccount();
  document.getElementById('gameApp')?.classList.add('hidden');
  document.getElementById('authScreen')?.classList.remove('hidden');
  toast('Signed out');
}

// ===================== REAL PLAYERS, PRESENCE HEARTBEAT & REAL-TIME CHAT =====================
function getChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

function isFriendOnline(f: RealFriend): boolean {
  if (f.online === false) return false;
  if (typeof f.lastActiveMs !== 'number' || f.lastActiveMs <= 0) return false;
  return Date.now() - f.lastActiveMs < PRESENCE_TIMEOUT_MS;
}

async function sendPresenceHeartbeat(online = true): Promise<void> {
  if (!currentUser) return;
  try {
    const nowTs = Timestamp.now();
    await setDoc(doc(db, 'profiles', currentUser.uid), {
      ownerId: currentUser.uid,
      displayName: (account.displayName || state?.name || 'Player').slice(0, 64),
      online,
      lastActiveMs: Date.now(),
      lastActive: nowTs,
      updatedAt: nowTs
    }, { merge: true });
  } catch (e) {
    console.error('Presence heartbeat error', e);
  }
}

function startPresenceHeartbeat(): void {
  if (!currentUser) return;
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (presenceCheckTimer) clearInterval(presenceCheckTimer);

  sendPresenceHeartbeat(true);

  heartbeatTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      sendPresenceHeartbeat(true);
    }
  }, 25000);

  // Periodically re-evaluate online status badges in case a friend's heartbeat expires
  presenceCheckTimer = setInterval(() => {
    renderRealFriends();
  }, 15000);
}

async function stopPresenceHeartbeat(): Promise<void> {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (presenceCheckTimer) {
    clearInterval(presenceCheckTimer);
    presenceCheckTimer = null;
  }
  await sendPresenceHeartbeat(false);
}

function clearFriendListeners(): void {
  if (friendsListUnsub) {
    friendsListUnsub();
    friendsListUnsub = null;
  }
  Object.keys(friendProfileUnsubs).forEach(uid => {
    friendProfileUnsubs[uid]();
    delete friendProfileUnsubs[uid];
  });
}

async function loadRealFriends(): Promise<void> {
  if (!currentUser || !state) return;
  clearFriendListeners();

  const friendsPath = `players/${currentUser.uid}/friends`;
  const friendsRef = collection(db, 'players', currentUser.uid, 'friends');

  friendsListUnsub = onSnapshot(
    friendsRef,
    (snap) => {
      if (!state) return;
      const existingByUid: Record<string, RealFriend> = {};
      (state.realFriends || []).forEach(f => {
        existingByUid[f.uid] = f;
      });

      const nextList: RealFriend[] = [];
      const currentUids = new Set<string>();

      snap.forEach(docSnap => {
        const data = docSnap.data();
        const uid = docSnap.id;
        currentUids.add(uid);
        const prev = existingByUid[uid];
        nextList.push({
          uid,
          displayName: typeof data.displayName === 'string' ? data.displayName : (prev?.displayName || 'Player'),
          addedAt: data.addedAt,
          day: prev?.day,
          career: prev?.career,
          money: prev?.money,
          location: prev?.location,
          online: prev?.online,
          lastActiveMs: prev?.lastActiveMs
        });
      });

      // Clean up profile listeners for removed friends
      Object.keys(friendProfileUnsubs).forEach(uid => {
        if (!currentUids.has(uid)) {
          friendProfileUnsubs[uid]();
          delete friendProfileUnsubs[uid];
        }
      });

      state.realFriends = nextList;
      renderRealFriends();

      // Attach real-time profile listener for each friend to detect online heartbeat & stats
      nextList.forEach(friendItem => {
        if (friendProfileUnsubs[friendItem.uid]) return;
        friendProfileUnsubs[friendItem.uid] = onSnapshot(
          doc(db, 'profiles', friendItem.uid),
          (pSnap) => {
            if (!state || !pSnap.exists()) return;
            const d = pSnap.data();
            const target = (state.realFriends || []).find(x => x.uid === friendItem.uid);
            if (!target) return;

            if (typeof d.displayName === 'string') target.displayName = d.displayName;
            if (typeof d.day === 'number') target.day = d.day;
            if (typeof d.career === 'string') target.career = d.career;
            if (typeof d.money === 'number') target.money = d.money;
            if (typeof d.location === 'string') target.location = d.location;
            if (typeof d.online === 'boolean') target.online = d.online;

            if (typeof d.lastActiveMs === 'number') {
              target.lastActiveMs = d.lastActiveMs;
            } else if (d.lastActive && typeof (d.lastActive as Timestamp).toMillis === 'function') {
              target.lastActiveMs = (d.lastActive as Timestamp).toMillis();
            }

            renderRealFriends();
          },
          (err) => {
            console.error('Friend profile listener error', err);
          }
        );
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, friendsPath);
    }
  );
}

function renderRealFriends(): void {
  const el = document.getElementById('realFriendsList');
  if (!el || !state) return;
  const list = state.realFriends || [];
  if (!list.length) {
    el.innerHTML = currentUser
      ? '<div style="font-size:.8rem;color:var(--muted);padding:4px 0">Add players by ID or name</div>'
      : '';
    return;
  }
  el.innerHTML = list.map(f => {
    const isChatting = activeChatFriend?.uid === f.uid;
    const unread = unreadByFriend[f.uid] || 0;
    const online = isFriendOnline(f);
    const safeName = escapeHtml(f.displayName);
    const presenceBadge = online
      ? '<span class="online-badge">Online</span>'
      : '<span class="offline-badge">Offline</span>';
    const unreadBadge = unread > 0 ? `<span class="unread-badge">${unread}</span>` : '';
    return `
      <div class="real-friend-card ${isChatting ? 'active-chat' : ''}">
        <div class="real-friend-top">
          <span>👤</span>
          <strong>${safeName}</strong>
          ${presenceBadge}${unreadBadge}
          <span class="meta">Day ${f.day || '?'} · ${escapeHtml(f.career || 'resident')}</span>
        </div>
        <div class="real-friend-actions">
          <button onclick="openFriendChat('${escapeHtml(f.uid)}')">💬 Chat${unread > 0 ? ` (${unread})` : ''}</button>
          <button onclick="visitRealFriend('${escapeHtml(f.uid)}')">🏠 Visit</button>
        </div>
      </div>`;
  }).join('');
}

function openFriendChat(friendUid: string): void {
  if (!currentUser || !state) {
    toast('Sign in to message friends');
    return;
  }
  const friendObj = (state.realFriends || []).find(f => f.uid === friendUid);
  const friendName = friendObj?.displayName || realVisitTarget?.displayName || 'Friend';

  activeChatFriend = { uid: friendUid, displayName: friendName };
  unreadByFriend[friendUid] = 0;
  renderRealFriends();

  const chatBox = document.getElementById('friendChatBox');
  const chatTitle = document.getElementById('friendChatTitle');
  const chatMessages = document.getElementById('friendChatMessages');
  const chatInput = document.getElementById('friendChatInput') as HTMLInputElement | null;

  if (chatTitle) chatTitle.textContent = `Chat with ${friendName}`;
  if (chatBox) chatBox.classList.add('show');
  if (chatMessages) {
    chatMessages.innerHTML = '<div style="color:var(--muted);font-size:.78rem;text-align:center;padding:12px 0">Loading messages...</div>';
  }
  if (chatInput) chatInput.focus();

  if (activeChatUnsub) {
    activeChatUnsub();
    activeChatUnsub = null;
  }

  const chatId = getChatId(currentUser.uid, friendUid);
  const messagesPath = `chats/${chatId}/messages`;
  const messagesRef = collection(db, 'chats', chatId, 'messages');

  activeChatUnsub = onSnapshot(
    messagesRef,
    (snapshot) => {
      const items: ChatMessageItem[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const isRead = Boolean(d.read);
        const recipientId = String(d.recipientId || '');
        if (currentUser && recipientId === currentUser.uid && !isRead) {
          updateDoc(docSnap.ref, {
            read: true,
            readAt: Timestamp.now()
          }).catch(err => console.error('Failed to mark message read', err));
        }
        items.push({
          id: docSnap.id,
          senderId: String(d.senderId || ''),
          senderName: String(d.senderName || 'Player'),
          recipientId,
          text: String(d.text || ''),
          read: isRead,
          createdAtMs: typeof d.createdAtMs === 'number' ? d.createdAtMs : 0
        });
      });

      items.sort((a, b) => a.createdAtMs - b.createdAtMs);
      renderChatMessages(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, messagesPath);
    }
  );
}

function renderChatMessages(items: ChatMessageItem[]): void {
  const container = document.getElementById('friendChatMessages');
  if (!container || !currentUser) return;

  if (!items.length) {
    container.innerHTML = '<div style="color:var(--muted);font-size:.78rem;text-align:center;padding:18px 6px">No messages yet. Say hello! 👋</div>';
    return;
  }

  container.innerHTML = items.map(msg => {
    const isMine = msg.senderId === currentUser!.uid;
    const timeStr = msg.createdAtMs
      ? new Date(msg.createdAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const seenClass = isMine && msg.read ? ' seen' : '';
    const receiptHtml = isMine
      ? `<span class="read-status ${msg.read ? 'seen' : 'unseen'}" title="${msg.read ? 'Seen by recipient' : 'Sent'}">${msg.read ? '✓✓ Seen' : '✓ Sent'}</span>`
      : '';
    return `
      <div class="chat-msg ${isMine ? 'mine' : 'theirs'}${seenClass}">
        <div>${escapeHtml(msg.text)}</div>
        <div class="chat-msg-meta">
          <span>${isMine ? 'You' : escapeHtml(msg.senderName)}${timeStr ? ` · ${timeStr}` : ''}</span>
          ${receiptHtml}
        </div>
      </div>`;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function closeFriendChat(): void {
  if (activeChatUnsub) {
    activeChatUnsub();
    activeChatUnsub = null;
  }
  activeChatFriend = null;
  document.getElementById('friendChatBox')?.classList.remove('show');
  renderRealFriends();
}

function chatFromVisitModal(): void {
  if (!realVisitTarget) return;
  const uid = realVisitTarget.uid;
  closeRealVisit();
  openFriendChat(uid);
}

async function sendFriendMessage(): Promise<void> {
  if (!currentUser || !activeChatFriend || !state) {
    toast('Select a friend to message');
    return;
  }
  const input = document.getElementById('friendChatInput') as HTMLInputElement | null;
  const text = (input?.value || '').trim();
  if (!text) return;
  if (text.length > 500) {
    toast('Message too long (max 500 chars)');
    return;
  }

  if (input) input.value = '';

  const chatId = getChatId(currentUser.uid, activeChatFriend.uid);
  const messagesPath = `chats/${chatId}/messages`;
  const senderName = (account.displayName || state.name || 'Player').slice(0, 64);
  const nowMs = Date.now();

  try {
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      chatId,
      senderId: currentUser.uid,
      senderName,
      recipientId: activeChatFriend.uid,
      text,
      read: false,
      createdAtMs: nowMs,
      createdAt: Timestamp.now()
    });

    // Also drop a real-time notification in recipient's inbox so they get a live toast/unread badge
    try {
      await addDoc(collection(db, 'players', activeChatFriend.uid, 'inbox'), {
        from: currentUser.uid,
        fromName: senderName,
        text: text.slice(0, 120),
        type: 'chat',
        createdAt: Timestamp.now()
      });
    } catch {
      // Non-fatal if inbox notification fails
    }

    change('social', 2);
    render();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, messagesPath);
  }
}

function startInboxListener(): void {
  if (!currentUser) return;
  if (inboxUnsub) {
    inboxUnsub();
    inboxUnsub = null;
  }

  const inboxRef = collection(db, 'players', currentUser.uid, 'inbox');
  inboxUnsub = onSnapshot(
    inboxRef,
    async (snapshot) => {
      if (!currentUser || !state || snapshot.empty) return;
      let totalMoney = 0;
      const docsToDelete: typeof snapshot.docs = [];

      snapshot.docs.forEach(docSnap => {
        const d = docSnap.data();
        if (d.type === 'money' && typeof d.amount === 'number' && d.amount > 0) {
          totalMoney += d.amount;
          docsToDelete.push(docSnap);
        } else if (d.type === 'chat' && typeof d.from === 'string') {
          const senderUid = d.from;
          const senderName = typeof d.fromName === 'string' ? d.fromName : 'Friend';
          const preview = typeof d.text === 'string' ? d.text : 'Sent a message';
          if (activeChatFriend?.uid !== senderUid) {
            unreadByFriend[senderUid] = (unreadByFriend[senderUid] || 0) + 1;
            toast(`💬 ${senderName}: ${preview}`);
            log(`Message from ${senderName}: "${preview}"`);
            renderRealFriends();
          }
          docsToDelete.push(docSnap);
        }
      });

      for (const docSnap of docsToDelete) {
        try {
          await deleteDoc(docSnap.ref);
        } catch (e) {
          console.error('Failed to clear inbox item', e);
        }
      }

      if (totalMoney > 0) {
        change('money', totalMoney);
        log(`Received ₵${totalMoney} from other players`);
        toast(`You received ₵${totalMoney}`);
        await cloudSave();
        render();
      }
    },
    (error) => {
      console.error('Inbox listener error', error);
    }
  );
}

async function addRealFriend(): Promise<void> {
  if (!currentUser) {
    toast('Sign in to add real players');
    return;
  }
  const input = document.getElementById('addFriendInput') as HTMLInputElement | null;
  const q = (input?.value || '').trim();
  if (!q || q.length < 2) {
    toast('Enter a name or player ID');
    return;
  }
  if (q === currentUser.uid || q.toLowerCase() === (account.displayName || '').toLowerCase()) {
    toast("That's you");
    return;
  }

  try {
    let targetUid: string | null = null;
    let targetName: string | null = null;

    const directProf = await getDoc(doc(db, 'profiles', q));
    if (directProf.exists()) {
      targetUid = q;
      targetName = (directProf.data().displayName as string) || q;
    } else {
      const allSnap = await getDocs(query(collection(db, 'profiles'), limit(50)));
      const matchDoc = allSnap.docs.find(d => String(d.data().displayName || '').toLowerCase() === q.toLowerCase());
      if (matchDoc) {
        targetUid = matchDoc.id;
        targetName = String(matchDoc.data().displayName || matchDoc.id);
      }
    }

    if (!targetUid || !targetName) {
      toast('Player not found. They must have created an account and saved once.');
      return;
    }

    await setDoc(doc(db, 'players', currentUser.uid, 'friends', targetUid), {
      displayName: targetName,
      addedAt: Timestamp.now()
    });

    if (input) input.value = '';
    toast(`Added ${targetName}`);
    await loadRealFriends();
  } catch (e: unknown) {
    console.error(e);
    const err = e as { code?: string };
    toast(err.code === 'permission-denied' ? 'Permission denied — check rules' : 'Could not add friend');
  }
}

async function visitRealFriend(uid: string): Promise<void> {
  if (!state) return;
  try {
    const profSnap = await getDoc(doc(db, 'profiles', uid));
    if (!profSnap.exists()) {
      toast('Player profile not found');
      return;
    }
    const d = profSnap.data();
    realVisitTarget = {
      uid,
      displayName: String(d.displayName || 'Player'),
      day: typeof d.day === 'number' ? d.day : undefined,
      career: typeof d.career === 'string' ? d.career : undefined,
      money: typeof d.money === 'number' ? d.money : undefined,
      location: typeof d.location === 'string' ? d.location : undefined
    };
    const titleEl = document.getElementById('realVisitTitle');
    const bodyEl = document.getElementById('realVisitBody');
    const amtInput = document.getElementById('realSendAmountInput') as HTMLInputElement | null;
    if (titleEl) titleEl.textContent = `${realVisitTarget.displayName}'s Place`;
    if (bodyEl) {
      bodyEl.innerHTML = `
        <strong>${escapeHtml(realVisitTarget.displayName)}</strong><br>
        Day ${realVisitTarget.day ?? '—'} · ${escapeHtml(realVisitTarget.career || 'Unknown career')}<br>
        Wallet (public): ₵${realVisitTarget.money ?? '—'}<br>
        Last area: ${escapeHtml(realVisitTarget.location || '—')}<br><br>
        You're visiting their house.`;
    }
    if (amtInput) amtInput.value = '';
    document.getElementById('realVisitModal')?.classList.add('show');
    change('social', 6);
    log(`Visited ${realVisitTarget.displayName}'s place`);
    render();
  } catch (e) {
    console.error(e);
    toast('Could not load player');
  }
}

function closeRealVisit(): void {
  document.getElementById('realVisitModal')?.classList.remove('show');
  realVisitTarget = null;
}

async function sendMoneyToReal(): Promise<void> {
  if (!realVisitTarget || !currentUser || !state) {
    toast('Not available');
    return;
  }
  const amtInput = document.getElementById('realSendAmountInput') as HTMLInputElement | null;
  const amt = Math.floor(Number(amtInput?.value || 0));
  if (!amt || amt < 1) {
    toast('Enter an amount in ₵');
    return;
  }
  if (amt > state.money) {
    toast('Not enough ₵');
    return;
  }

  try {
    state.money -= amt;
    await addDoc(collection(db, 'players', realVisitTarget.uid, 'inbox'), {
      from: currentUser.uid,
      fromName: account.displayName || state.name || 'Player',
      amount: amt,
      type: 'money',
      createdAt: Timestamp.now()
    });
    await cloudSave();
    if (amtInput) amtInput.value = '';
    log(`Sent ₵${amt} to ${realVisitTarget.displayName}`);
    toast(`Sent ₵${amt} to ${realVisitTarget.displayName}`);
    render();
  } catch (e) {
    state.money += amt;
    console.error(e);
    toast('Transfer failed');
  }
}

async function claimInbox(): Promise<void> {
  if (!currentUser || !state) return;
  try {
    const inboxRef = collection(db, 'players', currentUser.uid, 'inbox');
    const snap = await getDocs(inboxRef);
    let total = 0;
    const batch = writeBatch(db);
    snap.docs.forEach(docSnap => {
      const d = docSnap.data();
      if (d.type === 'money' && typeof d.amount === 'number' && d.amount > 0) {
        total += d.amount;
        batch.delete(docSnap.ref);
      }
    });
    if (total > 0) {
      await batch.commit();
      change('money', total);
      log(`Received ₵${total} from other players`);
      toast(`You received ₵${total}`);
      await cloudSave();
      render();
    }
  } catch (e) {
    console.error('inbox', e);
  }
}

// ===================== HELPERS =====================
function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function change(stat: 'money' | 'hunger' | 'energy' | 'happy' | 'social' | 'health', amt: number): void {
  if (!state) return;
  if (stat === 'money') state.money = Math.max(0, Math.round(state.money + amt));
  else state[stat] = clamp(state[stat] + amt);
}

function spend(amt: number): boolean {
  if (!state) return false;
  if (state.money < amt) { toast('Not enough ₵'); return false; }
  state.money -= amt;
  return true;
}

function log(msg: string): void {
  if (!state) return;
  state.log.unshift(`Day ${state.day}: ${msg}`);
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
    if (Math.random() < 0.3) f.mood = pick(['content', 'happy', 'focused', 'cheerful', 'tired', 'stressed', 'relaxed']);
    f.money += 6 + Math.floor(Math.random() * 16);
  });
}

function advanceTime(hrs = 2): void {
  if (!state) return;
  state.time += Math.ceil(hrs / 3.5);
  while (state.time >= 4) {
    state.time -= 4;
    state.day++;
    change('hunger', -18);
    change('energy', -8);
    change('social', -4);
    change('happy', -3);
    const pay = CAREERS[state.career]?.pay || 0;
    if (pay > 0) { change('money', pay); log(`Career pay +₵${pay}`); }
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
  const inviteText = document.getElementById('inviteText');
  if (inviteText) {
    inviteText.textContent = pick([
      `${f.name} is inviting you over.`,
      `${f.name}: "You free? Come pass by."`,
      `${f.name} wants to hang out.`,
      `Message from ${f.name}: "I dey house, make you come."`
    ]);
  }
  document.getElementById('inviteBanner')?.classList.add('show');
  const btn = document.getElementById('acceptInviteBtn');
  if (btn) btn.onclick = () => acceptInvite();
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
    f.money -= amt;
    change('money', amt);
    f.affinity = Math.min(100, f.affinity + 3);
    log(`${f.name} sent you ₵${amt}. ${pick(DIALOGUE[f.id].gift)}`);
    toast(`${f.name} sent you ₵${amt}`);
  } else if (f.affinity >= 30) {
    log(`${f.name} checked on you.`);
  }
}

function checkCritical(): void {
  if (!state) return;
  if (state.hunger <= 5) { change('health', -8); toast("You're starving"); }
  if (state.energy <= 5) toast('Exhausted — sleep');
  if (state.health <= 15) toast('Health is low');
}

function render(): void {
  if (!state) return;
  const charName = document.getElementById('charName');
  const charJob = document.getElementById('charJob');
  const playerIdDisplay = document.getElementById('playerIdDisplay');

  if (charName) charName.textContent = state.name;
  if (charJob) charJob.textContent = CAREERS[state.career]?.name || 'Unemployed';
  if (playerIdDisplay) {
    playerIdDisplay.textContent = `ID: ${account.playerId ? account.playerId.slice(0, 18) + '...' : '—'}`;
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

  const dayInfo = document.getElementById('dayInfo');
  if (dayInfo) dayInfo.textContent = `Day ${state.day} • ${TIME[state.time]}`;

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
    logEl.innerHTML = state.log.slice(0, 9).map(e => `<div class="log-entry">${escapeHtml(e)}</div>`).join('') || "<div class='log-entry'>Your life begins...</div>";
  }

  renderRealFriends();
}

function doAction(key: string): void {
  if (!state) return;
  if (state.energy < 8 && key !== 'sleep') { toast('Too tired'); return; }
  if (state.time === 3 && key !== 'sleep') { toast("It's night. Go sleep."); return; }
  ACTIONS[key]?.fn();
  if (key !== 'sleep') advanceTime(2); else render();
}

function travel(key: string): void {
  if (!state) return;
  if (state.visiting) state.visiting = null;
  if (key === state.location && !state.visiting) return;
  if (state.energy < 10) { toast('Too tired'); return; }
  if (state.time === 3) { toast('Night. Stay home.'); return; }
  state.location = key;
  state.visiting = null;
  change('energy', -8);
  change('money', -3);
  log(`Went to ${LOCATIONS[key].name}`);
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
  f.affinity = Math.min(100, f.affinity + 5);
  f.lastInteract = state.day;
  change('social', 14);
  change('happy', 10);
  change('energy', -5);
  log(`${f.name}: "${pick(DIALOGUE[f.id].chat)}"`);
  advanceTime(1);
}

function hangOut(id: string): void {
  if (!state) return;
  const f = state.friends.find(x => x.id === id);
  if (!f) return;
  if (state.energy < 15) { toast('Too tired'); return; }
  f.affinity = Math.min(100, f.affinity + 10);
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
  f.money = Math.max(0, f.money - 10);
  f.affinity = Math.min(100, f.affinity + 8);
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
  f.affinity = Math.min(100, f.affinity + 12);
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
      f.money -= amt;
      change('money', amt);
      f.affinity = Math.min(100, f.affinity + 3);
      log(`${f.name} helped with ₵${amt}`);
      toast(`${f.name} came through`);
    } else {
      log(`${f.name} wanted to help but is tight.`);
    }
  } else {
    f.affinity = Math.max(0, f.affinity - 3);
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
  state.money -= amt;
  f.money += amt;
  f.affinity = Math.min(100, f.affinity + Math.min(18, Math.floor(amt / 8)));
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
  const careerOptions = document.getElementById('careerOptions');
  if (careerOptions) {
    careerOptions.innerHTML = Object.entries(CAREERS).map(([k, c]) => {
      const locked = Boolean(c.reqMoney && state!.money < c.reqMoney);
      return `<button style="text-align:left;padding:12px" ${locked ? 'disabled' : ''} onclick="setCareer('${k}')"><strong>${c.name}</strong>${c.pay ? ` • ₵${c.pay}/day` : ''}<br><span style="font-size:.8rem;color:var(--muted)">${c.desc}${locked ? ` (Need ₵${c.reqMoney})` : ''}</span></button>`;
    }).join('');
  }
  document.getElementById('careerModal')?.classList.add('show');
}

function closeCareerModal(): void {
  document.getElementById('careerModal')?.classList.remove('show');
}

function setCareer(key: string): void {
  if (!state) return;
  const c = CAREERS[key];
  if (!c) return;
  if (c.reqMoney && state.money < c.reqMoney) { toast('Not enough'); return; }
  if (c.reqMoney) change('money', -c.reqMoney);
  state.career = key;
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
    summaryBody.innerHTML = `<strong>${escapeHtml(state.name)}</strong><br>Day ${state.day} • ${c.name}<br><br>Wallet: ₵${state.money}<br>Hunger ${state.hunger} • Energy ${state.energy}<br>Happy ${state.happy} • Social ${state.social} • Health ${state.health}<br><br><strong>Friendships</strong><br>${top}`;
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
  if (currentUser) {
    await claimInbox();
    const ok = await cloudSave();
    toast(ok ? 'Saved (local + cloud)' : 'Saved locally (cloud failed)');
  } else {
    toast('Saved locally');
  }
}

// ===================== INIT =====================
setCloudStatus(`Cloud: connected (${firebaseConfig.firestoreDatabaseId})`, 'on');

document.addEventListener('visibilitychange', () => {
  if (!currentUser) return;
  if (document.visibilityState === 'visible') {
    sendPresenceHeartbeat(true);
  }
});

window.addEventListener('pagehide', () => {
  if (currentUser) {
    sendPresenceHeartbeat(false);
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    if (!authSyncLock && document.getElementById('authScreen') && !document.getElementById('authScreen')!.classList.contains('hidden')) {
      account = {
        playerId: user.uid,
        displayName: (user.displayName || user.email?.split('@')[0] || 'Player').slice(0, 64),
        isGuest: false,
        uid: user.uid
      };
      const loaded = await loadCloudSave(user.uid);
      if (!loaded) {
        const local = localStorage.getItem('lifeInAccra_state');
        if (local) {
          try { state = JSON.parse(local); } catch { state = createDefaultState(account.displayName); }
        } else {
          state = createDefaultState(account.displayName);
        }
        await cloudSave();
      }
      enterGame();
    }
  }
});
