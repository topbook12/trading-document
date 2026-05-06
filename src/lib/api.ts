import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from './firebase';
import { JournalEntry } from '../types';

const COLLECTION_NAME = 'journal_entries';

export async function uploadMedia(file: File, userId: string): Promise<string> {
  try {
    const ext = file.name.split('.').pop();
    const filename = `users/${userId}/media/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    
    // 1. Get presigned URL from backend
    const response = await fetch('/api/presign-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        filename: filename, 
        contentType: file.type || 'application/octet-stream' 
      }),
    });
    
    if (!response.ok) {
        throw new Error('Failed to get presigned URL for upload');
    }
    
    const { presignedUrl } = await response.json();
    
    // 2. Upload file to R2 bucket via presigned URL
    const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
    });
    
    if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
    }
    
    // 3. Return the public URL for the newly uploaded file
    const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-9a081087a57b4229b02c4b418e5cddae.r2.dev';
    return `${R2_PUBLIC_URL}/${filename}`;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
}

export async function createJournalEntry(entry: Omit<JournalEntry, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), entry);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTION_NAME);
    return '';
  }
}

export async function getJournalEntries(userId: string): Promise<JournalEntry[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      // order by is requiring compound index if we combine with where? 
      // where userId == UID and orderBy created_at. We will order on client side to avoid needing composite index creation config.
    );
    const querySnapshot = await getDocs(q);
    const entries: JournalEntry[] = [];
    querySnapshot.forEach((doc) => {
      entries.push({ id: doc.id, ...doc.data() } as JournalEntry);
    });
    // client side sort
    return entries.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
    return [];
  }
}

export async function deleteJournalEntry(entryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${entryId}`);
  }
}
