import * as admin from "firebase-admin";

// noinspection JSUnusedGlobalSymbols
export async function run() {
  const db = admin.firestore();

  const DEFAULT_CATEGORY_ID = "uncategorized";
  const DEFAULT_CATEGORY = {
    name: "Uncategorized",
    description: "Default category for procedures without specific categorization",
    color: "#6B7280", // Gray
    order: 9999,      // Show at the end
    createdBy: "system",
    updatedBy: "system",
    isDeleted: false,
    deletedAt: null,
  };

  const docRef = db.collection("categories").doc(DEFAULT_CATEGORY_ID);
  const existing = await docRef.get();

  if (existing.exists) {
    console.log(`✅ Default category "${DEFAULT_CATEGORY_ID}" already exists`);
    return {created: false};
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  await docRef.set({
    ...DEFAULT_CATEGORY,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`🚀 Created default category "${DEFAULT_CATEGORY_ID}"`);
  return {created: true};
}
