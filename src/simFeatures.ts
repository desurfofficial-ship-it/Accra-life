import {
  BodyGender,
  HairstyleType,
  HomeDesign,
  SimLook,
  renderCreatorSimPreview
} from './isoRoom';

export interface TraitDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export interface DreamDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export interface BirthOriginDef {
  id: string;
  icon: string;
  title: string;
  tagline: string;
  startCashBonus: number;
  loanDebt: number;
  weeklyLoanRepay: number;
  perks: string[];
}

export interface HousingTierDef {
  id: 'nima' | 'madina' | 'east_legon';
  title: string;
  tag: string;
  desc: string;
  startCash: number;
  weeklyRent: number;
  wallColor: string;
  floorStyle: 'warm' | 'checkered' | 'marble' | 'wood';
}

export const HAIRSTYLES: { id: HairstyleType; label: string }[] = [
  { id: 'lowcut', label: 'Low cut' },
  { id: 'bald', label: 'Bald' },
  { id: 'curls', label: 'Curls' },
  { id: 'afro', label: 'Afro' },
  { id: 'locs', label: 'Locs' },
  { id: 'braids', label: 'Braids' },
  { id: 'classic', label: 'Classic' }
];

export const TRAITS: TraitDef[] = [
  {
    id: 'hustler',
    icon: '💼',
    title: 'Hustler',
    desc: 'Sees money everywhere. Hustle skill grows faster and bosses notice.'
  },
  {
    id: 'foodie',
    icon: '🍲',
    title: 'Foodie',
    desc: 'Lives for jollof. Learns cooking fast and food is extra enjoyable.'
  },
  {
    id: 'owambe',
    icon: '🎉',
    title: 'Detty December Spirit',
    desc: 'Always ready to spray Cedis and vibe. Social grows faster at parties.'
  },
  {
    id: 'gymrat',
    icon: '💪',
    title: 'Gym Rat',
    desc: 'Fitness first. Energy drains slower and health stays high.'
  }
];

export const DREAMS: DreamDef[] = [
  {
    id: 'oga_top',
    icon: '👔',
    title: 'Oga at the Top',
    desc: 'Reach the top level of any career.'
  },
  {
    id: 'east_legon_landlord',
    icon: '🏡',
    title: 'East Legon Landlord',
    desc: 'Build a net worth of ₵1,000,000.'
  },
  {
    id: 'afrobeats_star',
    icon: '🎤',
    title: 'Highlife & Afrobeats Star',
    desc: 'Max out the Music skill (level 10).'
  }
];

export const BIRTH_ORIGINS: BirthOriginDef[] = [
  {
    id: 'susu_baby',
    icon: '🏦',
    title: 'Susu Baby!',
    tagline: 'Self-made hits different.',
    startCashBonus: 0,
    loanDebt: 60000,
    weeklyLoanRepay: 12000,
    perks: [
      '₵60,000 Susu loan to start — repay ₵12,000 every week',
      'Hustle skill starts at 2',
      'You learn every skill 25% faster',
      'Start in Nima or Madina and work your way to East Legon'
    ]
  },
  {
    id: 'diaspora_kid',
    icon: '✈️',
    title: 'Burger / Diaspora Kid!',
    tagline: 'Born with connections and soft life.',
    startCashBonus: 40000,
    loanDebt: 0,
    weeklyLoanRepay: 0,
    perks: [
      'Extra ₵40,000 seed money — zero microfinance debt',
      'Network & Charisma start at 2',
      'VIP access at Osu & Airport lounges',
      'Fast-track to East Legon real estate'
    ]
  },
  {
    id: 'legon_scholar',
    icon: '🎓',
    title: 'Legon Professor Kid!',
    tagline: 'Book smart and disciplined.',
    startCashBonus: 20000,
    loanDebt: 0,
    weeklyLoanRepay: 0,
    perks: [
      'Extra ₵20,000 scholarship grant — debt free',
      'Tech & Study skills start at 3',
      '30% higher career promotion & shift pay',
      'Respected across campus and tech hubs'
    ]
  }
];

export const HOUSING_TIERS: HousingTierDef[] = [
  {
    id: 'nima',
    title: 'Face-me-I-face-you · Nima',
    tag: 'Hard start',
    desc: 'One room, shared compound, loud neighbours. Cheap rent, big dreams.',
    startCash: 76000,
    weeklyRent: 2400,
    wallColor: 'gold',
    floorStyle: 'warm'
  },
  {
    id: 'madina',
    title: 'Self-contain · Madina',
    tag: 'Balanced',
    desc: 'Your own toilet and kitchen corner, near the tech hubs. Balanced.',
    startCash: 96000,
    weeklyRent: 4800,
    wallColor: 'gold',
    floorStyle: 'warm'
  },
  {
    id: 'east_legon',
    title: 'Executive Studio · East Legon',
    tag: 'Soft life',
    desc: 'Marble floors, backup solar power, close to Osu & Airport. High rent.',
    startCash: 64000,
    weeklyRent: 12000,
    wallColor: 'lavender',
    floorStyle: 'marble'
  }
];

export interface CreatorDraft {
  name: string;
  gender: BodyGender;
  hairstyle: HairstyleType;
  outfitColor: string;
  skinTone: string;
  traits: string[];
  dream: string;
  birthOriginIdx: number;
  homeTier: 'nima' | 'madina' | 'east_legon';
}

const STEP_TITLES = ['Look', 'Personality', 'Dream', 'Birth lottery', 'Home'];
let creatorStep = 0;
let creatorSpinAngle = 0;
let isDraggingSim = false;
let dragStartX = 0;
let spinSetupDone = false;

export const creatorDraft: CreatorDraft = {
  name: 'tgod',
  gender: 'man',
  hairstyle: 'braids',
  outfitColor: '#eab308',
  skinTone: '#5c3317',
  traits: ['hustler', 'foodie'],
  dream: 'oga_top',
  birthOriginIdx: 0,
  homeTier: 'madina'
};

export function initCreatorSpinGesture(): void {
  if (spinSetupDone) return;
  const stage = document.getElementById('creatorSpinStage');
  if (!stage) return;
  spinSetupDone = true;

  const refreshPreview = () => {
    renderCreatorSimPreview(
      'charCreatorCanvas',
      {
        gender: creatorDraft.gender,
        hairstyle: creatorDraft.hairstyle,
        outfitColor: creatorDraft.outfitColor,
        skinTone: creatorDraft.skinTone
      },
      creatorSpinAngle
    );
  };

  stage.addEventListener('pointerdown', (e) => {
    isDraggingSim = true;
    dragStartX = e.clientX;
  });
  window.addEventListener('pointermove', (e) => {
    if (!isDraggingSim) return;
    const dx = e.clientX - dragStartX;
    dragStartX = e.clientX;
    creatorSpinAngle += dx * 0.03;
    refreshPreview();
  });
  window.addEventListener('pointerup', () => {
    isDraggingSim = false;
  });
}

export function renderCreatorWizardStep(
  onFinishWizard: (draft: CreatorDraft) => void
): void {
  initCreatorSpinGesture();

  const titleEl = document.getElementById('creatorStepTitle');
  const dotsEl = document.getElementById('creatorProgressDots');
  const topNextBtn = document.getElementById('creatorTopNextBtn');
  const bottomBtn = document.getElementById('creatorBottomBtn') as HTMLButtonElement | null;
  const bodyEl = document.getElementById('creatorStepBody');

  if (titleEl) titleEl.textContent = STEP_TITLES[creatorStep] || 'Look';
  if (dotsEl) {
    dotsEl.innerHTML = [0, 1, 2, 3, 4]
      .map(i => `<div class="creator-dot ${i <= creatorStep ? 'done' : ''}"></div>`)
      .join('');
  }

  renderCreatorSimPreview(
    'charCreatorCanvas',
    {
      gender: creatorDraft.gender,
      hairstyle: creatorDraft.hairstyle,
      outfitColor: creatorDraft.outfitColor,
      skinTone: creatorDraft.skinTone
    },
    creatorSpinAngle
  );

  if (!bodyEl || !bottomBtn || !topNextBtn) return;

  const cleanName = (creatorDraft.name || 'tgod').replace(/^@/, '') || 'tgod';

  if (creatorStep === 0) {
    topNextBtn.textContent = 'Next';
    bottomBtn.textContent = 'Continue';
    bottomBtn.disabled = false;

    bodyEl.innerHTML = `
      <div class="sim-name-pill">
        <input type="text" id="creatorSimNameInput" value="@${cleanName}" maxlength="24" />
        <span>your Sim's name</span>
      </div>
      <div class="creator-label">Body</div>
      <div class="gender-row">
        <button class="pill-choice-btn ${creatorDraft.gender === 'woman' ? 'active' : ''}" onclick="setCreatorGender('woman')">Woman</button>
        <button class="pill-choice-btn ${creatorDraft.gender === 'man' ? 'active' : ''}" onclick="setCreatorGender('man')">Man</button>
      </div>
      <div class="creator-label">Hairstyle</div>
      <div class="hair-pills-wrap">
        ${HAIRSTYLES.map(h => `<button class="hair-pill ${creatorDraft.hairstyle === h.id ? 'active' : ''}" onclick="setCreatorHairstyle('${h.id}')">${h.label}</button>`).join('')}
      </div>
    `;

    const inp = document.getElementById('creatorSimNameInput') as HTMLInputElement | null;
    if (inp) {
      inp.addEventListener('input', () => {
        creatorDraft.name = inp.value.replace(/^@/, '').trim() || 'tgod';
      });
    }
    return;
  }

  if (creatorStep === 1) {
    const rem = Math.max(0, 2 - creatorDraft.traits.length);
    topNextBtn.textContent = 'Next';
    bottomBtn.textContent = rem > 0 ? `Choose ${rem} more` : 'Continue';
    bottomBtn.disabled = rem > 0;

    bodyEl.innerHTML = `
      <div class="creator-label">Choose 2 traits for ${cleanName}.</div>
      <div class="traits-grid">
        ${TRAITS.map(t => {
          const active = creatorDraft.traits.includes(t.id);
          return `
            <button class="trait-card ${active ? 'active' : ''}" onclick="toggleCreatorTrait('${t.id}')">
              <div class="icon">${t.icon}</div>
              <div class="title">${t.title}</div>
              <div class="desc">${t.desc}</div>
            </button>`;
        }).join('')}
      </div>
    `;
    return;
  }

  if (creatorStep === 2) {
    topNextBtn.textContent = 'Next';
    bottomBtn.textContent = 'Continue';
    bottomBtn.disabled = false;

    bodyEl.innerHTML = `
      <div class="creator-label">What's ${cleanName}'s big dream?</div>
      <div class="dream-list">
        ${DREAMS.map(d => {
          const active = creatorDraft.dream === d.id;
          return `
            <button class="dream-card ${active ? 'active' : ''}" onclick="setCreatorDream('${d.id}')">
              <div class="dream-icon">${d.icon}</div>
              <div class="dream-info">
                <div class="title">${d.title}</div>
                <div class="desc">${d.desc}</div>
              </div>
            </button>`;
        }).join('')}
      </div>
    `;
    return;
  }

  if (creatorStep === 3) {
    const origin = BIRTH_ORIGINS[creatorDraft.birthOriginIdx] || BIRTH_ORIGINS[0];
    topNextBtn.textContent = 'Next';
    bottomBtn.textContent = 'Choose where to live';
    bottomBtn.disabled = false;

    bodyEl.innerHTML = `
      <div class="creator-label" style="text-align:center">Every Ghanaian is born into something. What was ${cleanName} born into?</div>
      <div class="birth-badge-box" onclick="creatorShuffle()" title="Tap to re-roll Birth Lottery">${origin.icon}</div>
      <div style="text-align:center">
        <div style="font-size:1.55rem;font-weight:800;color:#0f172a">${origin.title}</div>
        <div style="font-size:0.9rem;color:#64748b;margin-top:2px">${origin.tagline}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px">
        ${origin.perks.map(p => `<div class="birth-perk-item"><span>💪</span><span>${p}</span></div>`).join('')}
      </div>
    `;
    return;
  }

  // Step 4: Home
  topNextBtn.textContent = 'Move in';
  bottomBtn.textContent = 'Move in';
  bottomBtn.disabled = false;

  bodyEl.innerHTML = `
    <div class="creator-label">Where will ${cleanName} live? Rent is paid every Saturday.</div>
    <div class="dream-list">
      ${HOUSING_TIERS.map(h => {
        const active = creatorDraft.homeTier === h.id;
        return `
          <button class="home-tier-card ${active ? 'active' : ''}" onclick="setCreatorHomeTier('${h.id}')">
            <div class="home-tier-top">
              <span class="title">${h.title}</span>
              <span class="tier-tag">${h.tag}</span>
            </div>
            <div style="font-size:0.86rem;color:#64748b;line-height:1.35">${h.desc}</div>
            <div class="home-tier-meta">
              <span class="start-cash">Start with ₵${h.startCash.toLocaleString()}</span>
              <span class="rent-cost">Rent ₵${h.weeklyRent.toLocaleString()}/wk</span>
            </div>
          </button>`;
      }).join('')}
    </div>
  `;

  // Wire final finish callback if needed
  void onFinishWizard;
}

export function getCreatorStep(): number {
  return creatorStep;
}

export function setCreatorStep(s: number): void {
  creatorStep = Math.max(0, Math.min(4, s));
}

export function shuffleCreatorStep(): void {
  const outfits = ['#eab308', '#ec4899', '#2563eb', '#16a34a', '#8b5cf6', '#ea580c'];
  if (creatorStep === 0) {
    creatorDraft.gender = Math.random() > 0.5 ? 'man' : 'woman';
    creatorDraft.hairstyle = HAIRSTYLES[Math.floor(Math.random() * HAIRSTYLES.length)].id;
    creatorDraft.outfitColor = outfits[Math.floor(Math.random() * outfits.length)];
    creatorSpinAngle += 0.8;
  } else if (creatorStep === 1) {
    const shuffled = [...TRAITS].sort(() => Math.random() - 0.5);
    creatorDraft.traits = [shuffled[0].id, shuffled[1].id];
  } else if (creatorStep === 2) {
    creatorDraft.dream = DREAMS[Math.floor(Math.random() * DREAMS.length)].id;
  } else if (creatorStep === 3) {
    creatorDraft.birthOriginIdx = (creatorDraft.birthOriginIdx + 1) % BIRTH_ORIGINS.length;
  } else {
    creatorDraft.homeTier = HOUSING_TIERS[Math.floor(Math.random() * HOUSING_TIERS.length)].id;
  }
}

export function syncDraftFromDesign(name: string, design: HomeDesign): void {
  creatorDraft.name = (name || 'tgod').replace(/^@/, '');
  creatorDraft.outfitColor = design.outfitColor || '#eab308';
  if (design.look) {
    creatorDraft.gender = design.look.gender;
    creatorDraft.hairstyle = design.look.hairstyle;
    creatorDraft.skinTone = design.look.skinTone;
  }
  if (design.housingTier) {
    creatorDraft.homeTier = design.housingTier;
  }
}
