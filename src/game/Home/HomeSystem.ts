/**
 * CHALÉ LIFE — Player compound home
 * Furniture ownership + flex score (screenshot / compete on social).
 * Ghana-flavoured pieces, fixed courtyard slots for now.
 */

export type FurnitureId =
  | 'plastic_chair'
  | 'wooden_stool'
  | 'plastic_table'
  | 'sofa'
  | 'tv'
  | 'fridge'
  | 'bed'
  | 'kente_cloth'
  | 'sound_box'
  | 'generator'
  | 'flower_pots'
  | 'rug';

export interface FurnitureItem {
  id: FurnitureId;
  title: string;
  costGHS: number;
  flexPoints: number;
  /** Courtyard slot index 0–5 for placement */
  slot: number;
  blurb: string;
}

export const FURNITURE_CATALOG: FurnitureItem[] = [
  {
    id: 'plastic_chair',
    title: 'Plastic Chair',
    costGHS: 25,
    flexPoints: 4,
    slot: 0,
    blurb: 'Every compound starts here.'
  },
  {
    id: 'wooden_stool',
    title: 'Wooden Stool',
    costGHS: 40,
    flexPoints: 5,
    slot: 1,
    blurb: 'Chop bar classic.'
  },
  {
    id: 'plastic_table',
    title: 'Plastic Table',
    costGHS: 80,
    flexPoints: 8,
    slot: 2,
    blurb: 'Waakye on the veranda.'
  },
  {
    id: 'flower_pots',
    title: 'Flower Pots',
    costGHS: 35,
    flexPoints: 6,
    slot: 3,
    blurb: 'Aunty will notice.'
  },
  {
    id: 'rug',
    title: 'Courtyard Rug',
    costGHS: 120,
    flexPoints: 12,
    slot: 4,
    blurb: 'Soft underfoot.'
  },
  {
    id: 'kente_cloth',
    title: 'Wall Cloth',
    costGHS: 150,
    flexPoints: 18,
    slot: 5,
    blurb: 'Colour on the wall.'
  },
  {
    id: 'sofa',
    title: '2-Seater Sofa',
    costGHS: 350,
    flexPoints: 28,
    slot: 0,
    blurb: 'Sit like someone.'
  },
  {
    id: 'bed',
    title: 'Mattress + Frame',
    costGHS: 400,
    flexPoints: 30,
    slot: 1,
    blurb: 'Real sleep.'
  },
  {
    id: 'tv',
    title: 'TV + Stand',
    costGHS: 500,
    flexPoints: 35,
    slot: 2,
    blurb: 'Match day ready.'
  },
  {
    id: 'fridge',
    title: 'Fridge',
    costGHS: 800,
    flexPoints: 42,
    slot: 3,
    blurb: 'Cold water. Status.'
  },
  {
    id: 'sound_box',
    title: 'Sound Box',
    costGHS: 600,
    flexPoints: 38,
    slot: 4,
    blurb: 'Neighbours will hear.'
  },
  {
    id: 'generator',
    title: 'Generator',
    costGHS: 1200,
    flexPoints: 55,
    slot: 5,
    blurb: 'When ECG goes…'
  }
];

const STORAGE_KEY = 'chale_life_home_v1';
const MAX_FLEX = FURNITURE_CATALOG.reduce((s, f) => s + f.flexPoints, 0);

export interface HomeState {
  owned: FurnitureId[];
}

export type HomeListener = (state: HomeState) => void;

export class HomeSystem {
  private owned = new Set<FurnitureId>();
  private listeners = new Set<HomeListener>();

  constructor() {
    this.load();
  }

  public getOwned(): FurnitureId[] {
    return [...this.owned];
  }

  public owns(id: FurnitureId): boolean {
    return this.owned.has(id);
  }

  public getFlexScore(): number {
    let pts = 0;
    for (const id of this.owned) {
      const item = FURNITURE_CATALOG.find((f) => f.id === id);
      if (item) pts += item.flexPoints;
    }
    return Math.round((pts / MAX_FLEX) * 100);
  }

  public getFlexLabel(): string {
    const s = this.getFlexScore();
    if (s >= 80) return 'Big Man Compound';
    if (s >= 55) return 'Proper House';
    if (s >= 30) return 'Settling In';
    if (s >= 10) return 'Bare Bones';
    return 'Empty Veranda';
  }

  /** One-liner for screenshot / X share */
  public getFlexShareLine(displayName = 'Chale'): string {
    return `${displayName}'s Adabraka compound · Flex ${this.getFlexScore()} · ${this.getFlexLabel()} · #ChaleLife`;
  }

  public buy(
    id: FurnitureId,
    canAfford: (cost: number) => boolean,
    spend: (cost: number, title: string) => boolean
  ): { success: boolean; message: string } {
    const item = FURNITURE_CATALOG.find((f) => f.id === id);
    if (!item) return { success: false, message: 'Unknown item.' };
    if (this.owned.has(id)) return { success: false, message: 'Already own this.' };
    if (!canAfford(item.costGHS)) {
      return { success: false, message: `Need ₵${item.costGHS}` };
    }
    if (!spend(item.costGHS, item.title)) {
      return { success: false, message: 'Payment failed.' };
    }
    this.owned.add(id);
    this.persist();
    this.notify();
    return {
      success: true,
      message: `${item.title} · Flex ${this.getFlexScore()}`
    };
  }

  public onUpdate(listener: HomeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = { owned: this.getOwned() };
    for (const l of this.listeners) l(state);
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ owned: this.getOwned() }));
    } catch {
      /* ignore */
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as HomeState;
      if (Array.isArray(data.owned)) {
        for (const id of data.owned) {
          if (FURNITURE_CATALOG.some((f) => f.id === id)) this.owned.add(id);
        }
      }
    } catch {
      /* ignore */
    }
  }
}
