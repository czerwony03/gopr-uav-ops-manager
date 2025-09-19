/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import {setGlobalOptions} from "firebase-functions/v2";
import {beforeUserCreated} from "firebase-functions/v2/identity";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {defineSecret} from "firebase-functions/params";
import {onRequest} from "firebase-functions/v2/https";

admin.initializeApp();

setGlobalOptions({maxInstances: 10});

const MIGRATION_TOKEN = defineSecret("MIGRATION_TOKEN");

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

export const runMigrations = onRequest({
  secrets: [MIGRATION_TOKEN],
}, async (req, res) => {
  try {
    const token = req.query.token as string;
    if (token !== MIGRATION_TOKEN.value()) {
      res.status(403).send("Forbidden");
      return;
    }

    const migrationsDir = path.join(__dirname, "migrations");
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".js"));

    files.sort(); // assumes YYYY-MM-DD prefix

    const executedSnap = await admin.firestore().collection("migrations").get();
    const executedIds = executedSnap.docs.map((d) => d.id);

    const results: unknown[] = [];

    for (const file of files) {
      const id = path.basename(file, ".js");

      if (executedIds.includes(id)) {
        console.log(`⏭ Skipping ${id} (already executed)`);
        continue;
      }

      console.log(`🚀 Executing migration: ${id}`);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const migration = require(path.join(migrationsDir, file));

      const start = Date.now();
      const result = await migration.run();

      await admin.firestore().collection("migrations").doc(id).set({
        executedAt: admin.firestore.FieldValue.serverTimestamp(),
        durationMs: Date.now() - start,
        result: result || {},
      });

      results.push({id, result});
    }

    res.json({
      status: "done",
      executed: results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Migration runner failed ❌");
  }
});
