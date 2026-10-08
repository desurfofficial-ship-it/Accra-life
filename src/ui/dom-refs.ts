/**
 * DOM element references for the index.html HUD shell.
 * Task 18 modular refactor — extracted verbatim from the main.ts monolith.
 */

export const container = document.getElementById('viewportContainer');
export const promptEl = document.getElementById('interactionPrompt');
export const promptTitleEl = document.getElementById('promptTitle');
export const promptSubEl = document.getElementById('promptSub');
export const toastEl = document.getElementById('interactionToast');
export const resetCameraBtn = document.getElementById('resetCameraBtn');
export const sprintToggleBtn = document.getElementById('sprintToggleBtn');
export const interactTriggerBtn = document.getElementById('interactTriggerBtn');
export const joystickZone = document.getElementById('joystickZone');
export const joystickKnob = document.getElementById('joystickKnob');

export const hudCashAmountEl = document.getElementById('hudCashAmount');
export const walletDeltaEl = document.getElementById('walletDeltaFloating');
export const progressionTierBadgeEl = document.getElementById('progressionTierBadge');
export const livingSituationSubEl = document.getElementById('livingSituationSub');
export const activeObjectiveBannerEl = document.getElementById('activeObjectiveBanner');
export const objTagEl = document.getElementById('objTag');
export const objTitleEl = document.getElementById('objTitle');
export const objDescEl = document.getElementById('objDesc');
export const cancelObjectiveBtn = document.getElementById('cancelObjectiveBtn');
export const walletOpenBtn = document.getElementById('walletOpenBtn');
export const workMenuOpenBtn = document.getElementById('workMenuOpenBtn');
export const heatStatusPillEl = document.getElementById('heatStatusPill');
export const heatStatusTextEl = document.getElementById('heatStatusText');

export const economyModalBackdrop = document.getElementById('economyModalBackdrop');
export const modalCloseBtn = document.getElementById('modalCloseBtn');
export const modalHeaderTitle = document.getElementById('modalHeaderTitle');
export const modalHeaderSub = document.getElementById('modalHeaderSub');
export const modalBodyContent = document.getElementById('modalBodyContent');
export const modalTabBtns = Array.from(
  document.querySelectorAll<HTMLButtonElement>('.modal-tab-btn')
);

export const chatOpenBtn = document.getElementById('chatOpenBtn');
export const chatBadge = document.getElementById('chatBadge');
export const chatModalBackdrop = document.getElementById('chatModalBackdrop');
export const chatSheetTitle = document.getElementById('chatSheetTitle');
export const chatSheetSub = document.getElementById('chatSheetSub');
export const chatSheetNearby = document.getElementById('chatSheetNearby');
export const chatStatusPill = document.getElementById('chatStatusPill');
export const chatMessagesEl = document.getElementById('chatMessages');
export const chatInput = document.getElementById('chatInput') as HTMLInputElement | null;
export const chatSendBtn = document.getElementById('chatSendBtn') as HTMLButtonElement | null;
export const nearbyStrip = document.getElementById('nearbyStrip');
export const currentLocationPill = document.getElementById('currentLocationPill');
export const liveEventPillEl = document.getElementById('liveEventPill');
export const liveEventTextEl = document.getElementById('liveEventText');
export const placeRecoveryBtn = document.getElementById('placeRecoveryBtn') as HTMLButtonElement | null;
export const friendsOpenBtn = document.getElementById('friendsOpenBtn');
export const friendsBadge = document.getElementById('friendsBadge');
export const friendsModalBackdrop = document.getElementById('friendsModalBackdrop');
export const friendsCloseBtn = document.getElementById('friendsCloseBtn');
export const friendsRequestsEl = document.getElementById('friendsRequests');
export const friendsListEl = document.getElementById('friendsList');
export const friendsNearbyEl = document.getElementById('friendsNearby');
export const friendsActivityEl = document.getElementById('friendsActivity');
export const visitBannerEl = document.getElementById('visitBanner');
export const visitBannerTextEl = document.getElementById('visitBannerText');
export const visitLeaveBtn = document.getElementById('visitLeaveBtn');
