// firebase.js
// ไฟล์นี้จัดการการเริ่มต้น Firebase, การยืนยันตัวตน, และการเข้าถึง Firestore

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInAnonymously, 
    onAuthStateChanged, 
    signOut,
    signInWithEmailAndPassword // เพิ่มการนำเข้าสำหรับ signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    addDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    collection, 
    query, 
    where, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// กำหนด UID ของผู้ดูแลระบบ (Admin)
// คุณควรเปลี่ยนค่านี้เป็น UID จริงของผู้ดูแลระบบของคุณใน Firebase Authentication
// และตรวจสอบให้แน่ใจว่าผู้ดูแลระบบของคุณมีบทบาท 'admin' ใน Firestore
export const ADMIN_UID = "De4FbjpF4uYHGOjV8HzKuK0M2Wm2"; 

// กำหนดค่า Firebase Project ของคุณ
// ค่าเหล่านี้จะถูกแทนที่โดย Canvas Environment ในรันไทม์ หากมีการตั้งค่าไว้
// หากไม่มีการตั้งค่าใน Canvas Environment จะใช้ค่าเริ่มต้นที่ระบุไว้
const firebaseConfig = {
    apiKey: typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).apiKey : "AIzaSyCrERohH3MOKMCsZQiu6W0xLU5gsE1AyhI",
    authDomain: typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).authDomain : "dataschool185.firebaseapp.com",
    projectId: typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).projectId : "dataschool185",
    storageBucket: typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).storageBucket : "dataschool185.firebasestorage.app",
    messagingSenderId: typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).messagingSenderId : "992145631724",
    appId: typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).appId : "1:992145631724:web:adf28feec2d32f3938f8c9",
    measurementId: typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config).measurementId : "G-ZKCCY5GVCR"
};

// ตรวจสอบและกำหนด __app_id
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// เริ่มต้น Firebase App
const app = initializeApp(firebaseConfig);

// รับ Instance ของ Firebase Authentication และ Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

// ตัวแปรสำหรับเก็บ User ID และสถานะการยืนยันตัวตน
export let userId = null;
export let isAuthReady = false;

// ตัวแปรสำหรับเก็บข้อมูลโปรไฟล์ครู (จะโหลดจาก Firestore ในภายหลัง)
export let teacherProfile = {
    id: 'T001', // รหัสเริ่มต้น
    name: 'คุณครูใจดี', // ชื่อเริ่มต้น
    isAdmin: false, // สถานะผู้ดูแลระบบ
    responsibleClasses: [] // ห้องเรียนที่รับผิดชอบ
};

// Listener สำหรับสถานะการยืนยันตัวตนของ Firebase
// ฟังก์ชันนี้จะทำงานทุกครั้งที่สถานะการล็อกอินมีการเปลี่ยนแปลง
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // ผู้ใช้ล็อกอินอยู่
        userId = user.uid;
        console.log("User is signed in:", userId);
        isAuthReady = true;

        // โหลดข้อมูลโปรไฟล์ครูจาก Firestore
        const userDocRef = doc(db, `artifacts/${appId}/users`, userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            teacherProfile = { ...userDocSnap.data(), id: userId };
            console.log("Teacher profile loaded:", teacherProfile);
        } else {
            // หากไม่มีโปรไฟล์ผู้ใช้ ให้สร้างโปรไฟล์เริ่มต้น
            // หรืออาจจะกำหนดให้ผู้ใช้ต้องกรอกข้อมูลโปรไฟล์เมื่อเข้าสู่ระบบครั้งแรก
            teacherProfile = {
                id: userId,
                name: `ผู้ใช้งาน ${userId.substring(0, 5)}`,
                isAdmin: (userId === ADMIN_UID), // กำหนด admin หากเป็น UID ที่ระบุ
                responsibleClasses: []
            };
            await setDoc(userDocRef, teacherProfile, { merge: true });
            console.log("New teacher profile created:", teacherProfile);
        }

        // อัปเดตสถานะ isAdmin ตาม UID หรือบทบาทใน Firestore
        if (teacherProfile.isAdmin || userId === ADMIN_UID) {
            teacherProfile.isAdmin = true;
        } else {
            teacherProfile.isAdmin = false;
        }

        // ตรวจสอบว่ามี __initial_auth_token หรือไม่ หากมีให้ใช้เพื่อล็อกอิน
        // (ส่วนนี้มักใช้ในการเริ่มต้นแอปใน Canvas Environment)
        if (typeof __initial_auth_token !== 'undefined' && user.isAnonymous) {
            try {
                await auth.signInWithCustomToken(auth, __initial_auth_token);
                console.log("Signed in with custom token.");
            } catch (error) {
                console.error("Error signing in with custom token:", error);
            }
        }

        // เรียกฟังก์ชันเริ่มต้นแอปพลิเคชันหลัก (จะถูกกำหนดในไฟล์อื่น)
        // ตรวจสอบว่า initializeAppLogic ถูกกำหนดไว้ก่อนเรียกใช้
        if (typeof window.initializeAppLogic === 'function') {
            window.initializeAppLogic();
        } else {
            console.warn("initializeAppLogic is not defined yet. Ensure it's loaded after firebase.js.");
        }

    } else {
        // ผู้ใช้ออกจากระบบ
        console.log("User is signed out.");
        userId = null;
        isAuthReady = true; // สถานะการยืนยันตัวตนเป็นที่ทราบ (ออกจากระบบแล้ว)

        // รีเซ็ตโปรไฟล์ครู
        teacherProfile = {
            id: 'T001',
            name: 'คุณครูใจดี',
            isAdmin: false,
            responsibleClasses: []
        };

        // พยายามล็อกอินแบบไม่ระบุตัวตน (Anonymous) เพื่อให้แอปทำงานได้สำหรับผู้ใช้ทั่วไป
        try {
            const anonymousUserCredential = await signInAnonymously(auth);
            userId = anonymousUserCredential.user.uid;
            console.log('Signed in anonymously with UID:', userId);
             if (typeof window.initializeAppLogic === 'function') {
                window.initializeAppLogic();
            }
        } catch (error) {
            console.error('Anonymous sign-in error:', error);
            // หากการล็อกอินแบบไม่ระบุตัวตนล้มเหลว ให้ใช้ UUID สำรอง
            if (!userId) {
                userId = crypto.randomUUID();
                console.warn("Using fallback UUID due to anonymous sign-in error.");
            }
             if (typeof window.initializeAppLogic === 'function') {
                window.initializeAppLogic();
            }
        }
    }
});

// ฟังก์ชันสำหรับล็อกอินผู้ดูแลระบบด้วย Google
export const signInAdminWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        // onAuthStateChanged จะจัดการการตรวจสอบ UID และอัปเดต UI
        return result.user;
    } catch (error) {
        console.error("Google Sign-In error:", error);
        throw error;
    }
};

// ฟังก์ชันสำหรับล็อกอินผู้ดูแลระบบด้วย Email/Password (หากมี)
export const signInAdminWithEmail = async (email, password) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged จะจัดการการตรวจสอบ UID และอัปเดต UI
        return result.user;
    } catch (error) {
        console.error("Email/Password Sign-In error:", error);
        throw error;
    }
};

// ฟังก์ชันสำหรับออกจากระบบ
export const signOutUser = async () => {
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
    } catch (error) {
        console.error("Error signing out:", error);
        throw error;
    }
};

// ฟังก์ชันสำหรับแสดง Toast (ข้อความแจ้งเตือนชั่วคราว)
// ควรถูกแทนที่ด้วย UI ที่ดีกว่าในอนาคต
export function showToast(message, type = 'info') {
    console.log(`Toast (${type}): ${message}`);
    alert(`${type.toUpperCase()}: ${message}`); // ใช้ alert ชั่วคราว
}

// ฟังก์ชันสำหรับเปิด Modal
export function openModal(modalElement) {
    modalElement.classList.add('active');
}

// ฟังก์ชันสำหรับปิด Modal
export function closeModal(modalElement) {
    modalElement.classList.remove('active');
}

// ฟังก์ชันสำหรับแปลง Date object เป็น string ในรูปแบบ YYYY-MM-DD
export function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// ฟังก์ชันสำหรับแปลง Date string เป็น Date object
export function parseDateString(dateString) {
    return new Date(dateString + 'T00:00:00'); // เพิ่ม T00:00:00 เพื่อหลีกเลี่ยงปัญหา Timezone
}

// ฟังก์ชันสำหรับดึงข้อมูลจาก Firestore (ตัวอย่าง)
export async function fetchData(collectionName, conditions = []) {
    let q = collection(db, collectionName);
    conditions.forEach(cond => {
        q = query(q, where(cond.field, cond.operator, cond.value));
    });
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ฟังก์ชันสำหรับบันทึกข้อมูลลง Firestore (ตัวอย่าง)
export async function saveData(collectionName, data, docId = null) {
    try {
        if (docId) {
            await setDoc(doc(db, collectionName, docId), data, { merge: true });
            return docId;
        } else {
            const docRef = await addDoc(collection(db, collectionName), data);
            return docRef.id;
        }
    } catch (e) {
        console.error("Error saving document: ", e);
        throw e;
    }
}

// ฟังก์ชันสำหรับลบข้อมูลจาก Firestore (ตัวอย่าง)
export async function deleteData(collectionName, docId) {
    try {
        await deleteDoc(doc(db, collectionName, docId));
    } catch (e) {
        console.error("Error deleting document: ", e);
        throw e;
    }
}

// ฟังก์ชันสำหรับตั้งค่า Listener แบบเรียลไทม์ (onSnapshot)
export function setupRealtimeListener(collectionName, callback, conditions = []) {
    let q = collection(db, collectionName);
    conditions.forEach(cond => {
        q = query(q, where(cond.field, cond.operator, cond.value));
    });
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(data);
    }, (error) => {
        console.error("Error listening to collection:", collectionName, error);
    });
    return unsubscribe;
}
