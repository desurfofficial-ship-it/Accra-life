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

export interface LegalJobDefinition {
  readonly id: string;
  readonly title: string;
  readonly employerName: string;
  readonly startInteractableId: string;
  readonly employerAssetId: string;
  readonly payGHS: number;
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

/**
 * Registry of multi-entity Accra neighborhood jobs.
 * Every job requires sequential physical traversal across distinct entities in the 3D block
 * rather than pressing E at a single spot for instant money.
 */
export const ACCRA_LEGAL_JOBS: ReadonlyArray<LegalJobDefinition> = [
  {
    id: 'JOB_PROVISIONS_ASSISTANT',
    title: 'Provisions Shop Assistant',
    employerName: 'Adabraka Provision Store & MoMo',
    startInteractableId: 'provision_shop',
    employerAssetId: 'ACC_SHOP_001',
    payGHS: 18.0,
    summary:
      'Assist the Adabraka Provision Store shopkeeper by offloading wholesale crates and delivering restock supplies to specific businesses and neighbors across the block.',
    steps: [
      {
        stepId: 'prov_step_1_pickup',
        stepTitle: 'Collect Wholesale Supply Crate',
        instruction:
          'Report to the Adabraka Provision Store counter to load the wholesale carton of Peak Milk, Milo, and water.',
        targetInteractableId: 'provision_shop',
        requiredAssetId: 'ACC_SHOP_001',
        targetLocationName: 'Adabraka Provision Store',
        actionVerb: 'Load Wholesale Crate',
        completionMessage:
          'Loaded the wholesale provision crate onto your shoulder. Next: deliver cooking stock to Sister Akosua.'
      },
      {
        stepId: 'prov_step_2_food_joint',
        stepTitle: 'Deliver Cooking Stock to Sister Akosua',
        instruction:
          'Walk east along the North walkway to Sister Akosua’s Waakye & Jollof Joint and hand over her kitchen supplies.',
        targetInteractableId: 'food_vendor',
        requiredAssetId: 'ACC_RESTAURANT_001',
        targetLocationName: 'Sister Akosua’s Waakye Joint',
        actionVerb: 'Deliver Kitchen Provisions',
        completionMessage:
          'Sister Akosua signed for the cooking oil, rice, and tin tomatoes. Next: deliver chilled water to the Trotro Station.'
      },
      {
        stepId: 'prov_step_3_trotro_station',
        stepTitle: 'Deliver Bottled Water to Trotro Station',
        instruction:
          'Cross the street to the Osu–Circle Trotro Station shelter and drop off the drivers’ water pack.',
        targetInteractableId: 'trotro_stop',
        requiredAssetId: 'ACC_PROP_001',
        targetLocationName: 'Osu–Circle Trotro Station',
        actionVerb: 'Drop Off Station Water Pack',
        completionMessage:
          'Station master received the chilled Voltic water pack. Next: deliver Kojo’s prepaid airtime & drink order.'
      },
      {
        stepId: 'prov_step_4_kojo_order',
        stepTitle: 'Hand Off Prepaid & Drink Order to Kojo',
        instruction:
          'Walk back across to the North walkway and deliver Kojo’s airtime voucher and cold malt.',
        targetInteractableId: 'npc_male_001',
        requiredAssetId: 'NPC_MALE_001',
        targetLocationName: 'Kojo · Neighborhood Creative',
        actionVerb: 'Deliver Kojo’s Order',
        completionMessage:
          'Kojo: "Chale, sharp delivery! Tell the shopkeeper everything is intact."'
      },
      {
        stepId: 'prov_step_5_collect_wages',
        stepTitle: 'Sign Ledger & Collect Shift Wages',
        instruction:
          'Return to the Adabraka Provision Store counter to return the signed delivery manifest and collect ₵18.00.',
        targetInteractableId: 'provision_shop',
        requiredAssetId: 'ACC_SHOP_001',
        targetLocationName: 'Adabraka Provision Store',
        actionVerb: 'Sign Off & Collect ₵18.00',
        completionMessage:
          'Provisions Shop Assistant shift complete! You earned ₵18.00 cash.'
      }
    ]
  },
  {
    id: 'JOB_WAAKYE_DISPATCH',
    title: 'Sister Akosua’s Waakye & Jollof Dispatch',
    employerName: 'Sister Akosua’s Food Joint',
    startInteractableId: 'food_vendor',
    employerAssetId: 'ACC_RESTAURANT_001',
    payGHS: 22.0,
    summary:
      'Help Sister Akosua during the busy Accra lunch rush by serving wrapped katemfe-leaf Waakye and shito orders to residents around the street.',
    steps: [
      {
        stepId: 'waakye_step_1_pickup',
        stepTitle: 'Collect Hot Waakye Lunch Orders',
        instruction:
          'Report to Sister Akosua’s glass food showcase counter to pick up the freshly wrapped lunch packs.',
        targetInteractableId: 'food_vendor',
        requiredAssetId: 'ACC_RESTAURANT_001',
        targetLocationName: 'Sister Akosua’s Waakye Joint',
        actionVerb: 'Pick Up Hot Waakye Packs',
        completionMessage:
          'Collected steaming Waakye, fried plantain, wele, and black shito orders.'
      },
      {
        stepId: 'waakye_step_2_ama',
        stepTitle: 'Deliver Lunch Order to Ama',
        instruction:
          'Walk over to Ama on the North-East walkway and hand her the first hot Waakye pack.',
        targetInteractableId: 'npc_female_001',
        requiredAssetId: 'NPC_FEMALE_001',
        targetLocationName: 'Ama · Young Professional',
        actionVerb: 'Hand Waakye Order to Ama',
        completionMessage:
          'Ama: "Mmm, still steaming hot! Sister Akosua’s shito never disappoints."'
      },
      {
        stepId: 'waakye_step_3_mensah',
        stepTitle: 'Deliver Elder’s Meal to Uncle Mensah',
        instruction:
          'Cross to the South pedestrian walkway and deliver Uncle Mensah’s afternoon meal.',
        targetInteractableId: 'npc_older_001',
        requiredAssetId: 'NPC_OLDER_001',
        targetLocationName: 'Uncle Mensah · Community Elder',
        actionVerb: 'Deliver Meal to Uncle Mensah',
        completionMessage:
          'Uncle Mensah: "Medaase, my son! May your hustle prosper in Accra."'
      },
      {
        stepId: 'waakye_step_4_payout',
        stepTitle: 'Return Delivery Tray & Collect Wages',
        instruction:
          'Bring the insulated tray back to Sister Akosua’s counter to receive your ₵22.00 shift pay.',
        targetInteractableId: 'food_vendor',
        requiredAssetId: 'ACC_RESTAURANT_001',
        targetLocationName: 'Sister Akosua’s Waakye Joint',
        actionVerb: 'Return Tray & Collect ₵22.00',
        completionMessage:
          'Waakye dispatch shift completed! Sister Akosua paid you ₵22.00 cash.'
      }
    ]
  },
  {
    id: 'JOB_TROTRO_MATE',
    title: 'Osu–Circle Trotro Mate & Station Loader',
    employerName: 'Osu–Circle Trotro Union',
    startInteractableId: 'trotro_stop',
    employerAssetId: 'ACC_PROP_001',
    payGHS: 15.0,
    summary:
      'Work as a trotro mate calling out the Osu–Circle–Lapaz route, escorting passengers with luggage, and loading waybill parcels onto the minibus.',
    steps: [
      {
        stepId: 'mate_step_1_call',
        stepTitle: 'Call Passengers at Trotro Curb',
        instruction:
          'Go to the Osu–Circle Trotro Station signpost to open the boarding manifest and call "Osu! Circle! 37!"',
        targetInteractableId: 'trotro_stop',
        requiredAssetId: 'ACC_PROP_001',
        targetLocationName: 'Osu–Circle Trotro Station',
        actionVerb: 'Call Osu–Circle Passengers',
        completionMessage:
          'Opened the sliding minibus door and called passengers along the curb.'
      },
      {
        stepId: 'mate_step_2_ama_parcel',
        stepTitle: 'Collect Commuter Luggage from Ama',
        instruction:
          'Walk across to Ama on the North-East walkway to help carry her Osu parcel to the van.',
        targetInteractableId: 'npc_female_001',
        requiredAssetId: 'NPC_FEMALE_001',
        targetLocationName: 'Ama · Young Professional',
        actionVerb: 'Collect Ama’s Osu Parcel',
        completionMessage:
          'Ama: "Thank you chale! Please stow this carefully on the trotro."'
      },
      {
        stepId: 'mate_step_3_shop_waybill',
        stepTitle: 'Pick Up Circle Waybill Box at Provision Store',
        instruction:
          'Walk west to the Adabraka Provision Store counter to pick up the driver’s sealed Circle waybill carton.',
        targetInteractableId: 'provision_shop',
        requiredAssetId: 'ACC_SHOP_001',
        targetLocationName: 'Adabraka Provision Store',
        actionVerb: 'Pick Up Waybill Carton',
        completionMessage:
          'Collected the Circle waybill package from the shopkeeper.'
      },
      {
        stepId: 'mate_step_4_load_and_pay',
        stepTitle: 'Strap Luggage Rack & Collect Mate Pay',
        instruction:
          'Return to the Osu–Circle Trotro Station to tie down the roof cargo and collect your ₵15.00 commission.',
        targetInteractableId: 'trotro_stop',
        requiredAssetId: 'ACC_PROP_001',
        targetLocationName: 'Osu–Circle Trotro Station',
        actionVerb: 'Load Roof Rack & Collect ₵15.00',
        completionMessage:
          'Trotro roof rack secured! The driver paid you ₵15.00 cash.'
      }
    ]
  }
];

export const ACCRA_SIDE_HUSTLES: ReadonlyArray<SideHustleDefinition> = [
  {
    id: 'HUSTLE_NEIGHBORHOOD_ERRAND',
    title: 'ECG Prepaid & MoMo Errand Runner',
    categoryLabel: 'Informal Errand · ₵0 Capital Required',
    startInteractableId: 'npc_older_001',
    upfrontCapitalGHS: 0,
    grossPayoutGHS: 10.0,
    summary:
      'Run an honest neighborhood errand for Uncle Mensah by taking his ECG prepaid electricity card to the MoMo agent booth and returning the printed token slip.',
    steps: [
      {
        stepId: 'errand_step_1_card',
        stepTitle: 'Collect Prepaid Meter Card from Uncle Mensah',
        instruction:
          'Speak with Uncle Mensah on the South walkway to pick up his prepaid meter card.',
        targetInteractableId: 'npc_older_001',
        requiredAssetId: 'NPC_OLDER_001',
        targetLocationName: 'Uncle Mensah · Community Elder',
        actionVerb: 'Pick Up Prepaid Meter Card',
        completionMessage:
          'Uncle Mensah handed you his ECG meter card to top up at the MoMo booth.'
      },
      {
        stepId: 'errand_step_2_momo',
        stepTitle: 'Process Token at Adabraka MoMo Booth',
        instruction:
          'Cross the street to the Adabraka Provision Store & MoMo booth to purchase the electricity token.',
        targetInteractableId: 'provision_shop',
        requiredAssetId: 'ACC_SHOP_001',
        targetLocationName: 'Adabraka Provision Store & MoMo',
        actionVerb: 'Process ECG Prepaid Token',
        completionMessage:
          'The yellow MoMo booth agent printed the 20-digit ECG prepaid token receipt.'
      },
      {
        stepId: 'errand_step_3_return',
        stepTitle: 'Return Token Slip to Uncle Mensah',
        instruction:
          'Walk back to Uncle Mensah on the South walkway to deliver his receipt and receive ₵10.00.',
        targetInteractableId: 'npc_older_001',
        requiredAssetId: 'NPC_OLDER_001',
        targetLocationName: 'Uncle Mensah · Community Elder',
        actionVerb: 'Deliver Receipt & Collect ₵10.00',
        completionMessage:
          'Uncle Mensah: "God bless your hustle!" You received +₵10.00 cash.'
      }
    ]
  },
  {
    id: 'HUSTLE_WATER_HAWKING',
    title: 'Roadside Cold Water & Beverage Trading',
    categoryLabel: 'Small Trading · ₵5.00 Capital → ₵16.00 Return (+₵11.00 Profit)',
    startInteractableId: 'provision_shop',
    upfrontCapitalGHS: 5.0,
    grossPayoutGHS: 16.0,
    summary:
      'Invest ₵5.00 of your earned cash in a wholesale pack of iced water at the provision store and hawk it to thirsty trotro commuters and neighbors for ₵16.00.',
    steps: [
      {
        stepId: 'hawk_step_1_wholesale',
        stepTitle: 'Pick Up Wholesale Iced Water Bundle',
        instruction:
          'Visit Adabraka Provision Store to load your wholesale iced water pack into a head-pan cooler.',
        targetInteractableId: 'provision_shop',
        requiredAssetId: 'ACC_SHOP_001',
        targetLocationName: 'Adabraka Provision Store',
        actionVerb: 'Load Iced Water Cooler',
        completionMessage:
          'Packed ice-cold water bottles into your cooler. Head to the Trotro Station!'
      },
      {
        stepId: 'hawk_step_2_commuters',
        stepTitle: 'Sell Cold Water to Trotro Commuters',
        instruction:
          'Walk to the Osu–Circle Trotro Station and sell chilled water to waiting passengers.',
        targetInteractableId: 'trotro_stop',
        requiredAssetId: 'ACC_PROP_001',
        targetLocationName: 'Osu–Circle Trotro Station',
        actionVerb: 'Sell Water to Commuters',
        completionMessage:
          'Sold half your cooler to passengers boarding the Osu–Circle minibus!'
      },
      {
        stepId: 'hawk_step_3_kojo',
        stepTitle: 'Sell Remaining Bottles on North Walkway',
        instruction:
          'Walk to Kojo on the North walkway to sell the rest of your cooler and collect ₵16.00.',
        targetInteractableId: 'npc_male_001',
        requiredAssetId: 'NPC_MALE_001',
        targetLocationName: 'Kojo · Neighborhood Creative',
        actionVerb: 'Complete Sales & Collect ₵16.00',
        completionMessage:
          'Sold out the entire cooler! Collected ₵16.00 gross sales (+₵11.00 net profit).'
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
