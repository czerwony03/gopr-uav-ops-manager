/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions/v2";
import {beforeUserCreated} from "firebase-functions/v2/identity";

setGlobalOptions({maxInstances: 10});

export const beforeCreate = beforeUserCreated((event) => {
  const user = event.data;

  if (!user?.email?.includes("@bieszczady.gopr.pl")) {
    throw new Error("permission-denied");
  }
});
