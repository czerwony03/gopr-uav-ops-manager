/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from "firebase-admin";
import {setGlobalOptions} from "firebase-functions/v2";
import {beforeUserCreated} from "firebase-functions/v2/identity";
import {onDocumentWritten} from "firebase-functions/v2/firestore";

admin.initializeApp();

setGlobalOptions({maxInstances: 10});

export const beforeCreate = beforeUserCreated(async (event) => {
  const user = event.data;

  if (!user?.email?.includes("@bieszczady.gopr.pl")) {
    throw new Error("permission-denied");
  }
});

export const syncUserRole = onDocumentWritten("users/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const after = event.data?.after?.data();

    if (!after) return; // doc deleted

    const {role, firstname, surname} = after;

    // 1️⃣ Update custom claims
    if (["admin", "manager", "user"].includes(role)) {
      try {
        await admin.auth().setCustomUserClaims(userId, {role});
        console.log(`Updated ${userId} → role: ${role}`);
      } catch (err) {
        console.error(`Failed to update role for ${userId}`, err);
      }
    }

    // 2️⃣ Update public user data
    try {
      await admin.firestore().doc(`publicUsers/${userId}`).set(
        {
          firstname: firstname || "",
          surname: surname || "",
        },
        {
          merge: true,
        } // merge ensures we don't overwrite other fields
      );
      console.log(`Updated publicUsers/${userId} with firstname & surname`);
    } catch (err) {
      console.error(`Failed to update public user data for ${userId}`, err);
    }
  },
);

