import * as admin from "firebase-admin";

// noinspection JSUnusedGlobalSymbols
export async function run() {
  const db = admin.firestore();

  const CATEGORIES_LAST_UPDATE_DOC = "categoriesLastUpdate";
  const PROCEDURES_LAST_UPDATE_DOC = "proceduresLastUpdate";

  console.log("🚀 Initializing AppSettings collection...");

  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();

  // Initialize categories timestamp document
  const categoriesDocRef = db.collection("appsettings").doc(CATEGORIES_LAST_UPDATE_DOC);
  const categoriesDoc = await categoriesDocRef.get();
  
  if (!categoriesDoc.exists) {
    batch.set(categoriesDocRef, {
      timestamp: now,
      updatedAt: now,
      description: "Tracks the last update timestamp for categories collection"
    });
    console.log(`✅ Will create ${CATEGORIES_LAST_UPDATE_DOC} document`);
  } else {
    console.log(`⏭ ${CATEGORIES_LAST_UPDATE_DOC} document already exists`);
  }

  // Initialize procedures timestamp document
  const proceduresDocRef = db.collection("appsettings").doc(PROCEDURES_LAST_UPDATE_DOC);
  const proceduresDoc = await proceduresDocRef.get();
  
  if (!proceduresDoc.exists) {
    batch.set(proceduresDocRef, {
      timestamp: now,
      updatedAt: now,
      description: "Tracks the last update timestamp for procedures collection"
    });
    console.log(`✅ Will create ${PROCEDURES_LAST_UPDATE_DOC} document`);
  } else {
    console.log(`⏭ ${PROCEDURES_LAST_UPDATE_DOC} document already exists`);
  }

  // Execute batch write
  await batch.commit();

  console.log("🎉 AppSettings collection initialization completed");
  
  return {
    categoriesDocumentCreated: !categoriesDoc.exists,
    proceduresDocumentCreated: !proceduresDoc.exists
  };
}