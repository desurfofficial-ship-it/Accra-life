export type JobLifecycleStatus = 'AVAILABLE' | 'ACCEPTED' | 'WORKING' | 'COMPLETED' | 'PAID';

export interface WorkStepDefinition {
  readonly stepId: string;
  readonly stepTitle: string;
  readonly instruction: string;
  readonly targetInteractableId: string;
  readonly requiredAssetId: string;
  readonly targetLocationName: string;
  readonly actionVerb: string;
  readonly completionMessage: string;
}

export interface JobRequirements {
  readonly minEnergy: number;
  readonly minHunger?: number;
  readonly requiredTraits?: ReadonlyArray<string>;
  readonly label: string;
}

export interface LegalJobDefinition {
  readonly id: string;
  readonly title: string;
  readonly employerName: string;
  readonly startInteractableId: string;
  readonly employerAssetId: string;
  readonly payGHS: number;
  readonly cooldownSeconds: number;
  readonly requirements: JobRequirements;
  readonly summary: string;
  readonly steps: ReadonlyArray<WorkStepDefinition>;
}

export interface SideHustleDefinition {
  readonly id: string;
  readonly title: string;
  readonly categoryLabel: string;
  readonly startInteractableId: string;
  readonly upfrontCapitalGHS: number;
  readonly grossPayoutGHS: number;
  readonly summary: string;
  readonly steps: ReadonlyArray<WorkStepDefinition>;
}

/** Core legal jobs — 3 steps each, multi-spot walk, clear pay, requirements, and cooldowns. */
export const ACCRA_LEGAL_JOBS: ReadonlyArray<LegalJobDefinition> = [
  {
    id: 'JOB_PROVISIONS_ASSISTANT',
    title: 'Provisions Shop Assistant',
    employerName: 'Adabraka Provision Store & MoMo',
    startInteractableId: 'provision_shop',
    employerAssetId: 'ACC_SHOP_001',
    payGHS: 18.0,
    cooldownSeconds: 45,
    requirements: {
      minEnergy: 20,
      minHunger: 15,
      label: 'Energy ≥ 20 · Hunger ≥ 15'
    },
    summary: 'Load stock, deliver to waakye joint, collect pay.',
    steps: [
      {
        stepId: 'prov_1',
        stepTitle: 'Load crate',
        instruction: 'Load the wholesale crate at the provision store.',
        targetInteractableId: 'provision_shop',
        requiredAssetId: 'ACC_SHOP_001',
        targetLocationName: 'Provision Store',
        actionVerb: 'Load Crate',
        completionMessage: 'Crate loaded. Deliver to waakye joint.'
      },
      {
        stepId: 'prov_2',
        stepTitle: 'Deliver to waakye',
        instruction: 'Deliver the crate to the waakye joint.',
        targetInteractableId: 'food_vendor',
        requiredAssetId: 'ACC_RESTAURANT_001',
        targetLocationName: 'Waakye Joint',
        actionVerb: 'Deliver',
        completionMessage: 'Delivered. Return to the store for pay.'
      },
      {
        stepId: 'prov_3',
        stepTitle: 'Collect wages',
        instruction: 'Return to the provision store and collect ₵18.',
        targetInteractableId: 'provision_shop',
        requiredAssetId: 'ACC_SHOP_001',
        targetLocationName: 'Provision Store',
        actionVerb: 'Collect Pay',
        completionMessage: 'Shift done.'
      }
    ]
  },
  {
    id: 'JOB_WAAKYE_DISPATCH',
    title: 'Waakye Dispatch',
    employerName: 'Sister Akosua’s Waakye & Jollof',
    startInteractableId: 'food_vendor',
    employerAssetId: 'ACC_RESTAURANT_001',
    payGHS: 22.0,
    cooldownSeconds: 60,
    requirements: {
      minEnergy: 30,
      minHunger: 20,
      requiredTraits: ['hustler', 'campus', 'family', 'party'],
      label: 'Energy ≥ 30 · Hunger ≥ 20 · Trait: Hustler / Campus / Family / Party'
    },
    summary: 'Pick packs, drop at trotro, collect pay.',
    steps: [
      {
        stepId: 'waa_1',
        stepTitle: 'Pick packs',
        instruction: 'Pick up dispatch packs at the waakye joint.',
        targetInteractableId: 'food_vendor',
        requiredAssetId: 'ACC_RESTAURANT_001',
        targetLocationName: 'Waakye Joint',
        actionVerb: 'Pick Packs',
        completionMessage: 'Packs ready. Take them to the trotro stop.'
      },
      {
        stepId: 'waa_2',
        stepTitle: 'Drop at trotro',
        instruction: 'Drop packs at the trotro stop.',
        targetInteractableId: 'trotro_stop',
        requiredAssetId: 'ACC_PROP_001',
        targetLocationName: 'Trotro Stop',
        actionVerb: 'Drop Packs',
        completionMessage: 'Dropped. Return to Sister Akosua for pay.'
      },
      {
        stepId: 'waa_3',
        stepTitle: 'Collect wages',
        instruction: 'Return to the waakye joint and collect ₵22.',
        targetInteractableId: 'food_vendor',
        requiredAssetId: 'ACC_RESTAURANT_001',
        targetLocationName: 'Waakye Joint',
        actionVerb: 'Collect Pay',
        completionMessage: 'Shift done.'
      }
    ]
  },
  {
    id: 'JOB_TROTRO_MATE',
    title: 'Trotro Mate',
    employerName: 'Osu–Circle Station',
    startInteractableId: 'trotro_stop',
    employerAssetId: 'ACC_PROP_001',
    payGHS: 15.0,
    cooldownSeconds: 30,
    requirements: {
      minEnergy: 15,
      minHunger: 10,
      label: 'Energy ≥ 15 · Hunger ≥ 10'
    },
    summary: 'Call passengers, fetch water, collect pay.',
    steps: [
      {
        stepId: 'tro_1',
        stepTitle: 'Call passengers',
        instruction: 'At the trotro stop, call passengers for the next bus.',
        targetInteractableId: 'trotro_stop',
        requiredAssetId: 'ACC_PROP_001',
        targetLocationName: 'Trotro Stop',
        actionVerb: 'Call Passengers',
        completionMessage: 'Bus filling. Get water from the provision store.'
      },
      {
        stepId: 'tro_2',
        stepTitle: 'Fetch water',
        instruction: 'Fetch driver water from the provision store.',
        targetInteractableId: 'provision_shop',
        requiredAssetId: 'ACC_SHOP_001',
        targetLocationName: 'Provision Store',
        actionVerb: 'Fetch Water',
        completionMessage: 'Water got. Back to the stop for pay.'
      },
      {
        stepId: 'tro_3',
        stepTitle: 'Collect wages',
        instruction: 'Return to the trotro stop and collect ₵15.',
        targetInteractableId: 'trotro_stop',
        requiredAssetId: 'ACC_PROP_001',
        targetLocationName: 'Trotro Stop',
        actionVerb: 'Collect Pay',
        completionMessage: 'Shift done.'
      }
    ]
  }
];

export const ACCRA_SIDE_HUSTLES: ReadonlyArray<SideHustleDefinition> = [
  {
    id: 'HUSTLE_NEIGHBORHOOD_ERRAND',
    title: 'ECG Prepaid & MoMo Errand Runner',
    categoryLabel: 'Informal Errand · ₵0 Capital',
    startInteractableId: 'npc_older_001',
    upfrontCapitalGHS: 0.0,
    grossPayoutGHS: 10.0,
    summary: 'Run ECG prepaid errand for Uncle Mensah.',
    steps: [
      {
        stepId: 'errand_1',
        stepTitle: 'Get card',
        instruction: 'Collect prepaid card from Uncle Mensah.',
        targetInteractableId: 'npc_older_001',
        requiredAssetId: 'NPC_OLDER_001',
        targetLocationName: 'Uncle Mensah',
        actionVerb: 'Get Card',
        completionMessage: 'Card in hand. Go to MoMo at the store.'
      },
      {
        stepId: 'errand_2',
        stepTitle: 'MoMo token',
        instruction: 'Process token at the provision store MoMo booth.',
        targetInteractableId: 'provision_shop',
        requiredAssetId: 'ACC_SHOP_001',
        targetLocationName: 'Provision Store',
        actionVerb: 'Process Token',
        completionMessage: 'Token ready. Return to Uncle Mensah.'
      },
      {
        stepId: 'errand_3',
        stepTitle: 'Deliver & pay',
        instruction: 'Return the slip to Uncle Mensah and collect ₵10.',
        targetInteractableId: 'npc_older_001',
        requiredAssetId: 'NPC_OLDER_001',
        targetLocationName: 'Uncle Mensah',
        actionVerb: 'Deliver',
        completionMessage: 'Errand done.'
      }
    ]
  },
  {
    id: 'HUSTLE_WATER_HAWKING',
    title: 'Cold Water Trading',
    categoryLabel: 'Trading · ₵5 → ₵16',
    startInteractableId: 'provision_shop',
    upfrontCapitalGHS: 5.0,
    grossPayoutGHS: 16.0,
    summary: 'Buy iced water, sell at trotro and to Kojo.',
    steps: [
      {
        stepId: 'hawk_1',
        stepTitle: 'Buy water',
        instruction: 'Load iced water at the provision store.',
        targetInteractableId: 'provision_shop',
        requiredAssetId: 'ACC_SHOP_001',
        targetLocationName: 'Provision Store',
        actionVerb: 'Load Cooler',
        completionMessage: 'Cooler loaded. Sell at trotro stop.'
      },
      {
        stepId: 'hawk_2',
        stepTitle: 'Sell at trotro',
        instruction: 'Sell water at the trotro stop.',
        targetInteractableId: 'trotro_stop',
        requiredAssetId: 'ACC_PROP_001',
        targetLocationName: 'Trotro Stop',
        actionVerb: 'Sell',
        completionMessage: 'Sold half. Finish with Kojo.'
      },
      {
        stepId: 'hawk_3',
        stepTitle: 'Finish sales',
        instruction: 'Sell the rest to Kojo and collect ₵16.',
        targetInteractableId: 'npc_male_001',
        requiredAssetId: 'NPC_MALE_001',
        targetLocationName: 'Kojo',
        actionVerb: 'Collect',
        completionMessage: 'Sold out.'
      }
    ]
  }
];

export function getLegalJobById(jobId: string): LegalJobDefinition | undefined {
  return ACCRA_LEGAL_JOBS.find((j) => j.id === jobId);
}

export function getSideHustleById(hustleId: string): SideHustleDefinition | undefined {
  return ACCRA_SIDE_HUSTLES.find((h) => h.id === hustleId);
}
