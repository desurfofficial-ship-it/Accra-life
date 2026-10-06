/**
 * Accra Life — Server-side Janitor Cloud Function
 *
 * Scheduled function that runs every 5 minutes. Deletes stale /presence
 * docs (lastSeenAt older than 5 minutes) to keep the presence collection
 * clean. Without this, players who close their tab without firing
 * pagehide leave ghost presence docs that other players see as "online"
 * for up to 60s (the client-side stale threshold).
 *
 * Deployment:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login: firebase login
 * 3. cd to the project root
 * 4. Deploy: firebase deploy --only functions:janitorPresence
 *
 * The function uses the Firestore Admin SDK to query + batch-delete.
 * No client-side changes needed — this runs server-side.
 */

import * as functions from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, WriteBatch } from 'firebase-admin/firestore';

const app = initializeApp();
const db = getFirestore(app);

/** Max age of a presence doc before it's considered stale (ms). */
const STALE_MS = 5 * 60 * 1000; // 5 minutes
/** Max docs to delete per run (Firestore batch limit is 500). */
const BATCH_LIMIT = 450;

export const janitorPresence = functions.onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'Africa/Accra',
    memory: '256MiB',
  },
  async () => {
    const cutoff = Date.now() - STALE_MS;
    const snap = await db
      .collection('presence')
      .where('lastSeenAt', '<', cutoff)
      .limit(BATCH_LIMIT)
      .get();

    if (snap.empty) {
      console.log('[janitor] No stale presence docs found.');
      return;
    }

    const batch: WriteBatch = db.batch();
    let count = 0;
    snap.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();
    console.log(`[janitor] Deleted ${count} stale presence docs (cutoff: ${new Date(cutoff).toISOString()})`);
  }
);
