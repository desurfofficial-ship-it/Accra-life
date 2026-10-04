import { Phase1Scene } from './game/Core/Phase1Scene';
import { InteractableTarget } from './game/Player/InteractionSystem';

const container = document.getElementById('viewportContainer');
const promptEl = document.getElementById('interactionPrompt');
const promptTitleEl = document.getElementById('promptTitle');
const promptSubEl = document.getElementById('promptSub');
const toastEl = document.getElementById('interactionToast');
const resetCameraBtn = document.getElementById('resetCameraBtn');
const sprintToggleBtn = document.getElementById('sprintToggleBtn');
const interactTriggerBtn = document.getElementById('interactTriggerBtn');
const joystickZone = document.getElementById('joystickZone');
const joystickKnob = document.getElementById('joystickKnob');

let toastTimeout: ReturnType<typeof setTimeout> | null = null;
let sprintToggled = false;

function showInteractionFeedback(message: string): void {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2800);
}

function updateInteractionPromptUI(target: InteractableTarget | null): void {
  if (!promptEl || !promptTitleEl || !promptSubEl) return;
  if (target) {
    promptTitleEl.textContent = target.promptLabel;
    promptSubEl.textContent = target.title;
    promptEl.classList.add('visible');
  } else {
    promptEl.classList.remove('visible');
  }
}

if (container) {
  const phase1 = new Phase1Scene(container, {
    onTargetChanged: (target) => {
      updateInteractionPromptUI(target);
    },
    onTargetInteracted: (target) => {
      showInteractionFeedback(target.interactionResponse);
    }
  });

  // Reset camera behind player
  resetCameraBtn?.addEventListener('click', () => {
    phase1.thirdPersonCamera.resetBehindPlayer(phase1.player.rotationY);
  });

  // Click / tap on floating interaction prompt or right-side Interact button
  promptEl?.addEventListener('click', () => {
    phase1.interactionSystem.triggerCurrentInteraction();
  });

  interactTriggerBtn?.addEventListener('click', () => {
    const triggered = phase1.interactionSystem.triggerCurrentInteraction();
    if (!triggered) {
      showInteractionFeedback('Walk closer to a building entrance or signpost to interact.');
    }
  });

  // Toggle Jog / Sprint state for touch/mouse convenience
  sprintToggleBtn?.addEventListener('click', () => {
    sprintToggled = !sprintToggled;
    phase1.player.setSprintState(sprintToggled);
    sprintToggleBtn.classList.toggle('active', sprintToggled);
    sprintToggleBtn.textContent = sprintToggled ? 'Jog: ON' : 'Jog: OFF';
  });

  // Virtual thumbstick for touch / mouse drag movement
  if (joystickZone && joystickKnob) {
    let stickActive = false;
    let centerX = 0;
    let centerY = 0;
    const maxRadius = 36;

    const updateStick = (clientX: number, clientY: number) => {
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(dist, maxRadius);
      const angle = Math.atan2(dy, dx);

      const offsetX = Math.cos(angle) * clampedDist;
      const offsetY = Math.sin(angle) * clampedDist;

      joystickKnob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
      phase1.player.setJoystickInput(offsetX / maxRadius, offsetY / maxRadius);
    };

    const resetStick = () => {
      stickActive = false;
      joystickKnob.style.transform = 'translate(-50%, -50%)';
      phase1.player.setJoystickInput(0, 0);
    };

    joystickZone.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      stickActive = true;
      const rect = joystickZone.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
      joystickZone.setPointerCapture(e.pointerId);
      updateStick(e.clientX, e.clientY);
    });

    joystickZone.addEventListener('pointermove', (e) => {
      if (!stickActive) return;
      e.stopPropagation();
      updateStick(e.clientX, e.clientY);
    });

    joystickZone.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      resetStick();
    });

    joystickZone.addEventListener('pointercancel', () => {
      resetStick();
    });
  }
}
