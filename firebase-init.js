// Import Firebase modules
import { initializeApp as initializeFirebaseApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signInAnonymously,
    onAuthStateChanged,
    signOut,
    signInWithEmailAndPassword // Added for email/password admin login
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    collection,
    query,
    where,
    addDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase configuration (DO NOT EDIT if provided by environment)
const firebaseConfig = {
    apiKey: "AIzaSyCrERohH3MOKMCsZQiu6W0xLU5gsE1AyhI", // Replace with your actual API key if not using environment variable
    authDomain: "dataschool185.firebaseapp.com",
    projectId: "dataschool185",
    storageBucket: "dataschool185.firebasestorage.app",
    messagingSenderId: "992145631724",
    appId: "1:992145631724:web:adf28feec2d32f3938f8c9",
    measurementId: "G-ZKCCY5GVCR"
};

// Global Firebase instances
let db, auth;
let currentUserId = null; // Renamed from userId to avoid conflict with global scope if any
let isAuthReady = false;

// --- Firebase Initialization and Auth State Handling ---

/**
 * Initializes Firebase app, auth, and Firestore.
 * Sets up an authentication state listener.
 * This function should be called once when the application starts.
 */
function initializeFirebaseServices() {
    // Initialize Firebase App
    const app = initializeFirebaseApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase services initialized.");

    // Firebase Auth State Change Listener
    onAuthStateChanged(auth, (user) => {
        isAuthReady = true; // Mark auth as ready once the first check completes
        if (user) {
            // User is signed in.
            currentUserId = user.uid;
            console.log("User is signed in:", currentUserId);

            // Check if the signed-in user is the designated admin
            if (typeof teacherProfile !== 'undefined' && typeof ADMIN_UID !== 'undefined') {
                if (currentUserId === ADMIN_UID) {
                    if (!teacherProfile.isAdmin) {
                        teacherProfile.isAdmin = true;
                        // UI updates for admin login status should be handled in the main script
                        // e.g., by calling a function like updateAdminLoginButtonUI(true);
                        console.log("Admin user detected and logged in via Firebase Auth.");
                         if (typeof updateAdminView === 'function') updateAdminView();
                         if (typeof showToast === 'function') showToast("ผู้ดูแลระบบล็อกอินอัตโนมัติแล้ว", "success");
                    }
                } else {
                    // A non-admin user is signed in.
                    if (teacherProfile.isAdmin) { // If UI still shows admin, but current user is not admin, reset.
                        teacherProfile.isAdmin = false;
                        // UI updates for admin logout status
                        // e.g., updateAdminLoginButtonUI(false);
                        console.log("Non-admin user signed in. Resetting admin status if it was active.");
                        if (typeof updateAdminView === 'function') updateAdminView();
                    }
                }
            } else {
                console.warn("teacherProfile or ADMIN_UID is not defined. Admin status check skipped.");
            }

            // Call the main application logic initialization function
            // This function should be defined in your main script (e.g., script.js)
            if (typeof initializeAppLogic === 'function') {
                initializeAppLogic();
            } else {
                console.warn("initializeAppLogic function not found. Main app logic might not run.");
            }

        } else {
            // User is signed out.
            console.log("User is signed out.");
            currentUserId = null;

            if (typeof teacherProfile !== 'undefined' && teacherProfile.isAdmin) { // Clear admin state if admin was logged in
                teacherProfile.isAdmin = false;
                // UI updates for admin logout
                // e.g., updateAdminLoginButtonUI(false);
                console.log("Admin user signed out. Resetting admin status.");
                if (typeof updateAdminView === 'function') updateAdminView();
            }

            // Attempt anonymous sign-in to allow app functionality for non-admins
            signInAnonymously(auth)
                .then((anonymousUserCredential) => {
                    currentUserId = anonymousUserCredential.user.uid;
                    console.log('Signed in anonymously with UID:', currentUserId);
                    if (typeof initializeAppLogic === 'function') {
                        initializeAppLogic(); // Call main app logic for anonymous user
                    }
                })
                .catch((error) => {
                    console.error('Anonymous sign-in error:', error);
                    // Handle critical error if anonymous sign-in fails
                    // For now, let's proceed with a fallback UUID.
                    if (!currentUserId) {
                        currentUserId = crypto.randomUUID(); // Fallback if needed
                        console.warn("Using fallback UUID due to anonymous sign-in error.");
                    }
                    if (typeof initializeAppLogic === 'function') {
                        initializeAppLogic();
                    }
                });
        }
    });
}

// --- Admin Authentication Functions ---

/**
 * Handles Google Sign-In for Admin.
 * @param {string} adminUID - The UID of the designated admin user.
 * @returns {Promise<User|null>} Firebase User object if admin login is successful, null otherwise.
 */
async function signInAdminWithGoogle(adminUID) {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        if (user.uid === adminUID) {
            console.log("Admin Google Sign-In successful:", user.uid);
            // teacherProfile.isAdmin and UI updates will be handled by onAuthStateChanged
            return user;
        } else {
            console.warn("Google Sign-In successful, but user is not the designated admin.");
            await signOut(auth); // Sign out the non-admin user
            return null;
        }
    } catch (error) {
        console.error("Google Sign-In error for admin:", error);
        // Handle specific errors like popup closed, etc.
        if (error.code === 'auth/popup-closed-by-user') {
            // User closed the popup
        } else if (error.code === 'auth/cancelled-popup-request') {
            // Multiple popups
        }
        return null; // Indicate failure
    }
}


/**
 * Handles Admin Sign Out.
 * @returns {Promise<void>}
 */
async function signOutAdmin() {
    try {
        await signOut(auth);
        console.log("Admin signed out successfully.");
        // teacherProfile.isAdmin and UI updates will be handled by onAuthStateChanged
    } catch (error) {
        console.error("Admin Sign Out error:", error);
    }
}

// --- Firestore Data Operations (Examples - Adapt as needed) ---

/**
 * Fetches a document from Firestore.
 * @param {string} collectionName - The name of the collection.
 * @param {string} documentId - The ID of the document.
 * @returns {Promise<object|null>} The document data or null if not found/error.
 */
async function getDocument(collectionName, documentId) {
    if (!db || !isAuthReady) {
        console.error("Firestore not initialized or auth not ready for getDocument.");
        return null;
    }
    try {
        const docRef = doc(db, collectionName, documentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log("Document data:", docSnap.data());
            return docSnap.data();
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error) {
        console.error("Error getting document:", error);
        return null;
    }
}

/**
 * Sets (overwrites or creates) a document in Firestore.
 * @param {string} collectionName - The name of the collection.
 * @param {string} documentId - The ID of the document.
 * @param {object} data - The data to set.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function setDocument(collectionName, documentId, data) {
    if (!db || !isAuthReady) {
        console.error("Firestore not initialized or auth not ready for setDocument.");
        return false;
    }
    try {
        await setDoc(doc(db, collectionName, documentId), data);
        console.log("Document successfully written!");
        return true;
    } catch (error) {
        console.error("Error writing document: ", error);
        return false;
    }
}

/**
 * Adds a new document to a collection with an auto-generated ID.
 * @param {string} collectionName - The name of the collection.
 * @param {object} data - The data for the new document.
 * @returns {Promise<string|null>} The ID of the new document or null on error.
 */
async function addDocument(collectionName, data) {
    if (!db || !isAuthReady) {
        console.error("Firestore not initialized or auth not ready for addDocument.");
        return null;
    }
    try {
        const docRef = await addDoc(collection(db, collectionName), data);
        console.log("Document written with ID: ", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding document: ", error);
        return null;
    }
}

/**
 * Updates an existing document in Firestore.
 * @param {string} collectionName - The name of the collection.
 * @param {string} documentId - The ID of the document to update.
 * @param {object} data - The data to update (fields to merge).
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function updateDocument(collectionName, documentId, data) {
    if (!db || !isAuthReady) {
        console.error("Firestore not initialized or auth not ready for updateDocument.");
        return false;
    }
    try {
        const docRef = doc(db, collectionName, documentId);
        await updateDoc(docRef, data);
        console.log("Document successfully updated!");
        return true;
    } catch (error) {
        console.error("Error updating document: ", error);
        return false;
    }
}

/**
 * Deletes a document from Firestore.
 * @param {string} collectionName - The name of the collection.
 * @param {string} documentId - The ID of the document to delete.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
async function deleteDocument(collectionName, documentId) {
    if (!db || !isAuthReady) {
        console.error("Firestore not initialized or auth not ready for deleteDocument.");
        return false;
    }
    try {
        await deleteDoc(doc(db, collectionName, documentId));
        console.log("Document successfully deleted!");
        return true;
    } catch (error) {
        console.error("Error deleting document: ", error);
        return false;
    }
}

/**
 * Queries documents from a collection.
 * @param {string} collectionName - The name of the collection.
 * @param {Array} queryConstraints - Array of query constraints (e.g., where("field", "==", "value")).
 * @returns {Promise<Array<object>>} Array of document data or empty array if no results/error.
 */
async function queryDocuments(collectionName, ...queryConstraints) {
    if (!db || !isAuthReady) {
        console.error("Firestore not initialized or auth not ready for queryDocuments.");
        return [];
    }
    try {
        const q = query(collection(db, collectionName), ...queryConstraints);
        const querySnapshot = await getDocs(q);
        const documents = [];
        querySnapshot.forEach((doc) => {
            documents.push({ id: doc.id, ...doc.data() });
        });
        console.log(`Found ${documents.length} documents for query.`);
        return documents;
    } catch (error) {
        console.error("Error querying documents: ", error);
        return [];
    }
}

/**
 * Sets up a real-time listener for a document.
 * @param {string} collectionName - The name of the collection.
 * @param {string} documentId - The ID of the document.
 * @param {function} callback - Function to call with document data on changes.
 * @returns {function} Unsubscribe function to stop listening.
 */
function onDocumentSnapshot(collectionName, documentId, callback) {
    if (!db || !isAuthReady) {
        console.error("Firestore not initialized or auth not ready for onDocumentSnapshot.");
        return () => {}; // Return a no-op unsubscribe function
    }
    const unsub = onSnapshot(doc(db, collectionName, documentId), (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() });
        } else {
            callback(null); // Document does not exist
        }
    }, (error) => {
        console.error("Error in onDocumentSnapshot listener: ", error);
        callback(null, error); // Pass error to callback
    });
    return unsub; // Return the unsubscribe function
}

/**
 * Sets up a real-time listener for a collection query.
 * @param {string} collectionName - The name of the collection.
 * @param {function} callback - Function to call with an array of document data on changes.
 * @param {Array} queryConstraints - Array of query constraints.
 * @returns {function} Unsubscribe function to stop listening.
 */
function onCollectionSnapshot(collectionName, callback, ...queryConstraints) {
    if (!db || !isAuthReady) {
        console.error("Firestore not initialized or auth not ready for onCollectionSnapshot.");
        return () => {}; // Return a no-op unsubscribe function
    }
    const q = query(collection(db, collectionName), ...queryConstraints);
    const unsub = onSnapshot(q, (querySnapshot) => {
        const documents = [];
        querySnapshot.forEach((doc) => {
            documents.push({ id: doc.id, ...doc.data() });
        });
        callback(documents);
    }, (error) => {
        console.error("Error in onCollectionSnapshot listener: ", error);
        callback([], error); // Pass error to callback
    });
    return unsub; // Return the unsubscribe function
}


// --- Security Rules (Conceptual - Implement in Firebase Console) ---
// These are conceptual examples. Actual security rules are configured in the Firebase console.
//
// Allow read for all, write only for authenticated users (example):
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /{document=**} {
//       allow read: if true;
//       allow write: if request.auth != null;
//     }
//   }
// }
//
// More specific rules for a 'students' collection (example):
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /students/{studentId} {
//       allow read: if true; // Anyone can read student data
//       allow create, update, delete: if request.auth != null && request.auth.uid == resource.data.teacherId; // Only the assigned teacher can modify
//                                     // Or an admin (requires adding an admin role check)
//                                     // allow write: if request.auth != null && (request.auth.uid == resource.data.teacherId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
//     }
//     match /users/{userId} {
//       allow read, write: if request.auth != null && request.auth.uid == userId; // User can read/write their own user document
//     }
//   }
// }

// --- Call Initialization ---
// This should be called when your main script is ready for Firebase.
// For example, at the beginning of your script.js or app.js.
// initializeFirebaseServices(); // Moved to be called by the main script after DOM is ready or similar.

// Export functions and variables to be used by other scripts
export {
    auth, // Firebase Auth instance
    db,   // Firestore instance
    currentUserId, // UID of the currently signed-in user (or null)
    isAuthReady, // Boolean indicating if the initial auth state check has completed
    initializeFirebaseServices,
    signInAdminWithGoogle,
    signOutAdmin,
    getDocument,
    setDocument,
    addDocument,
    updateDocument,
    deleteDocument,
    queryDocuments,
    onDocumentSnapshot,
    onCollectionSnapshot,
    GoogleAuthProvider, // Export if needed directly by other modules
    signInWithEmailAndPassword, // Export for admin email/password login
    signOut as firebaseSignOut // Export generic signOut
};
