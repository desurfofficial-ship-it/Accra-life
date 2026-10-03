/**
 * Security Rules Verification Suite — "Dirty Dozen" Adversarial Payloads
 * Verifies that all 12 attack vectors against `/users/{userId}` and `/publicProfiles/{userId}`
 * are strictly rejected with PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

const VALID_BASE_SAVE = {
  ownerId: 'user_A',
  playerId: 'accra_user_A',
  name: 'Kwesi',
  career: 'developer',
  location: 'home',
  day: 1,
  time: 0,
  money: 180,
  hunger: 75,
  energy: 85,
  happy: 65,
  social: 45,
  health: 90,
  amaAffinity: 42,
  kofiAffinity: 38,
  abenaAffinity: 55,
  kwameAffinity: 33,
  efuaAffinity: 48,
  amaMoney: 240,
  kofiMoney: 160,
  abenaMoney: 340,
  kwameMoney: 95,
  efuaMoney: 190,
  recentLogs: ['Day 1: Welcome Kwesi.'],
  createdAt: '__SERVER_TIMESTAMP__',
  updatedAt: '__SERVER_TIMESTAMP__',
};

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on UserSave Create (ownerId mismatch)',
    operation: 'create',
    path: '/users/user_A',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ...VALID_BASE_SAVE, ownerId: 'user_B' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-Tenant Save Overwrite (writing to another user document)',
    operation: 'create',
    path: '/users/user_B',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ...VALID_BASE_SAVE, ownerId: 'user_A' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Spoof (email_verified is false)',
    operation: 'create',
    path: '/users/user_A',
    auth: { uid: 'user_A', email_verified: false },
    payload: { ...VALID_BASE_SAVE },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow / Ghost Field Injection on Create',
    operation: 'create',
    path: '/users/user_A',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ...VALID_BASE_SAVE, isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow / Ghost Field Injection on Update',
    operation: 'update',
    path: '/users/user_A',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ...VALID_BASE_SAVE, vipBonus: 999999 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Value Poisoning on Whitelisted Key (string instead of int for money)',
    operation: 'update',
    path: '/users/user_A',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ...VALID_BASE_SAVE, money: 'infinite_gold' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Resource Exhaustion / Oversized String (> 32 chars for name)',
    operation: 'create',
    path: '/users/user_A',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ...VALID_BASE_SAVE, name: 'A'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Unbounded Array Poisoning (> 20 items in recentLogs)',
    operation: 'create',
    path: '/users/user_A',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ...VALID_BASE_SAVE, recentLogs: Array.from({ length: 50 }, (_, i) => `Log ${i}`) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable Field Tampering on Update (modifying ownerId)',
    operation: 'update',
    path: '/users/user_A',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ...VALID_BASE_SAVE, ownerId: 'user_hijacked' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Forged Client Timestamp (updatedAt != request.time)',
    operation: 'update',
    path: '/users/user_A',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ...VALID_BASE_SAVE, updatedAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized Private Save Read by Non-Owner',
    operation: 'get',
    path: '/users/user_A',
    auth: { uid: 'user_B', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthorized Collection Listing (Scraping Attack)',
    operation: 'list',
    path: '/users',
    auth: { uid: 'user_A', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
];
