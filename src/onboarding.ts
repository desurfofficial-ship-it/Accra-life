/**
 * CHALÉ LIFE — First Screen Onboarding
 * Welcome → Guest/Account → Name → Look → Trait → Origin (DBee / Aunty Ba) → Enter Accra
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth } from './firebase';

export type SkinPreset = 'deep' | 'rich' | 'warm' | 'light';
export type HairPreset = 'fade' | 'twists' | 'bun' | 'short';
export type TraitId =
  | 'hustler'
  | 'church'
  | 'campus'
  | 'family'
  | 'quiet'
  | 'party';
export type OriginId = 'dbee' | 'aunty_ba';

export type OnboardingResult = {
  mode: 'guest' | 'account';
  displayName: string;
  userId: string | null;
  skin: SkinPreset;
  hair: HairPreset;
  trait: TraitId;
  origin: OriginId;
};

type ScreenId = 'welcome' | 'auth' | 'name' | 'look' | 'trait' | 'origin' | 'loading';

const STORAGE_KEY = 'chale_life_profile_v2';

export const TRAIT_DEFS: Record<
  TraitId,
  { label: string; blurb: string }
> = {
  hustler: {
    label: 'Hustler',
    blurb: 'Side money finds you. Rest is harder.'
  },
  church: {
    label: 'Church Person',
    blurb: 'Community opens doors. Nights out cost more.'
  },
  campus: {
    label: 'Campus',
    blurb: 'Young energy. Bills hit different.'
  },
  family: {
    label: 'Family First',
    blurb: 'People back you. Obligations follow.'
  },
  quiet: {
    label: 'Quiet Operator',
    blurb: 'Less drama. Fewer invitations.'
  },
  party: {
    label: 'Party Person',
    blurb: 'Social fuel is high. Cash burns faster.'
  }
};

export const ORIGIN_DEFS: Record<
  OriginId,
  { label: string; blurb: string; startCashGHS: number }
> = {
  dbee: {
    label: 'DBee',
    blurb: 'Connected. Soft landing. People know your name.',
    startCashGHS: 500
  },
  aunty_ba: {
    label: 'Aunty Ba',
    blurb: 'You start from the ground. Every cedi counts.',
    startCashGHS: 0
  }
};

export function loadSavedProfile(): Partial<OnboardingResult> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveProfile(result: OnboardingResult): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

export function startOnboarding(
  onComplete: (result: OnboardingResult) => void
): void {
  const overlay = document.getElementById('onboardingOverlay');
  if (!overlay) {
    onComplete({
      mode: 'guest',
      displayName: 'Chale',
      userId: null,
      skin: 'rich',
      hair: 'fade',
      trait: 'hustler',
      origin: 'aunty_ba'
    });
    return;
  }
  const overlayEl = overlay;

  const screens: Record<ScreenId, HTMLElement | null> = {
    welcome: document.getElementById('obScreenWelcome'),
    auth: document.getElementById('obScreenAuth'),
    name: document.getElementById('obScreenName'),
    look: document.getElementById('obScreenLook'),
    trait: document.getElementById('obScreenTrait'),
    origin: document.getElementById('obScreenOrigin'),
    loading: document.getElementById('obScreenLoading')
  };

  const errorEl = document.getElementById('obError');
  const nameErrorEl = document.getElementById('obNameError');
  const nameInput = document.getElementById('obNameInput') as HTMLInputElement | null;
  const emailInput = document.getElementById('obEmailInput') as HTMLInputElement | null;
  const passwordInput = document.getElementById('obPasswordInput') as HTMLInputElement | null;
  const authTitle = document.getElementById('obAuthTitle');
  const authSubmitBtn = document.getElementById('obAuthSubmit') as HTMLButtonElement | null;
  const authToggleBtn = document.getElementById('obAuthToggle') as HTMLButtonElement | null;

  let authMode: 'signup' | 'signin' = 'signup';
  let pendingMode: 'guest' | 'account' = 'guest';
  let pendingUser: User | null = null;
  let pendingName = 'Chale';
  let pendingSkin: SkinPreset = 'rich';
  let pendingHair: HairPreset = 'fade';
  let pendingTrait: TraitId = 'hustler';
  let pendingOrigin: OriginId = 'aunty_ba';

  function showScreen(id: ScreenId): void {
    for (const [key, el] of Object.entries(screens)) {
      if (el) el.classList.toggle('active', key === id);
    }
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
    }
    if (nameErrorEl) {
      nameErrorEl.textContent = '';
      nameErrorEl.classList.remove('visible');
    }
  }

  function showError(msg: string): void {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.add('visible');
    }
  }

  function selectChip(containerId: string, value: string, dataAttr: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll(`[data-${dataAttr}]`).forEach((el) => {
      el.classList.toggle('selected', el.getAttribute(`data-${dataAttr}`) === value);
    });
  }

  function finish(result: OnboardingResult): void {
    saveProfile(result);
    showScreen('loading');
    const loadingName = document.getElementById('obLoadingName');
    if (loadingName) {
      loadingName.textContent = `${result.displayName} · ${ORIGIN_DEFS[result.origin].label}`;
    }
    setTimeout(() => {
      overlayEl.classList.add('exit');
      setTimeout(() => {
        overlayEl.style.display = 'none';
        onComplete(result);
      }, 420);
    }, 1200);
  }

  document.getElementById('obBtnGuest')?.addEventListener('click', () => {
    pendingMode = 'guest';
    pendingUser = null;
    const saved = loadSavedProfile();
    if (nameInput && saved?.displayName) nameInput.value = saved.displayName;
    showScreen('name');
  });

  document.getElementById('obBtnAccount')?.addEventListener('click', () => {
    pendingMode = 'account';
    authMode = 'signup';
    if (authTitle) authTitle.textContent = 'Keep Your Story';
    if (authSubmitBtn) authSubmitBtn.textContent = 'Create Account';
    if (authToggleBtn) authToggleBtn.textContent = 'Already have an account? Sign in';
    showScreen('auth');
  });

  authToggleBtn?.addEventListener('click', () => {
    authMode = authMode === 'signup' ? 'signin' : 'signup';
    if (authTitle) authTitle.textContent = authMode === 'signup' ? 'Keep Your Story' : 'Welcome Back';
    if (authSubmitBtn) authSubmitBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
    if (authToggleBtn) {
      authToggleBtn.textContent =
        authMode === 'signup'
          ? 'Already have an account? Sign in'
          : 'New here? Create an account';
    }
  });

  authSubmitBtn?.addEventListener('click', async () => {
    const email = emailInput?.value.trim() ?? '';
    const password = passwordInput?.value ?? '';
    if (!email || !password) {
      showError('Enter email and password.');
      return;
    }
    if (password.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = 'One moment…';
    try {
      let user: User;
      if (authMode === 'signup') {
        user = (await createUserWithEmailAndPassword(auth, email, password)).user;
      } else {
        user = (await signInWithEmailAndPassword(auth, email, password)).user;
      }
      pendingUser = user;
      pendingMode = 'account';
      if (nameInput) nameInput.value = user.displayName || email.split('@')[0] || '';
      showScreen('name');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim()
          : 'Something went wrong.';
      showError(msg || 'Could not sign in.');
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
    }
  });

  document.getElementById('obBtnNameNext')?.addEventListener('click', async () => {
    const name = (nameInput?.value.trim() || 'Chale').slice(0, 24);
    if (name.length < 2) {
      if (nameErrorEl) {
        nameErrorEl.textContent = 'Enter a name (at least 2 characters).';
        nameErrorEl.classList.add('visible');
      }
      return;
    }
    pendingName = name;
    if (pendingUser) {
      try {
        await updateProfile(pendingUser, { displayName: name });
      } catch {
        /* non-fatal */
      }
    }
    selectChip('obSkinRow', pendingSkin, 'skin');
    selectChip('obHairRow', pendingHair, 'hair');
    showScreen('look');
  });

  nameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('obBtnNameNext')?.click();
  });

  document.getElementById('obSkinRow')?.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-skin]') as HTMLElement | null;
    if (!t) return;
    pendingSkin = t.getAttribute('data-skin') as SkinPreset;
    selectChip('obSkinRow', pendingSkin, 'skin');
  });
  document.getElementById('obHairRow')?.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-hair]') as HTMLElement | null;
    if (!t) return;
    pendingHair = t.getAttribute('data-hair') as HairPreset;
    selectChip('obHairRow', pendingHair, 'hair');
  });

  document.getElementById('obBtnLookNext')?.addEventListener('click', () => {
    selectChip('obTraitGrid', pendingTrait, 'trait');
    const blurb = document.getElementById('obTraitBlurb');
    if (blurb) blurb.textContent = TRAIT_DEFS[pendingTrait].blurb;
    showScreen('trait');
  });

  document.getElementById('obTraitGrid')?.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-trait]') as HTMLElement | null;
    if (!t) return;
    pendingTrait = t.getAttribute('data-trait') as TraitId;
    selectChip('obTraitGrid', pendingTrait, 'trait');
    const blurb = document.getElementById('obTraitBlurb');
    if (blurb) blurb.textContent = TRAIT_DEFS[pendingTrait].blurb;
  });

  document.getElementById('obBtnTraitNext')?.addEventListener('click', () => {
    selectChip('obOriginRow', pendingOrigin, 'origin');
    showScreen('origin');
  });

  document.getElementById('obOriginRow')?.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-origin]') as HTMLElement | null;
    if (!t) return;
    pendingOrigin = t.getAttribute('data-origin') as OriginId;
    selectChip('obOriginRow', pendingOrigin, 'origin');
  });

  document.getElementById('obBtnEnter')?.addEventListener('click', () => {
    finish({
      mode: pendingMode,
      displayName: pendingName,
      userId: pendingUser?.uid ?? null,
      skin: pendingSkin,
      hair: pendingHair,
      trait: pendingTrait,
      origin: pendingOrigin
    });
  });

  document.getElementById('obBackFromAuth')?.addEventListener('click', () => showScreen('welcome'));
  document.getElementById('obBackFromName')?.addEventListener('click', () => {
    if (pendingMode === 'account') showScreen('auth');
    else showScreen('welcome');
  });
  document.getElementById('obBackFromLook')?.addEventListener('click', () => showScreen('name'));
  document.getElementById('obBackFromTrait')?.addEventListener('click', () => showScreen('look'));
  document.getElementById('obBackFromOrigin')?.addEventListener('click', () => showScreen('trait'));

  onAuthStateChanged(auth, (user) => {
    if (user) {
      pendingUser = user;
      pendingMode = 'account';
      if (nameInput) nameInput.value = user.displayName || user.email?.split('@')[0] || '';
    }
  });

  showScreen('welcome');
  overlayEl.classList.add('visible');
}
