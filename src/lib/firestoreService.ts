import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy,
  writeBatch
} from "firebase/firestore";
import { db } from "./firebaseAuth";
import { Conversation, Message } from "../types";

// Helper to safely convert any firestore/string date back to a standard JavaScript Date object
const toDate = (val: any): Date => {
  if (!val) return new Date();
  if (typeof val.toDate === "function") return val.toDate(); // Firestore Timestamp
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  return new Date();
};

/**
 * Saves a conversation to Firestore under the user's subcollection:
 * users/{uid}/conversations/{conversationId}
 */
export const saveUserConversation = async (uid: string, conv: Conversation): Promise<void> => {
  if (!uid) return;
  try {
    const docRef = doc(db, "users", uid, "conversations", conv.id);
    
    // Normalize messages and convert Date objects to standard forms
    const messagesNormalized = conv.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content || "",
      timestamp: toDate(m.timestamp),
      attachments: m.attachments || []
    }));

    await setDoc(docRef, {
      id: conv.id,
      title: conv.title || "New Session",
      createdAt: toDate(conv.createdAt),
      messages: messagesNormalized,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error(`Error saving conversation ${conv.id} for user ${uid}:`, error);
    throw error;
  }
};

/**
 * Deletes a conversation from Firestore for the user
 */
export const deleteUserConversation = async (uid: string, convId: string): Promise<void> => {
  if (!uid || !convId) return;
  try {
    const docRef = doc(db, "users", uid, "conversations", convId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting conversation ${convId} for user ${uid}:`, error);
    throw error;
  }
};

/**
 * Loads all conversations for a specific user from Firestore
 */
export const getUserConversations = async (uid: string): Promise<Conversation[]> => {
  if (!uid) return [];
  try {
    const colRef = collection(db, "users", uid, "conversations");
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    const conversations: Conversation[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      const messages: Message[] = (data.messages || []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content || "",
        timestamp: toDate(m.timestamp),
        attachments: m.attachments || []
      }));

      conversations.push({
        id: data.id || docSnap.id,
        title: data.title || "Untitled Session",
        createdAt: toDate(data.createdAt),
        messages: messages
      });
    });

    // Ensure we sort by createdAt descending just in case query ordering had issues
    return conversations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error(`Error loading conversations for user ${uid}:`, error);
    throw error;
  }
};

/**
 * Transfers all conversations from an anonymous UID to a Google UID
 */
export const transferUserConversations = async (fromUid: string, toUid: string): Promise<void> => {
  if (!fromUid || !toUid || fromUid === toUid) return;
  try {
    const fromColRef = collection(db, "users", fromUid, "conversations");
    const snapshot = await getDocs(fromColRef);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const targetDocRef = doc(db, "users", toUid, "conversations", docSnap.id);
      
      // Copy to new location
      batch.set(targetDocRef, {
        ...data,
        updatedAt: new Date()
      });
      
      // Delete old document
      const sourceDocRef = doc(db, "users", fromUid, "conversations", docSnap.id);
      batch.delete(sourceDocRef);
    });

    await batch.commit();
    console.log(`Successfully transferred conversations from ${fromUid} to ${toUid}`);
  } catch (error) {
    console.error(`Error transferring conversations from ${fromUid} to ${toUid}:`, error);
    throw error;
  }
};
