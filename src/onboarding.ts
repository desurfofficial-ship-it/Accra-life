/**
 * CHALÉ LIFE — First Screen Onboarding
 */
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  sendEmailVerification,
  reload,
  updateProfile,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth } from './firebase';

export type SkinPreset = 'deep' | 'rich' | 'warm' | 'light';
export type HairPreset = 'fade' | 'twists' | 'bun' | 'short';
export type TraitId = 'hustler' | 'church' | 'campus' | 'family' | 'quiet' | 'party';
export type OriginId = 'dbee' | 'aunty_ba';

export type OnboardingResult = {
  mode: 'guest' | 'account';
  displayName: string;
  userId: string | null;
  /** True only when mode='account' AND the user's email is verified.
   *  Guests (anonymous auth) are never email-verified — they cannot save
   *  to /players or /profiles under the strict rules (which is fine, since
   *  guests don't save anyway). Main.ts uses this to show a banner + disable
   *  cloud sync for unverified-account players. */
  emailVerified: boolean;
  skin: SkinPreset;
  hair: HairPreset;
  trait: TraitId;
  origin: OriginId;
};

type ScreenId = 'welcome' | 'auth' | 'verify' | 'name' | 'look' | 'trait' | 'origin' | 'loading';
const STORAGE_KEY = 'chale_life_profile_v2';

export const TRAIT_DEFS: Record<TraitId, { label: string; blurb: string }> = {
  hustler: { label: 'Hustler', blurb: 'Side money finds you. Rest is harder.' },
  church: { label: 'Church Person', blurb: 'Community opens doors. Nights out cost more.' },
  campus: { label: 'Campus', blurb: 'Young energy. Bills hit different.' },
  family: { label: 'Family First', blurb: 'People back you. Obligations follow.' },
  quiet: { label: 'Quiet Operator', blurb: 'Less drama. Fewer invitations.' },
  party: { label: 'Party Person', blurb: 'Social fuel is high. Cash burns faster.' }
};

export const ORIGIN_DEFS: Record<OriginId, { label: string; blurb: string; startCashGHS: number }> = {
  dbee: { label: 'DBee', blurb: 'Connected. Soft landing.', startCashGHS: 500 },
  aunty_ba: { label: 'Aunty Ba', blurb: 'Every cedi counts.', startCashGHS: 0 }
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

export function startOnboarding(onComplete: (result: OnboardingResult) => void): void {
  const params = new URLSearchParams(window.location.search);
  const savedProfile = loadSavedProfile();
  if (params.get('autostart') === '1') {
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) {
      overlay.classList.remove('visible');
      overlay.style.display = 'none';
    }
    const autoResult: OnboardingResult = {
      mode: (savedProfile?.mode as 'guest' | 'account') || 'guest',
      displayName: savedProfile?.displayName || 'Chale',
      userId: savedProfile?.userId ?? null,
      emailVerified: false, // Auto-resume path can't know — main.ts will re-check via auth.currentUser.emailVerified
      skin: (savedProfile?.skin as SkinPreset) || 'rich',
      hair: (savedProfile?.hair as HairPreset) || 'fade',
      trait: (savedProfile?.trait as TraitId) || 'hustler',
      origin: (savedProfile?.origin as OriginId) || 'dbee'
    };
    saveProfile(autoResult);
    onComplete(autoResult);
    return;
  }

  const overlay = document.getElementById('onboardingOverlay');
  if (!overlay) {
    onComplete({
      mode: 'guest', displayName: 'Chale', userId: null, emailVerified: false,
      skin: 'rich', hair: 'fade', trait: 'hustler', origin: 'aunty_ba'
    });
    return;
  }
  const overlayEl = overlay;
  const screens: Record<ScreenId, HTMLElement | null> = {
    welcome: document.getElementById('obScreenWelcome'),
    auth: document.getElementById('obScreenAuth'),
    verify: document.getElementById('obScreenVerify'),
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
    if (errorEl) { errorEl.textContent = ''; errorEl.classList.remove('visible'); }
    if (nameErrorEl) { nameErrorEl.textContent = ''; nameErrorEl.classList.remove('visible'); }
  }

  function showError(msg: string): void {
    if (errorEl) { errorEl.textContent = msg; errorEl.classList.add('visible'); }
  }

  function selectChip(containerId: string, value: string, dataAttr: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll(`[data-${dataAttr}]`).forEach((el) => {
      el.classList.toggle('selected', el.getAttribute(`data-${dataAttr}`) === value);
    });
  }

  function fillChips(
    containerId: string,
    items: Array<{ id: string; label: string }>,
    dataAttr: string,
    selected: string
  ): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (const item of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ob-chip' + (item.id === selected ? ' selected' : '');
      btn.setAttribute(`data-${dataAttr}`, item.id);
      btn.textContent = item.label;
      container.appendChild(btn);
    }
  }

  fillChips('obSkinRow', [
    { id: 'deep', label: 'Deep' }, { id: 'rich', label: 'Rich' },
    { id: 'warm', label: 'Warm' }, { id: 'light', label: 'Light' }
  ], 'skin', pendingSkin);
  fillChips('obHairRow', [
    { id: 'fade', label: 'Fade' }, { id: 'twists', label: 'Twists' },
    { id: 'bun', label: 'Bun' }, { id: 'short', label: 'Short' }
  ], 'hair', pendingHair);
  fillChips('obTraitRow', Object.entries(TRAIT_DEFS).map(([id, d]) => ({ id, label: d.label })), 'trait', pendingTrait);
  fillChips('obTraitGrid', Object.entries(TRAIT_DEFS).map(([id, d]) => ({ id, label: d.label })), 'trait', pendingTrait);
  fillChips('obOriginRow', Object.entries(ORIGIN_DEFS).map(([id, d]) => ({ id, label: d.label })), 'origin', pendingOrigin);

  function finish(result: OnboardingResult): void {
    saveProfile(result);
    showScreen('loading');
    const loadingName = document.getElementById('obLoadingName');
    if (loadingName) loadingName.textContent = `${result.displayName} · ${ORIGIN_DEFS[result.origin].label}`;
    setTimeout(() => {
      overlayEl.classList.add('exit');
      setTimeout(() => {
        overlayEl.style.display = 'none';
        onComplete(result);
      }, 420);
    }, 1200);
  }

  document.getElementById('obBtnGuest')?.addEventListener('click', async () => {
    pendingMode = 'guest';
    // Sign in anonymously so guests get a real uid for /presence and
    // /location_chats writes (those rules only require isSignedIn(), no
    // email verification). The strict /players and /profiles rules will
    // still reject guest writes (no email_verified) — that's fine, guests
    // don't save anyway.
    if (authSubmitBtn) {
      authSubmitBtn.disabled = true;
      authSubmitBtn.textContent = 'One moment…';
    }
    try {
      const cred = await signInAnonymously(auth);
      pendingUser = cred.user;
    } catch (err) {
      // Soft-fail: continue as guest with no uid — they can still read chat
      // but can't write presence. Show a brief toast via the name error UI.
      if (nameErrorEl) {
        nameErrorEl.textContent = 'Guest sign-in failed — continuing in read-only mode.';
        nameErrorEl.classList.add('visible');
      }
      pendingUser = null;
    } finally {
      if (authSubmitBtn) {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = 'Create Account';
      }
    }
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

  // Verify-screen buttons — used after signup (email always unverified) or
  // after signin (only shown if email is still unverified).
  const obVerifyEmailText = document.getElementById('obVerifyEmailText');
  const obResendVerifyBtn = document.getElementById('obResendVerifyBtn') as HTMLButtonElement | null;
  const obConfirmVerifiedBtn = document.getElementById('obConfirmVerifiedBtn') as HTMLButtonElement | null;
  const obVerifyError = document.getElementById('obVerifyError');
  const obSkipVerifyBtn = document.getElementById('obSkipVerifyBtn') as HTMLButtonElement | null;

  async function sendVerificationAndShowScreen(user: User): Promise<void> {
    try {
      await sendEmailVerification(user);
    } catch {
      /* non-fatal — the email might already be sent or rate-limited */
    }
    if (obVerifyEmailText) obVerifyEmailText.textContent = user.email || 'your email';
    if (obVerifyError) {
      obVerifyError.textContent = '';
      obVerifyError.classList.remove('visible');
    }
    showScreen('verify');
  }

  obResendVerifyBtn?.addEventListener('click', async () => {
    if (!pendingUser) return;
    obResendVerifyBtn.disabled = true;
    obResendVerifyBtn.textContent = 'Sending…';
    try {
      await sendEmailVerification(pendingUser);
      if (obVerifyError) {
        obVerifyError.textContent = 'Verification email sent again. Check your inbox.';
        obVerifyError.classList.add('visible');
      }
    } catch (err) {
      if (obVerifyError) {
        const msg = err instanceof Error
          ? err.message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim()
          : 'Could not resend.';
        obVerifyError.textContent = msg || 'Could not resend.';
        obVerifyError.classList.add('visible');
      }
    } finally {
      obResendVerifyBtn.disabled = false;
      obResendVerifyBtn.textContent = 'Resend email';
    }
  });

  obConfirmVerifiedBtn?.addEventListener('click', async () => {
    if (!pendingUser) return;
    obConfirmVerifiedBtn.disabled = true;
    obConfirmVerifiedBtn.textContent = 'Checking…';
    try {
      // Reload the user to refresh emailVerified from the Firebase server.
      await reload(pendingUser);
      if (pendingUser.emailVerified) {
        // Proceed to name screen.
        if (nameInput) nameInput.value = pendingUser.displayName || pendingUser.email?.split('@')[0] || '';
        showScreen('name');
      } else {
        if (obVerifyError) {
          obVerifyError.textContent = 'Email not verified yet. Click the link in the email, then try again.';
          obVerifyError.classList.add('visible');
        }
      }
    } catch (err) {
      if (obVerifyError) {
        const msg = err instanceof Error ? err.message : 'Could not check.';
        obVerifyError.textContent = msg;
        obVerifyError.classList.add('visible');
      }
    } finally {
      obConfirmVerifiedBtn.disabled = false;
      obConfirmVerifiedBtn.textContent = 'I’ve verified — continue';
    }
  });

  obSkipVerifyBtn?.addEventListener('click', () => {
    // Skip — continue to name screen but mark emailVerified=false.
    // Main.ts will show a banner + disable cloud sync.
    if (pendingUser && nameInput) {
      nameInput.value = pendingUser.displayName || pendingUser.email?.split('@')[0] || '';
    }
    showScreen('name');
  });

  authToggleBtn?.addEventListener('click', () => {
    authMode = authMode === 'signup' ? 'signin' : 'signup';
    if (authTitle) authTitle.textContent = authMode === 'signup' ? 'Keep Your Story' : 'Welcome Back';
    if (authSubmitBtn) authSubmitBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
    if (authToggleBtn) {
      authToggleBtn.textContent = authMode === 'signup'
        ? 'Already have an account? Sign in'
        : 'New here? Create an account';
    }
  });

  authSubmitBtn?.addEventListener('click', async () => {
    const email = emailInput?.value.trim() ?? '';
    const password = passwordInput?.value ?? '';
    if (!email || !password) { showError('Enter email and password.'); return; }
    if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }
    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = 'One moment…';
    try {
      let user: User;
      if (authMode === 'signup') {
        user = (await createUserWithEmailAndPassword(auth, email, password)).user;
        // Always send a verification email after signup — Firebase users
        // start with emailVerified=false. The strict /players + /profiles
        // rules reject writes from unverified users (blocks Payload 3).
        await sendVerificationAndShowScreen(user);
      } else {
        user = (await signInWithEmailAndPassword(auth, email, password)).user;
        if (user.emailVerified) {
          // Existing verified user — proceed directly to name.
          if (nameInput) nameInput.value = user.displayName || email.split('@')[0] || '';
          showScreen('name');
        } else {
          // Unverified returning user — give them a chance to verify now.
          await sendVerificationAndShowScreen(user);
        }
      }
      pendingUser = user;
      pendingMode = 'account';
    } catch (err: unknown) {
      const msg = err instanceof Error
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
      try { await updateProfile(pendingUser, { displayName: name }); } catch { /* non-fatal */ }
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
    selectChip('obTraitRow', pendingTrait, 'trait');
    selectChip('obTraitGrid', pendingTrait, 'trait');
    const blurb = document.getElementById('obTraitBlurb');
    if (blurb) blurb.textContent = TRAIT_DEFS[pendingTrait].blurb;
    showScreen('trait');
  });

  const onTrait = (e: Event) => {
    const t = (e.target as HTMLElement).closest('[data-trait]') as HTMLElement | null;
    if (!t) return;
    pendingTrait = t.getAttribute('data-trait') as TraitId;
    selectChip('obTraitRow', pendingTrait, 'trait');
    selectChip('obTraitGrid', pendingTrait, 'trait');
    const blurb = document.getElementById('obTraitBlurb');
    if (blurb) blurb.textContent = TRAIT_DEFS[pendingTrait].blurb;
  };
  document.getElementById('obTraitRow')?.addEventListener('click', onTrait);
  document.getElementById('obTraitGrid')?.addEventListener('click', onTrait);

  document.getElementById('obBtnTraitNext')?.addEventListener('click', () => {
    selectChip('obOriginRow', pendingOrigin, 'origin');
    const originBlurb = document.getElementById('obOriginBlurb');
    if (originBlurb) originBlurb.textContent = ORIGIN_DEFS[pendingOrigin].blurb;
    showScreen('origin');
  });

  document.getElementById('obOriginRow')?.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-origin]') as HTMLElement | null;
    if (!t) return;
    pendingOrigin = t.getAttribute('data-origin') as OriginId;
    selectChip('obOriginRow', pendingOrigin, 'origin');
    const originBlurb = document.getElementById('obOriginBlurb');
    if (originBlurb) originBlurb.textContent = ORIGIN_DEFS[pendingOrigin].blurb;
  });

  const onEnter = () => {
    finish({
      mode: pendingMode,
      displayName: pendingName,
      userId: pendingUser?.uid ?? null,
      // Guests (anonymous auth) are never email-verified — that's fine,
      // they can't save anyway. Account users get emailVerified from the
      // Firebase user object; if they skipped the verify screen, this is
      // false and main.ts will show a banner + disable cloud sync.
      emailVerified: pendingMode === 'account' ? (pendingUser?.emailVerified ?? false) : false,
      skin: pendingSkin,
      hair: pendingHair,
      trait: pendingTrait,
      origin: pendingOrigin
    });
  };
  document.getElementById('obBtnEnter')?.addEventListener('click', onEnter);
  document.getElementById('obBtnOriginGo')?.addEventListener('click', onEnter);

  const quickResumeBtn = document.getElementById('obBtnQuickResume');
  if (quickResumeBtn && savedProfile?.displayName) {
    quickResumeBtn.style.display = 'inline-flex';
    quickResumeBtn.textContent = `Continue as ${savedProfile.displayName}`;
    quickResumeBtn.addEventListener('click', () => {
      finish({
        mode: (savedProfile.mode as 'guest' | 'account') || 'guest',
        displayName: savedProfile.displayName || 'Chale',
        userId: savedProfile.userId ?? null,
        skin: (savedProfile.skin as SkinPreset) || 'rich',
        hair: (savedProfile.hair as HairPreset) || 'fade',
        trait: (savedProfile.trait as TraitId) || 'hustler',
        origin: (savedProfile.origin as OriginId) || 'aunty_ba'
      });
    });
  }

  document.getElementById('obBackFromAuth')?.addEventListener('click', () => showScreen('welcome'));
  document.getElementById('obBackFromVerify')?.addEventListener('click', () => showScreen('auth'));
  document.getElementById('obBackFromName')?.addEventListener('click', () => {
    showScreen(pendingMode === 'account' ? (pendingUser && !pendingUser.emailVerified && pendingUser.email ? 'verify' : 'auth') : 'welcome');
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
