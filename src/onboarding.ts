/**
 * CHALÉ LIFE — First Screen Onboarding
 * Welcome → Guest / Account → Name → Enter Accra
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { auth } from './firebase';

export type OnboardingResult = {
  mode: 'guest' | 'account';
  displayName: string;
  userId: string | null;
};

type ScreenId = 'welcome' | 'auth' | 'name' | 'loading';

const STORAGE_KEY = 'chale_life_profile_v1';

export function loadSavedProfile(): { displayName: string; mode: 'guest' | 'account' } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveProfile(displayName: string, mode: 'guest' | 'account'): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ displayName, mode }));
}

export function startOnboarding(
  onComplete: (result: OnboardingResult) => void
): void {
  const overlay = document.getElementById('onboardingOverlay');
  if (!overlay) {
    onComplete({ mode: 'guest', displayName: 'Chale', userId: null });
    return;
  }
  const overlayEl = overlay;

  const screens: Record<ScreenId, HTMLElement | null> = {
    welcome: document.getElementById('obScreenWelcome'),
    auth: document.getElementById('obScreenAuth'),
    name: document.getElementById('obScreenName'),
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

  function finish(result: OnboardingResult): void {
    saveProfile(result.displayName, result.mode);
    showScreen('loading');
    const loadingName = document.getElementById('obLoadingName');
    if (loadingName) loadingName.textContent = result.displayName;

    setTimeout(() => {
      overlayEl.classList.add('exit');
      setTimeout(() => {
        overlayEl.style.display = 'none';
        onComplete(result);
      }, 420);
    }, 1100);
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
    if (authTitle) authTitle.textContent = 'Create your account';
    if (authSubmitBtn) authSubmitBtn.textContent = 'Create Account';
    if (authToggleBtn) authToggleBtn.textContent = 'Already have an account? Sign in';
    showScreen('auth');
  });

  authToggleBtn?.addEventListener('click', () => {
    authMode = authMode === 'signup' ? 'signin' : 'signup';
    if (authTitle) {
      authTitle.textContent = authMode === 'signup' ? 'Create your account' : 'Welcome back';
    }
    if (authSubmitBtn) {
      authSubmitBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
    }
    if (authToggleBtn) {
      authToggleBtn.textContent =
        authMode === 'signup'
          ? 'Already have an account? Sign in'
          : 'New here? Create an account';
    }
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
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
    authSubmitBtn.textContent = 'Please wait…';

    try {
      let user: User;
      if (authMode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        user = cred.user;
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
      }
      pendingUser = user;
      pendingMode = 'account';

      if (nameInput) {
        nameInput.value = user.displayName || email.split('@')[0] || '';
      }
      showScreen('name');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message.replace('Firebase: ', '').replace(/\(auth\/.*\)\.?/, '').trim()
          : 'Something went wrong. Try again.';
      showError(msg || 'Could not sign in. Check your details.');
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = authMode === 'signup' ? 'Create Account' : 'Sign In';
    }
  });

  document.getElementById('obBtnEnter')?.addEventListener('click', async () => {
    const name = (nameInput?.value.trim() || 'Chale').slice(0, 24);
    if (name.length < 2) {
      if (nameErrorEl) {
        nameErrorEl.textContent = 'Enter a name (at least 2 characters).';
        nameErrorEl.classList.add('visible');
      }
      return;
    }

    if (pendingUser) {
      try {
        await updateProfile(pendingUser, { displayName: name });
      } catch {
        // non-fatal
      }
    }

    finish({
      mode: pendingMode,
      displayName: name,
      userId: pendingUser?.uid ?? null
    });
  });

  nameInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('obBtnEnter')?.click();
    }
  });

  document.getElementById('obBackFromAuth')?.addEventListener('click', () => {
    showScreen('welcome');
  });
  document.getElementById('obBackFromName')?.addEventListener('click', () => {
    if (pendingMode === 'account') showScreen('auth');
    else showScreen('welcome');
  });

  onAuthStateChanged(auth, (user) => {
    if (user && !overlay.classList.contains('handled')) {
      pendingUser = user;
      pendingMode = 'account';
      if (nameInput) nameInput.value = user.displayName || user.email?.split('@')[0] || '';
    }
  });

  showScreen('welcome');
  overlay.classList.add('visible');
}
