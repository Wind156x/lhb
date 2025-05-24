import {
    auth,
    db,
    currentUserId, // This will be Firebase auth.currentUser.uid
    isAuthReady,
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
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    firebaseSignOut
} from './firebase-init.js';

// CONSTANTS
const ADMIN_UID = "De4FbjpF4uYHGOjV8HzKuK0M2Wm2"; // Replace with actual Admin UID from Firebase Auth
const APP_DB_PREFIX = "studentCheckApp"; // Prefix for Firestore collections for this app

// Global State Variables
let currentSelectedDate = new Date().toISOString().split('T')[0];
let currentAcademicYear = new Date().getFullYear() + 543;
// Local caches of Firestore data (will be populated from Firestore)
let attendanceDataForSelectedDate = {}; // Holds { studentId: status } for currentSelectedDate
let allStudents = []; // Cache of students for the currentAcademicYear
let allClasses = []; // Cache of all defined classes
let academicYearSettings = {}; // Cache for { year: { term1: {...}, term2: {...}, holidays: [] }}
let teacherProfile = { // Default profile, will be overwritten by Firestore data
    id: null, // Firebase UID
    name: 'ครู',
    email: '',
    isAdmin: false,
    responsibleClasses: []
};
// Local state for UI, not directly stored in DB in this exact form for some
let attendanceHistory = []; // This might be derived or loaded paginated
let savingsRecords = []; // Cache, might be loaded filtered
let healthRecords = []; // Cache, might be loaded filtered

let attendanceLineChart = null;
let currentClassForModal = null;
let currentGenderForModal = 'male';
let editingUserId = null; // For user management modal

// DOM Elements (ensure all are correctly defined in your HTML)
const pages = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('.nav-item');
const headerTitle = document.getElementById('header-title');
const currentDateElement = document.getElementById('current-date');
const dateSelectorDisplay = document.getElementById('date-selector-display');
const adminLoginStatusBtn = document.getElementById('admin-login-status-btn');
// ... (include all other DOM element const declarations from your original file) ...
const presentStatCard = document.getElementById('present-stat-card');
const presentCountEl = document.getElementById('present-count');
const presentPercentEl = document.getElementById('present-percent');
const absentCountEl = document.getElementById('absent-count');
const absentPercentEl = document.getElementById('absent-percent');
const totalDaysAttendedOverallEl = document.getElementById('total-days-attended-overall');
const classesCheckedDisplay = document.getElementById('classes-checked-display');
const classesCheckedProgress = document.getElementById('classes-checked-progress');
const totalDaysProgress = document.getElementById('total-days-progress');
const classListAttendanceContainer = document.getElementById('class-list-attendance');
const attendanceDetailModal = document.getElementById('attendance-detail-modal');
const attendanceDetailModalTitle = document.getElementById('attendance-detail-modal-title');
const attendanceDetailModalStudentList = document.getElementById('attendance-detail-modal-student-list');
const attendanceCheckModal = document.getElementById('attendance-check-modal');
const attendanceModalClassTitle = document.getElementById('attendance-modal-class-title');
const attendanceModalGenderSegment = document.getElementById('attendance-modal-gender-segment');
const attendanceModalStudentList = document.getElementById('attendance-modal-student-list');
const attendanceModalStudentCount = document.getElementById('attendance-modal-student-count');
const attendanceModalMarkAllPresentBtn = document.getElementById('attendance-modal-mark-all-present');
const saveAttendanceModalBtn = document.getElementById('save-attendance-modal-btn');
const teacherNameDisplay = document.getElementById('teacher-name-display');
const teacherIdDisplay = document.getElementById('teacher-id-display');
const currentAcademicYearDisplay = document.getElementById('current-academic-year-display');
const teacherIdInput = document.getElementById('teacher-id-input'); // May not be needed if ID is UID
const teacherNameInput = document.getElementById('teacher-name-input'); // For profile editing
const changePasswordBtn = document.getElementById('change-password-btn');
const changePasswordModal = document.getElementById('change-password-modal');
const currentPasswordInput = document.getElementById('current-password-input');
const newPasswordInput = document.getElementById('new-password-input');
const confirmNewPasswordInput = document.getElementById('confirm-new-password-input');
const saveNewPasswordBtn = document.getElementById('save-new-password-btn');
const adminSettingsSection = document.getElementById('admin-settings-section');
const saveProfileBtn = document.getElementById('save-profile-btn');
const openSystemSettingsModalBtn = document.getElementById('open-system-settings-modal-btn');
const manageUsersBtn = document.getElementById('manage-users-btn');
const manageClassesBtn = document.getElementById('manage-classes-btn');
const systemSettingsModal = document.getElementById('system-settings-modal');
const settingsAcademicYearInput = document.getElementById('settings-academic-year-input');
const term1StartDateInput = document.getElementById('term1-start-date-input');
const term1EndDateInput = document.getElementById('term1-end-date-input');
const term2StartDateInput = document.getElementById('term2-start-date-input');
const term2EndDateInput = document.getElementById('term2-end-date-input');
const openHolidaySettingsModalBtn = document.getElementById('open-holiday-settings-modal-btn');
const saveSystemSettingsBtn = document.getElementById('save-system-settings-btn');
const holidaySettingsModal = document.getElementById('holiday-settings-modal');
const holidayModalYearDisplay = document.getElementById('holiday-modal-year-display');
const holidayDateInput = document.getElementById('holiday-date-input');
const holidayDescriptionInput = document.getElementById('holiday-description-input');
const addHolidayBtn = document.getElementById('add-holiday-btn');
const holidayListDisplay = document.getElementById('holiday-list-display');
const autoRecommendHolidaysToggle = document.getElementById('auto-recommend-holidays-toggle');
const recommendHolidaysAiBtn = document.getElementById('recommend-holidays-ai-btn');
const saveHolidaysBtn = document.getElementById('save-holidays-btn');
const addStudentModal = document.getElementById('add-student-modal');
const newStudentGenderRadios = document.querySelectorAll('input[name="new-student-gender"]');
const newStudentPrefixSelect = document.getElementById('new-student-prefix');
const newStudentClassSelect = document.getElementById('new-student-class');
const manageStudentsByTeacherBtn = document.getElementById('manage-students-by-teacher-btn');
const manageStudentsByTeacherModal = document.getElementById('manage-students-by-teacher-modal');
const teacherManageClassFilter = document.getElementById('teacher-manage-class-filter');
const teacherManageGenderFilter = document.getElementById('teacher-manage-gender-filter');
const addStudentByTeacherBtn = document.getElementById('add-student-by-teacher-btn');
const teacherManagedStudentList = document.getElementById('teacher-managed-student-list');
const importStudentModal = document.getElementById('import-student-modal');
const importAcademicYearSelect = document.getElementById('import-academic-year');
const downloadTemplateModal = document.getElementById('download-template-modal');
const confirmImportStudentBtn = document.getElementById('confirm-import-student-btn');
const templateAcademicYearSelect = document.getElementById('template-academic-year');
const savingsAcademicYearDisplay = document.getElementById('savings-academic-year-display');
const healthAcademicYearDisplay = document.getElementById('health-academic-year-display');
const savingsClassFilter = document.getElementById('savings-class-filter');
const healthClassFilter = document.getElementById('health-class-filter');
const savingsListClassDisplay = document.getElementById('savings-list-class-display');
const healthListClassDisplay = document.getElementById('health-list-class-display');
const savingModalClassName = document.getElementById('saving-modal-class-name');
const healthModalClassName = document.getElementById('health-modal-class-name');
const addNewSavingBtn = document.getElementById('add-new-saving-btn');
const addSavingModal = document.getElementById('add-saving-modal');
const savingStudentSelect = document.getElementById('saving-student-select');
const savingTypeToggle = document.getElementById('saving-type-toggle');
const savingTypeLabelDeposit = document.getElementById('saving-type-label-deposit');
const savingTypeLabelWithdraw = document.getElementById('saving-type-label-withdraw');
const savingDateInput = document.getElementById('saving-date-input');
const savingAmountInput = document.getElementById('saving-amount-input');
const saveNewSavingBtn = document.getElementById('save-new-saving-btn');
const savingsListContainer = document.getElementById('savings-list');
const totalSavingsAmountEl = document.getElementById('total-savings-amount');
const studentsSavingCountEl = document.getElementById('students-saving-count');
const individualSavingsModal = document.getElementById('individual-savings-modal');
const individualSavingsModalTitle = document.getElementById('individual-savings-modal-title');
const individualSavingsList = document.getElementById('individual-savings-list');
const addNewHealthRecordBtn = document.getElementById('add-new-health-record-btn');
const addHealthRecordModal = document.getElementById('add-health-record-modal');
const healthStudentSelect = document.getElementById('health-student-select');
const healthDateInput = document.getElementById('health-date-input');
const healthWeightInput = document.getElementById('health-weight-input');
const healthHeightInput = document.getElementById('health-height-input');
const healthNotesInput = document.getElementById('health-notes-input');
const saveNewHealthRecordBtn = document.getElementById('save-new-health-record-btn');
const healthListContainer = document.getElementById('health-list');
const healthDetailModal = document.getElementById('health-detail-modal');
const healthDetailModalTitle = document.getElementById('health-detail-modal-title');
const healthDetailContent = document.getElementById('health-detail-content');
const healthNormalCountEl = document.getElementById('health-normal-count');
const healthWatchoutCountEl = document.getElementById('health-watchout-count');
const aiModal = document.getElementById('ai-modal');
const aiModalTitle = document.getElementById('ai-modal-title');
const aiModalContentDisplay = document.getElementById('ai-modal-content-display');
const adminLoginModal = document.getElementById('admin-login-modal');
const googleAdminLoginBtn = document.getElementById('google-admin-login-btn');
const emailPasswordAdminLoginBtn = document.getElementById('email-password-admin-login-btn');
const adminLoginError = document.getElementById('admin-login-error');
const adminActionsModal = document.getElementById('admin-actions-modal');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const manageUsersModal = document.getElementById('manage-users-modal');
const addNewUserBtnMain = document.getElementById('add-new-user-btn-main');
const userFormModal = document.getElementById('user-form-modal');
const userFormModalTitle = document.getElementById('user-form-modal-title');
const userFormMode = document.getElementById('user-form-mode');
const editingUserIdHidden = document.getElementById('editing-user-id-hidden');
const userFormIdInput = document.getElementById('user-form-id-input'); // This should be email for Firebase Auth
const userFormPasswordInput = document.getElementById('user-form-password-input');
const userFormRoleSelect = document.getElementById('user-form-role-select');
const userFormResponsibleClassesCheckboxes = document.getElementById('user-form-responsible-classes-checkboxes');
const saveUserFormBtn = document.getElementById('save-user-form-btn');
const userListDisplay = document.getElementById('user-list-display');
const manageClassesModal = document.getElementById('manage-classes-modal');
const currentClassListDisplay = document.getElementById('current-class-list-display');
const newClassNameInput = document.getElementById('new-class-name-input');
const addNewClassBtn = document.getElementById('add-new-class-btn');
const profileMainContent = document.getElementById('profile-main-content');
const historyPageContent = document.getElementById('history-page-content');
const reportPageContent = document.getElementById('report-page-content');
const showHistoryBtn = document.getElementById('show-history-btn');
const showReportBtn = document.getElementById('show-report-btn');
const deleteAllStudentsBtn = document.getElementById('delete-all-students-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const currentYearInSubpageElements = document.querySelectorAll('.current-year-in-subpage');
const refreshStatsBtn = document.getElementById('refresh-stats');


function showToast(message, type = 'info') {
    console.log(`Toast (${type}): ${message}`);
    alert(`${type.toUpperCase()}: ${message}`);
}
window.showToast = showToast;

async function loadInitialData() {
    await loadClassesFromFirestore();
    await loadAcademicYearSettingsFromFirestore(currentAcademicYear); // Load current year settings
    await loadStudentsFromFirestore(currentAcademicYear);
    await loadAttendanceForDate(currentAcademicYear, currentSelectedDate);
    // Load other data as needed (savings, health) initially or on-demand
    await loadSavingsFromFirestore(currentAcademicYear);
    await loadHealthFromFirestore(currentAcademicYear);
}

window.initializeAppLogic = async function() {
    if (initializeAppLogic.hasRun && isAuthReady && currentUserId) return;
    initializeAppLogic.hasRun = true;

    console.log("initializeAppLogic called. Current User ID:", currentUserId);

    if (!currentUserId) {
        console.log("No user signed in. Waiting for auth state change or anonymous sign-in.");
        return; // Wait for user to be available
    }
    await loadTeacherProfile(currentUserId); // Load profile for the logged-in user

    await loadInitialData();

    setupEventListeners();
    updateDateDisplay(new Date(currentSelectedDate));
    populateClassListForAttendance();
    populateFilters();
    updateDashboardStatsAndStatus();
    initAttendanceLineChart();
    renderProfileData(); // Depends on teacherProfile
    updateAdminView();   // Depends on teacherProfile.isAdmin
    populateAcademicYearSelects(); // Depends on academicYearSettings
    populateClassSelect(savingsClassFilter); // Depends on allClasses
    populateClassSelect(healthClassFilter);  // Depends on allClasses
    populateClassSelect(newStudentClassSelect, false); // Depends on allClasses
    populatePrefixSelect('male');
    if(settingsAcademicYearInput) settingsAcademicYearInput.value = currentAcademicYear;
    loadSettingsForSelectedYear(); // Depends on academicYearSettings
    renderSavingsList(); // Depends on savingsRecords
    updateSavingsSummary(); // Depends on savingsRecords
    renderHealthList(); // Depends on healthRecords
    updateHealthSummary(); // Depends on healthRecords
    updateAcademicYearDisplays();
    renderUserListForAdmin(); // For admin panel
    renderCurrentClassListForAdmin(); // For admin panel
};
initializeAppLogic.hasRun = false;

window.teacherProfile = teacherProfile;
window.ADMIN_UID = ADMIN_UID;

window.updateAdminView = function() {
    if (!adminSettingsSection || !adminLoginStatusBtn || !teacherIdInput || !teacherNameInput) return;
    adminSettingsSection.classList.toggle('hidden', !teacherProfile.isAdmin);
    if (teacherProfile.isAdmin) {
        adminLoginStatusBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg><span>Admin Mode</span>';
        adminLoginStatusBtn.classList.add('text-green-600');
        adminLoginStatusBtn.classList.remove('text-gray-600');
    } else {
        adminLoginStatusBtn.innerHTML = 'ผู้ดูแล';
        adminLoginStatusBtn.classList.remove('text-green-600');
        adminLoginStatusBtn.classList.add('text-gray-600');
    }
    // Teacher ID and Name inputs might be part of a profile editing form
    // Their readOnly status would depend on whether it's the user's own profile vs admin editing.
    // For simplicity, let's assume they are editable if it's their own profile or if admin.
    const isOwnProfile = auth.currentUser && auth.currentUser.uid === teacherProfile.id;
    teacherIdInput.readOnly = !teacherProfile.isAdmin && !isOwnProfile; // UID generally not editable
    teacherNameInput.readOnly = !teacherProfile.isAdmin && !isOwnProfile;
};

async function loadTeacherProfile(userId) {
    if (!userId) {
        teacherProfile = { id: null, name: 'ผู้เยี่ยมชม', isAdmin: false, responsibleClasses: [], email: '' };
        renderProfileData();
        updateAdminView();
        return;
    }
    const userDoc = await getDocument(`${APP_DB_PREFIX}_users`, userId);
    if (userDoc) {
        teacherProfile = {
            id: userId,
            name: userDoc.name || 'ครู',
            email: userDoc.email || (auth.currentUser ? auth.currentUser.email : ''),
            isAdmin: userDoc.role === 'admin' || userId === ADMIN_UID,
            responsibleClasses: userDoc.responsibleClasses || []
        };
    } else {
        // New user or profile not created yet, create a basic one
        const basicProfile = {
            name: auth.currentUser ? auth.currentUser.displayName || 'ครูใหม่' : 'ครู',
            email: auth.currentUser ? auth.currentUser.email : '',
            role: userId === ADMIN_UID ? 'admin' : 'user', // Default new users to 'user'
            responsibleClasses: []
        };
        await setDocument(`${APP_DB_PREFIX}_users`, userId, basicProfile);
        teacherProfile = { ...basicProfile, id: userId, isAdmin: basicProfile.role === 'admin' };
    }
    // Ensure isAdmin is also true if UID matches ADMIN_UID, regardless of DB role
    if (userId === ADMIN_UID) {
        teacherProfile.isAdmin = true;
        // Optionally update role in DB if it's not admin
        if (teacherProfile.role !== 'admin') {
            await updateDocument(`${APP_DB_PREFIX}_users`, userId, { role: 'admin' });
            teacherProfile.role = 'admin';
        }
    }
    renderProfileData();
    updateAdminView();
    // After profile is loaded, refresh UI elements that depend on responsibleClasses
    populateClassListForAttendance();
    populateClassSelect(savingsClassFilter);
    populateClassSelect(healthClassFilter);
    // ... and any other select or list that filters by responsibleClasses
}


function updateAcademicYearDisplays() {
    if(savingsAcademicYearDisplay) savingsAcademicYearDisplay.textContent = currentAcademicYear;
    if(healthAcademicYearDisplay) healthAcademicYearDisplay.textContent = currentAcademicYear;
    currentYearInSubpageElements.forEach(el => el.textContent = currentAcademicYear);
}

async function loadAcademicYearSettingsFromFirestore(year) {
    const settings = await getDocument(`${APP_DB_PREFIX}_academicYearDetails`, String(year));
    if (settings) {
        academicYearSettings[year] = settings;
    } else {
        // Default settings if not found in Firestore for the year
        const currentJsYear = new Date().getFullYear(); // JS year for default dates
        const defaultYearSettings = {
            term1: { startDate: `${currentJsYear}-05-15`, endDate: `${currentJsYear}-10-15` },
            term2: { startDate: `${currentJsYear}-11-01`, endDate: `${parseInt(currentJsYear) + 1}-03-15` },
            holidays: [ /* Default holidays or empty */ ]
        };
        academicYearSettings[year] = defaultYearSettings;
        // Optionally save these default settings to Firestore
        // await setDocument(`${APP_DB_PREFIX}_academicYearDetails`, String(year), defaultYearSettings);
    }
    // Populate UI elements that depend on these settings
    if (settingsAcademicYearInput && term1StartDateInput && term1EndDateInput && term2StartDateInput && term2EndDateInput) {
        settingsAcademicYearInput.value = year;
        term1StartDateInput.value = academicYearSettings[year]?.term1?.startDate || '';
        term1EndDateInput.value = academicYearSettings[year]?.term1?.endDate || '';
        term2StartDateInput.value = academicYearSettings[year]?.term2?.startDate || '';
        term2EndDateInput.value = academicYearSettings[year]?.term2?.endDate || '';
    }
    populateAcademicYearSelects();
}

async function loadClassesFromFirestore() {
    const classDocs = await queryDocuments(`${APP_DB_PREFIX}_classes`);
    allClasses = classDocs.map(doc => ({ id: doc.id, ...doc }));
    // Refresh UI elements that depend on allClasses
    renderCurrentClassListForAdmin();
    populateClassSelect(newStudentClassSelect, false);
    // ... and other class dropdowns
}

async function loadStudentsFromFirestore(academicYear) {
    allStudents = await queryDocuments(`${APP_DB_PREFIX}_students`, where("academicYear", "==", parseInt(academicYear)));
    // Refresh UI elements that depend on allStudents
    updateDashboardStatsAndStatus();
    populateClassListForAttendance();
    // ... and other student lists or dropdowns
}

async function loadAttendanceForDate(academicYear, dateString) {
    const attendanceDoc = await getDocument(`${APP_DB_PREFIX}_attendance`, `${academicYear}_${dateString}`);
    if (attendanceDoc && attendanceDoc.records) {
        attendanceDataForSelectedDate = attendanceDoc.records;
    } else {
        attendanceDataForSelectedDate = {}; // No record for this date, or no students checked
    }
    // Refresh UI elements that depend on attendanceDataForSelectedDate
    updateDashboardStatsAndStatus();
    populateClassListForAttendance(); // This will re-render based on new attendance data
}

async function loadSavingsFromFirestore(academicYear) {
    savingsRecords = await queryDocuments(`${APP_DB_PREFIX}_savingsTransactions`, where("academicYear", "==", parseInt(academicYear)));
    renderSavingsList();
    updateSavingsSummary();
}

async function loadHealthFromFirestore(academicYear) {
    healthRecords = await queryDocuments(`${APP_DB_PREFIX}_healthEntries`, where("academicYear", "==", parseInt(academicYear)));
    renderHealthList();
    updateHealthSummary();
}


function inferGenderFromPrefix(prefix) {
    const malePrefixes = ['เด็กชาย', 'นาย', 'ด.ช.'];
    const femalePrefixes = ['เด็กหญิง', 'นางสาว', 'ด.ญ.'];
    if (malePrefixes.some(p => prefix.toLowerCase().includes(p))) return 'male';
    if (femalePrefixes.some(p => prefix.toLowerCase().includes(p))) return 'female';
    return 'unknown';
}

function populatePrefixSelect(gender) {
    if (!newStudentPrefixSelect) return;
    const prefixesMale = ['เด็กชาย', 'นาย'];
    const prefixesFemale = ['เด็กหญิง', 'นางสาว'];
    const prefixes = gender === 'male' ? prefixesMale : prefixesFemale;
    newStudentPrefixSelect.innerHTML = '';
    prefixes.forEach(prefix => {
        const option = document.createElement('option');
        option.value = prefix;
        option.textContent = prefix;
        newStudentPrefixSelect.appendChild(option);
    });
}

function populateAcademicYearSelects() {
    if (!templateAcademicYearSelect || !importAcademicYearSelect) return;
    const currentJsYear = new Date().getFullYear();
    // Use years from loaded settings or default range
    const availableYears = Object.keys(academicYearSettings).length > 0
        ? Object.keys(academicYearSettings).map(Number).sort((a, b) => a - b)
        : [currentAcademicYear - 1, currentAcademicYear, currentAcademicYear + 1];

    [templateAcademicYearSelect, importAcademicYearSelect].forEach(select => {
        select.innerHTML = '';
        availableYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `ปีการศึกษา ${year}`;
            select.appendChild(option);
        });
        select.value = currentAcademicYear;
    });
}

function populateStudentSelectInModal(selectElement, classId, placeholderText = "เลือกนักเรียน...") {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">${placeholderText}</option>`;
    const studentsInClass = allStudents.filter(s =>
        s.classId === classId &&
        s.academicYear === currentAcademicYear &&
        (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId))
    );
    studentsInClass.sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'th'))
    .forEach(student => {
        const option = document.createElement('option');
        option.value = student.id; // student.id should be Firestore document ID
        option.textContent = `${student.prefix}${student.firstName} ${student.lastName}`;
        selectElement.appendChild(option);
    });
}

function populateClassSelect(selectElement, addAllOption = true) {
    if (!selectElement) return;
    const currentValue = selectElement.value;
    selectElement.innerHTML = '';
    if (addAllOption) {
         selectElement.innerHTML = '<option value="all">ทุกห้องเรียน</option>';
    } else {
         selectElement.innerHTML = '<option value="">เลือกชั้นเรียน</option>';
    }

    const classesToDisplay = teacherProfile.isAdmin
                            ? allClasses
                            : allClasses.filter(cls => teacherProfile.responsibleClasses.includes(cls.id));

    classesToDisplay.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls.id; // class.id should be Firestore document ID
        option.textContent = cls.name;
        selectElement.appendChild(option);
    });
    if (classesToDisplay.find(c => c.id === currentValue)) {
        selectElement.value = currentValue;
    } else if (addAllOption) {
        selectElement.value = 'all';
    }
}

function setupEventListeners() {
    navItems.forEach(item => item.addEventListener('click', handleNavClick));
    if(adminLoginStatusBtn) adminLoginStatusBtn.addEventListener('click', handleAdminStatusClick);
    if(dateSelectorDisplay) dateSelectorDisplay.addEventListener('click', () => {
        if(document.getElementById('date-picker-input')) document.getElementById('date-picker-input').value = currentSelectedDate;
        openModal(document.getElementById('date-picker-modal'));
    });
    if(document.getElementById('confirm-date-btn')) document.getElementById('confirm-date-btn').addEventListener('click', async () => {
        currentSelectedDate = document.getElementById('date-picker-input').value;
        updateDateDisplay(new Date(currentSelectedDate));
        await loadAttendanceForDate(currentAcademicYear, currentSelectedDate); // Reload attendance
        closeModal(document.getElementById('date-picker-modal'));
    });

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => closeModal(e.target.closest('.ios-modal')));
    });
    document.querySelectorAll('.ios-modal').forEach(modal => {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
    });

    if(attendanceModalGenderSegment) attendanceModalGenderSegment.querySelectorAll('.ios-segment').forEach(segment => {
        segment.addEventListener('click', () => handleAttendanceModalGenderChange(segment.dataset.gender));
    });
    if(attendanceModalMarkAllPresentBtn) attendanceModalMarkAllPresentBtn.addEventListener('click', handleAttendanceModalMarkAllPresent);
    if(saveAttendanceModalBtn) saveAttendanceModalBtn.addEventListener('click', handleSaveAttendanceFromModal);

    if(saveProfileBtn) saveProfileBtn.addEventListener('click', handleSaveProfile);
    if(changePasswordBtn) changePasswordBtn.addEventListener('click', () => {
        if(currentPasswordInput) currentPasswordInput.value = '';
        if(newPasswordInput) newPasswordInput.value = '';
        if(confirmNewPasswordInput) confirmNewPasswordInput.value = '';
        openModal(changePasswordModal);
    });
    if(saveNewPasswordBtn) saveNewPasswordBtn.addEventListener('click', handleChangePassword);

    if(openSystemSettingsModalBtn) openSystemSettingsModalBtn.addEventListener('click', () => {
        if(settingsAcademicYearInput) settingsAcademicYearInput.value = currentAcademicYear;
        loadSettingsForSelectedYear();
        openModal(systemSettingsModal);
    });
    if(settingsAcademicYearInput) {
        settingsAcademicYearInput.addEventListener('change', loadSettingsForSelectedYear);
        settingsAcademicYearInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') loadSettingsForSelectedYear();
        });
    }
    if(saveSystemSettingsBtn) saveSystemSettingsBtn.addEventListener('click', handleSaveSystemSettings);

    if(manageUsersBtn) manageUsersBtn.addEventListener('click', () => openModal(manageUsersModal));
    if(addNewUserBtnMain) addNewUserBtnMain.addEventListener('click', () => {
        if(userFormModalTitle) userFormModalTitle.textContent = 'เพิ่มผู้ใช้งานใหม่';
        if(userFormMode) userFormMode.value = 'add';
        if(userFormIdInput) {
            userFormIdInput.value = ''; // Should be email
            userFormIdInput.removeAttribute('readonly');
        }
        if(userFormPasswordInput) userFormPasswordInput.value = ''; // For creating new Firebase Auth user
        if(userFormRoleSelect) userFormRoleSelect.value = 'user';
        populateResponsibleClassesCheckboxes(userFormResponsibleClassesCheckboxes, []);
        openModal(userFormModal);
    });
    if(saveUserFormBtn) saveUserFormBtn.addEventListener('click', handleSaveUserForm);

    if(manageClassesBtn) manageClassesBtn.addEventListener('click', () => openModal(manageClassesModal));
    if(addNewClassBtn) addNewClassBtn.addEventListener('click', handleAddNewClassToList);

    if(openHolidaySettingsModalBtn) openHolidaySettingsModalBtn.addEventListener('click', () => {
        if(holidayModalYearDisplay && settingsAcademicYearInput) holidayModalYearDisplay.textContent = settingsAcademicYearInput.value;
        populateHolidayListDisplay(settingsAcademicYearInput.value);
        openModal(holidaySettingsModal);
    });
    if(addHolidayBtn) addHolidayBtn.addEventListener('click', handleAddHoliday);
    if(recommendHolidaysAiBtn) recommendHolidaysAiBtn.addEventListener('click', handleRecommendHolidaysAI);
    if(autoRecommendHolidaysToggle) autoRecommendHolidaysToggle.addEventListener('change', updateRecommendHolidaysButtonState);
    if(saveHolidaysBtn) saveHolidaysBtn.addEventListener('click', async () => {
        // Save holidays to Firestore (already done by handleAddHoliday/remove)
        // This button might just close the modal or trigger a final save if needed
        const yearToSave = holidayModalYearDisplay.textContent;
        if (academicYearSettings[yearToSave]) {
            await setDocument(`${APP_DB_PREFIX}_academicYearDetails`, yearToSave, academicYearSettings[yearToSave]);
            showToast('บันทึกวันหยุดสำเร็จ', 'success');
        }
        closeModal(holidaySettingsModal);
        loadSettingsForSelectedYear();
    });

    if(document.getElementById('add-student-btn')) document.getElementById('add-student-btn').addEventListener('click', () => {
        if(document.getElementById('new-student-id')) document.getElementById('new-student-id').value = ''; // This should be student's unique ID, not Firebase Auth ID
        if(newStudentGenderRadios.length > 0) newStudentGenderRadios[0].checked = true;
        populatePrefixSelect('male');
        if(document.getElementById('new-student-firstname')) document.getElementById('new-student-firstname').value = '';
        if(document.getElementById('new-student-lastname')) document.getElementById('new-student-lastname').value = '';
        if(newStudentClassSelect) newStudentClassSelect.value = '';
        openModal(addStudentModal);
    });
    if(newStudentGenderRadios) newStudentGenderRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            populatePrefixSelect(e.target.value);
        });
    });
    if(document.getElementById('save-new-student-btn')) document.getElementById('save-new-student-btn').addEventListener('click', handleSaveNewStudent);

    if(manageStudentsByTeacherBtn) manageStudentsByTeacherBtn.addEventListener('click', () => {
        populateClassSelect(teacherManageClassFilter);
        if(teacherManageClassFilter) teacherManageClassFilter.value = 'all';
        if(teacherManageGenderFilter) teacherManageGenderFilter.value = 'all';
        renderTeacherManagedStudentList();
        openModal(manageStudentsByTeacherModal);
    });
    if(teacherManageClassFilter) teacherManageClassFilter.addEventListener('change', renderTeacherManagedStudentList);
    if(teacherManageGenderFilter) teacherManageGenderFilter.addEventListener('change', renderTeacherManagedStudentList);

    if(addStudentByTeacherBtn) addStudentByTeacherBtn.addEventListener('click', () => {
        if(document.getElementById('new-student-id')) document.getElementById('new-student-id').value = '';
        if(newStudentGenderRadios.length > 0) newStudentGenderRadios[0].checked = true;
        populatePrefixSelect('male');
        if(document.getElementById('new-student-firstname')) document.getElementById('new-student-firstname').value = '';
        if(document.getElementById('new-student-lastname')) document.getElementById('new-student-lastname').value = '';

        const responsibleClasses = teacherProfile.isAdmin ? allClasses.map(c => c.id) : teacherProfile.responsibleClasses;
        if (newStudentClassSelect) {
            if (responsibleClasses.length === 1) {
                newStudentClassSelect.value = responsibleClasses[0];
                newStudentClassSelect.setAttribute('disabled', 'true');
            } else {
                newStudentClassSelect.value = '';
                newStudentClassSelect.removeAttribute('disabled');
            }
        }
        openModal(addStudentModal);
    });

    if(document.getElementById('import-student-btn')) document.getElementById('import-student-btn').addEventListener('click', () => openModal(importStudentModal));
    if(document.getElementById('download-template-btn')) document.getElementById('download-template-btn').addEventListener('click', handleDownloadTemplate);
    if(confirmImportStudentBtn) confirmImportStudentBtn.addEventListener('click', handleConfirmImportStudent);

    if(savingsClassFilter) savingsClassFilter.addEventListener('change', () => {
        renderSavingsList();
        if(savingsListClassDisplay && allClasses) {
            const selectedClass = allClasses.find(c => c.id === savingsClassFilter.value);
            savingsListClassDisplay.textContent = selectedClass ? selectedClass.name : (savingsClassFilter.value === 'all' ? 'ทุกห้อง (รวมทั้งปี)' : 'N/A');
        }
    });
    if(healthClassFilter) healthClassFilter.addEventListener('change', () => {
        renderHealthList();
        if(healthListClassDisplay && allClasses) {
            const selectedClass = allClasses.find(c => c.id === healthClassFilter.value);
            healthListClassDisplay.textContent = selectedClass ? selectedClass.name : (healthClassFilter.value === 'all' ? 'ทุกห้อง (รวมทั้งปี)' : 'N/A');
        }
    });

    if(addNewSavingBtn) addNewSavingBtn.addEventListener('click', () => {
        const selectedClassId = savingsClassFilter.value;
        if (!selectedClassId || selectedClassId === 'all') {
            showToast('กรุณาเลือกห้องเรียนจากด้านบนก่อนบันทึกการออม', 'warning');
            return;
        }
        const selectedClass = allClasses.find(c => c.id === selectedClassId);
        if(savingModalClassName) savingModalClassName.textContent = selectedClass ? selectedClass.name : '';
        populateStudentSelectInModal(savingStudentSelect, selectedClassId, "เลือกนักเรียนในห้อง...");
        if(savingDateInput) savingDateInput.value = new Date().toISOString().split('T')[0];
        if(savingTypeToggle) savingTypeToggle.checked = false;
        updateSavingToggleLabel();
        openModal(addSavingModal);
    });
    if(savingTypeToggle) savingTypeToggle.addEventListener('change', updateSavingToggleLabel);
    if(saveNewSavingBtn) saveNewSavingBtn.addEventListener('click', handleSaveNewSaving);

    if(addNewHealthRecordBtn) addNewHealthRecordBtn.addEventListener('click', () => {
        const selectedClassId = healthClassFilter.value;
         if (!selectedClassId || selectedClassId === 'all') {
            showToast('กรุณาเลือกห้องเรียนจากด้านบนก่อนบันทึกสุขภาพ', 'warning');
            return;
        }
        const selectedClass = allClasses.find(c => c.id === selectedClassId);
        if(healthModalClassName) healthModalClassName.textContent = selectedClass ? selectedClass.name : '';
        populateStudentSelectInModal(healthStudentSelect, selectedClassId, "เลือกนักเรียนในห้อง...");
        if(healthDateInput) healthDateInput.value = new Date().toISOString().split('T')[0];
        openModal(addHealthRecordModal);
    });
    if(saveNewHealthRecordBtn) saveNewHealthRecordBtn.addEventListener('click', handleSaveNewHealthRecord);

    if(document.getElementById('history-class-filter')) document.getElementById('history-class-filter').addEventListener('change', updateAttendanceHistoryDisplay);
    if(document.getElementById('history-month-filter')) document.getElementById('history-month-filter').addEventListener('change', updateAttendanceHistoryDisplay);
    if(document.getElementById('report-class-filter')) document.getElementById('report-class-filter').addEventListener('change', updateReportDetails);

    if(showHistoryBtn) showHistoryBtn.addEventListener('click', () => showProfileSubPage('history'));
    if(showReportBtn) showReportBtn.addEventListener('click', () => showProfileSubPage('report'));
    if(deleteAllStudentsBtn) deleteAllStudentsBtn.addEventListener('click', handleDeleteAllStudents);
    if(exportCsvBtn) exportCsvBtn.addEventListener('click', handleExportCsv);

    if(googleAdminLoginBtn) googleAdminLoginBtn.addEventListener('click', async () => {
        if(adminLoginError) {
            adminLoginError.classList.add('hidden');
            adminLoginError.textContent = '';
        }
        const user = await signInAdminWithGoogle(ADMIN_UID); // signInAdminWithGoogle is from firebase-init.js
        if (user) {
            closeModal(adminLoginModal);
            showToast("เข้าสู่ระบบผู้ดูแลระบบด้วย Google สำเร็จ!", "success");
            // onAuthStateChanged in firebase-init.js will handle profile loading and UI updates
        } else {
            if(adminLoginError) {
                adminLoginError.textContent = "บัญชี Google นี้ไม่ได้รับสิทธิ์ผู้ดูแลระบบ หรือเกิดข้อผิดพลาด";
                adminLoginError.classList.remove('hidden');
            }
        }
    });
    if(emailPasswordAdminLoginBtn && auth) { // Ensure auth is initialized
        emailPasswordAdminLoginBtn.addEventListener('click', async () => {
            const email = document.getElementById('admin-email-input')?.value;
            const password = document.getElementById('admin-password-input')?.value;
            if (adminLoginError) {
                adminLoginError.classList.add('hidden');
                adminLoginError.textContent = '';
            }
            if (!email || !password) {
                if (adminLoginError) {
                    adminLoginError.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
                    adminLoginError.classList.remove('hidden');
                }
                return;
            }
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                if (userCredential.user.uid === ADMIN_UID) {
                    closeModal(adminLoginModal);
                    showToast("เข้าสู่ระบบผู้ดูแลระบบสำเร็จ", "success");
                    // onAuthStateChanged in firebase-init.js will handle profile loading
                } else {
                    if (adminLoginError) {
                        adminLoginError.textContent = "บัญชีนี้ไม่ใช่บัญชีผู้ดูแลระบบ";
                        adminLoginError.classList.remove('hidden');
                    }
                    await firebaseSignOut(auth); // Sign out non-admin
                }
            } catch (error) {
                console.error("Admin email/password login error:", error);
                let errorMessage = "เกิดข้อผิดพลาดในการล็อกอิน";
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    errorMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
                }
                if (adminLoginError) {
                    adminLoginError.textContent = errorMessage;
                    adminLoginError.classList.remove('hidden');
                }
            }
        });
    }


    if(adminLogoutBtn) adminLogoutBtn.addEventListener('click', async () => {
        await signOutAdmin(); // from firebase-init.js
        closeModal(adminActionsModal);
        showToast("ออกจากระบบผู้ดูแลแล้ว", "success");
        // onAuthStateChanged will handle UI updates and profile reset
    });
    if(refreshStatsBtn) refreshStatsBtn.addEventListener('click', async () => {
        showToast("กำลังรีเฟรชข้อมูล...", "info");
        await loadInitialData(); // Reload all primary data
        updateDashboardStatsAndStatus();
        populateClassListForAttendance();
        showToast("ข้อมูลรีเฟรชแล้ว", "success");
    });

}

function handleAdminStatusClick() {
    if (teacherProfile.isAdmin && auth.currentUser && auth.currentUser.uid === ADMIN_UID) {
        openModal(adminActionsModal);
    } else {
        openModal(adminLoginModal);
        if(adminLoginError) {
            adminLoginError.classList.add('hidden');
            adminLoginError.textContent = '';
        }
    }
}

function handleNavClick(event) {
    const targetPageId = event.currentTarget.dataset.page;
    pages.forEach(page => page.classList.toggle('active', page.id === targetPageId));
    navItems.forEach(item => item.classList.toggle('active', item.dataset.page === targetPageId));

    const pageTitles = {
        'attendance-page': 'เช็คชื่อ', 'savings-page': 'ออมเงิน',
        'health-page': 'สุขภาพ', 'profile-page': 'โปรไฟล์'
    };
    if(headerTitle) headerTitle.textContent = pageTitles[targetPageId] || 'ระบบเช็คชื่อ';

    if(profileMainContent) profileMainContent.classList.remove('hidden');
    if(historyPageContent) historyPageContent.classList.add('hidden');
    if(reportPageContent) reportPageContent.classList.add('hidden');
    document.querySelectorAll('.ios-modal.active').forEach(closeModal);

    if (targetPageId === 'profile-page') {
        showProfileSubPage('main');
    }
    if (targetPageId === 'savings-page') {
        if(savingsListClassDisplay && savingsClassFilter) savingsListClassDisplay.textContent = savingsClassFilter.options[savingsClassFilter.selectedIndex]?.text || 'ทุกห้อง (รวมทั้งปี)';
        renderSavingsList();
    }
    if (targetPageId === 'health-page') {
        if(healthListClassDisplay && healthClassFilter) healthListClassDisplay.textContent = healthClassFilter.options[healthClassFilter.selectedIndex]?.text || 'ทุกห้อง (รวมทั้งปี)';
        renderHealthList();
    }
}

function showProfileSubPage(subPage) {
    if(profileMainContent) profileMainContent.classList.toggle('hidden', subPage !== 'main');
    if(historyPageContent) historyPageContent.classList.toggle('hidden', subPage !== 'history');
    if(reportPageContent) reportPageContent.classList.toggle('hidden', subPage !== 'report');
    updateAcademicYearDisplays();

    if (subPage === 'history') {
        if(headerTitle) headerTitle.textContent = 'ประวัติการเข้าเรียน';
        updateAttendanceHistoryDisplay();
    } else if (subPage === 'report') {
        if(headerTitle) headerTitle.textContent = 'รายงานการมาเรียน';
        updateReportDetails();
    } else {
        if(headerTitle) headerTitle.textContent = 'โปรไฟล์';
    }
}

async function renderTeacherManagedStudentList() {
    if(!teacherManagedStudentList || !teacherManageClassFilter || !teacherManageGenderFilter) return;
    teacherManagedStudentList.innerHTML = '';
    const selectedClassId = teacherManageClassFilter.value;
    const selectedGender = teacherManageGenderFilter.value;

    let studentsToManage = allStudents.filter(s =>
        s.academicYear === currentAcademicYear &&
        (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId))
    );

    if (selectedClassId !== 'all') {
        studentsToManage = studentsToManage.filter(s => s.classId === selectedClassId);
    }
    if (selectedGender !== 'all') {
        studentsToManage = studentsToManage.filter(s => s.gender === selectedGender);
    }
    studentsToManage.sort((a,b) => `${a.className} ${a.firstName} ${a.lastName}`.localeCompare(`${b.className} ${b.firstName} ${b.lastName}`, 'th'));

    if (studentsToManage.length === 0) {
        teacherManagedStudentList.innerHTML = '<p class="p-4 text-center text-gray-500">ไม่มีนักเรียนในห้องที่รับผิดชอบสำหรับปีการศึกษานี้</p>';
        return;
    }
    studentsToManage.forEach(student => {
        const studentDiv = document.createElement('div');
        studentDiv.className = 'student-list-item flex justify-between items-center';
        studentDiv.innerHTML = `
            <div>
                <div class="font-medium">${student.prefix}${student.firstName} ${student.lastName}</div>
                <div class="text-xs text-gray-500">รหัส: ${student.id} | ห้อง: ${student.className}</div>
            </div>
            <button data-student-id="${student.id}" class="delete-student-by-teacher-btn text-red-500 text-sm hover:text-red-700 px-2 py-1 rounded-full">ลบ</button>
        `;
        teacherManagedStudentList.appendChild(studentDiv);
    });
    teacherManagedStudentList.querySelectorAll('.delete-student-by-teacher-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const studentIdToDelete = e.target.dataset.studentId;
            handleDeleteStudent(studentIdToDelete); // Changed to generic delete
        });
    });
}

async function handleDeleteStudent(studentId) {
    if (!teacherProfile.isAdmin) {
        showToast('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบนักเรียนได้', 'error');
        return;
    }
    if (confirm(`Admin: ยืนยันการลบนักเรียน ID: ${studentId} ใช่หรือไม่? การดำเนินการนี้จะลบข้อมูลทั้งหมดของนักเรียนนี้ด้วย`)) {
        try {
            await deleteDocument(`${APP_DB_PREFIX}_students`, studentId);
            // Also delete related data (attendance, savings, health) for this student
            // This requires more complex queries or a cleanup function. For simplicity, only student doc deleted here.
            // Example: Delete attendance records (more complex - might need batched writes or cloud function)
            // const attendanceQuery = query(collection(db, `${APP_DB_PREFIX}_attendance`), where(`records.${studentId}`, "!=", null));
            // const attendanceSnap = await getDocs(attendanceQuery);
            // attendanceSnap.forEach(async (docSnap) => {
            //     const updatedRecords = { ...docSnap.data().records };
            //     delete updatedRecords[studentId];
            //     await updateDoc(doc(db, `${APP_DB_PREFIX}_attendance`, docSnap.id), { records: updatedRecords });
            // });

            allStudents = allStudents.filter(s => s.id !== studentId);
            showToast(`นักเรียน ID: ${studentId} ถูกลบแล้ว`, 'success');
            renderTeacherManagedStudentList();
            updateDashboardStatsAndStatus();
        } catch (error) {
            console.error("Error deleting student:", error);
            showToast(`เกิดข้อผิดพลาดในการลบนักเรียน: ${error.message}`, 'error');
        }
    }
}


function updateDateDisplay(dateObj) {
    if(!currentDateElement) return;
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' };
    currentDateElement.textContent = dateObj.toLocaleDateString('th-TH', options);
}

async function populateClassListForAttendance() {
    if(!classListAttendanceContainer) return;
    classListAttendanceContainer.innerHTML = '';
    const studentsForYearAndDate = allStudents.filter(s => s.academicYear === currentAcademicYear);

    const classesToDisplay = teacherProfile.isAdmin
                            ? allClasses
                            : allClasses.filter(cls => teacherProfile.responsibleClasses.includes(cls.id));

    classesToDisplay.forEach(cls => {
        const classStudents = studentsForYearAndDate.filter(s => s.classId === cls.id);
        const countPresent = classStudents.filter(s => attendanceDataForSelectedDate[s.id] === true).length;
        const totalStudentsInClass = classStudents.length;

        const classItem = document.createElement('div');
        classItem.className = 'ios-card p-3 attendance-item';
        classItem.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="text-md font-medium">${cls.name} <span class="text-sm text-gray-500">(${countPresent}/${totalStudentsInClass} มา)</span></h3>
                </div>
                <div class="flex space-x-2">
                     <button class="ios-button text-xs py-1 px-3 bg-blue-500 hover:bg-blue-600 view-class-attendance-btn" data-class-id="${cls.id}" data-class-name="${cls.name}">ดูรายการ</button>
                     <button class="ios-button text-xs py-1 px-3 ios-button-green check-class-btn" data-class-id="${cls.id}" data-class-name="${cls.name}">เช็คชื่อ</button>
                </div>
            </div>
        `;
        classListAttendanceContainer.appendChild(classItem);
        classItem.querySelector('.check-class-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openAttendanceCheckModal(e.currentTarget.dataset.classId, e.currentTarget.dataset.className);
        });
        classItem.querySelector('.view-class-attendance-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showAttendanceDetailModalForClass(e.currentTarget.dataset.classId, e.currentTarget.dataset.className);
        });
    });
}

function showAttendanceDetailModalForClass(classId, className) {
    if(!attendanceDetailModalTitle || !attendanceDetailModalStudentList) return;
    attendanceDetailModalTitle.textContent = `รายละเอียดห้อง ${className} (${new Date(currentSelectedDate).toLocaleDateString('th-TH')})`;
    attendanceDetailModalStudentList.innerHTML = '';
    const studentsInClass = allStudents.filter(s =>
        s.classId === classId &&
        s.academicYear === currentAcademicYear &&
        (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId))
    )
    .sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'th'));

    if (studentsInClass.length === 0) {
        attendanceDetailModalStudentList.innerHTML = '<p class="p-3 text-sm text-gray-500">ไม่มีนักเรียนในห้องนี้สำหรับปีการศึกษานี้</p>';
    } else {
        studentsInClass.forEach(student => {
            const isPresent = attendanceDataForSelectedDate[student.id];
            const statusText = isPresent === true ? 'มาเรียน' : (isPresent === false ? 'ขาดเรียน' : 'ยังไม่เช็ค');
            const statusColor = isPresent === true ? 'text-green-600' : (isPresent === false ? 'text-red-600' : 'text-gray-500');

            const studentDiv = document.createElement('div');
            studentDiv.className = 'student-list-item flex justify-between items-center';
            studentDiv.innerHTML = `
                <span class="text-sm">${student.prefix}${student.firstName} ${student.lastName}</span>
                <span class="text-sm font-medium ${statusColor}">${statusText}</span>
            `;
            attendanceDetailModalStudentList.appendChild(studentDiv);
        });
    }
    openModal(attendanceDetailModal);
}

function openAttendanceCheckModal(classId, className) {
    currentClassForModal = classId;
    if(attendanceModalClassTitle) attendanceModalClassTitle.textContent = `${className}`;
    currentGenderForModal = 'male';
    updateAttendanceModalGenderSegments();
    loadStudentsForModal();
    openModal(attendanceCheckModal);
}

function updateAttendanceModalGenderSegments() {
    if(!attendanceModalGenderSegment) return;
    attendanceModalGenderSegment.querySelectorAll('.ios-segment').forEach(segment => {
        segment.classList.toggle('active', segment.dataset.gender === currentGenderForModal);
    });
}

function handleAttendanceModalGenderChange(gender) {
    currentGenderForModal = gender;
    updateAttendanceModalGenderSegments();
    loadStudentsForModal();
}

function loadStudentsForModal() {
    if (!currentClassForModal || !attendanceModalStudentCount || !attendanceModalStudentList) return;

    const studentsOfClassAndGender = allStudents.filter(s =>
        s.classId === currentClassForModal &&
        s.gender === currentGenderForModal &&
        s.academicYear === currentAcademicYear &&
        (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId))
    );
    attendanceModalStudentCount.textContent = studentsOfClassAndGender.length;
    attendanceModalStudentList.innerHTML = '';

    studentsOfClassAndGender.forEach(student => {
        const studentItem = document.createElement('div');
        studentItem.className = 'flex items-center justify-between p-3';
        studentItem.innerHTML = `
            <div>
                <div class="font-medium text-sm">${student.prefix}${student.firstName} ${student.lastName}</div>
                <div class="text-xs text-gray-500">รหัส: ${student.id}</div>
            </div>
            <label class="ios-toggle">
                <input type="checkbox" class="attendance-modal-toggle" data-student-id="${student.id}" ${attendanceDataForSelectedDate[student.id] ? 'checked' : ''}>
                <span class="ios-toggle-slider"></span>
            </label>
        `;
        attendanceModalStudentList.appendChild(studentItem);
        studentItem.querySelector('.attendance-modal-toggle').addEventListener('change', (e) => {
            attendanceDataForSelectedDate[e.target.dataset.studentId] = e.target.checked;
        });
    });
}

function handleAttendanceModalMarkAllPresent() {
    const studentsOfClassAndGender = allStudents.filter(s =>
        s.classId === currentClassForModal &&
        s.gender === currentGenderForModal &&
        s.academicYear === currentAcademicYear &&
        (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId))
    );
    studentsOfClassAndGender.forEach(student => {
        attendanceDataForSelectedDate[student.id] = true;
    });
    if(attendanceModalStudentList) attendanceModalStudentList.querySelectorAll('.attendance-modal-toggle').forEach(toggle => {
        const studentId = toggle.dataset.studentId;
        if (studentsOfClassAndGender.find(s => s.id === studentId)) {
            toggle.checked = true;
        }
    });
}

async function handleSaveAttendanceFromModal() {
    const attendanceDocId = `${currentAcademicYear}_${currentSelectedDate}`;
    try {
        // Fetch existing doc to merge, or create new if it doesn't exist
        const existingDoc = await getDocument(`${APP_DB_PREFIX}_attendance`, attendanceDocId);
        let recordsToSave = { ... (existingDoc?.records || {}) };

        // Update records only for the students in the current modal's class and gender
        allStudents.filter(s =>
            s.classId === currentClassForModal && // currentClassForModal is set when modal opens
            s.academicYear === currentAcademicYear &&
            (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId))
        ).forEach(student => {
            // Only update if attendanceDataForSelectedDate has an explicit value (true/false) for this student
            if (attendanceDataForSelectedDate.hasOwnProperty(student.id)) {
                recordsToSave[student.id] = attendanceDataForSelectedDate[student.id];
            }
        });

        await setDocument(`${APP_DB_PREFIX}_attendance`, attendanceDocId, { records: recordsToSave });
        showToast('บันทึกการเช็คชื่อสำเร็จ', 'success');

        // Refresh local data and UI
        await loadAttendanceForDate(currentAcademicYear, currentSelectedDate); // Reload for the specific date
        updateDashboardStatsAndStatus();
        populateClassListForAttendance();
        // updateAttendanceHistoryDisplay(); // If history display is affected
        // updateReportDetails(); // If report display is affected
        closeModal(attendanceCheckModal);
    } catch (error) {
        console.error("Error saving attendance:", error);
        showToast(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`, 'error');
    }
}


function updateDashboardStatsAndStatus() {
    if(!presentCountEl || !presentPercentEl || !absentCountEl || !absentPercentEl || !totalDaysAttendedOverallEl || !classesCheckedDisplay || !classesCheckedProgress || !totalDaysProgress || !presentStatCard) return;

    let present = 0;
    const relevantStudents = allStudents.filter(s =>
        s.academicYear === currentAcademicYear &&
        (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId)) &&
        attendanceDataForSelectedDate.hasOwnProperty(s.id) // Only count students whose attendance was explicitly set for the day
    );

    relevantStudents.forEach(student => {
        if (attendanceDataForSelectedDate[student.id] === true) {
            present++;
        }
    });

    const absent = relevantStudents.length - present;
    const presentRate = relevantStudents.length > 0 ? Math.round((present / relevantStudents.length) * 100) : 0;
    const absentRate = relevantStudents.length > 0 ? Math.round((absent / relevantStudents.length) * 100) : 0;

    presentCountEl.textContent = present;
    presentPercentEl.textContent = `${presentRate}%`;
    absentCountEl.textContent = absent;
    absentPercentEl.textContent = `${absentRate}%`;

    // This needs a more robust way to count school days, perhaps from academicYearSettings
    // For now, a placeholder or a count of days with any attendance record
    // totalDaysAttendedOverallEl.textContent = `จำนวนวันเปิดเรียน(เทอมนี้) ${attendanceHistory.length} วัน`; // Placeholder

    let classesCheckedCount = 0;
    const classesToConsider = teacherProfile.isAdmin
                            ? allClasses
                            : allClasses.filter(cls => teacherProfile.responsibleClasses.includes(cls.id));

    classesToConsider.forEach(cls => {
        const classStudents = allStudents.filter(s => s.classId === cls.id && s.academicYear === currentAcademicYear);
        if (classStudents.some(s => attendanceDataForSelectedDate.hasOwnProperty(s.id))) {
            classesCheckedCount++;
        }
    });
    classesCheckedDisplay.textContent = `ห้องที่เช็คชื่อแล้ว ${classesCheckedCount}/${classesToConsider.length} ห้อง`;

    const classesProgressVal = classesToConsider.length > 0 ? (classesCheckedCount / classesToConsider.length) * 100 : 0;
    classesCheckedProgress.style.width = `${classesProgressVal}%`;

    // const maxSchoolDaysForProgress = 100; // This should be dynamic based on term length
    // const daysProgressVal = (attendanceHistory.length / maxSchoolDaysForProgress) * 100;
    // totalDaysProgress.style.width = `${Math.min(daysProgressVal, 100)}%`;

    presentStatCard.classList.toggle('warning', classesCheckedCount < classesToConsider.length && classesToConsider.length > 0);
}

function renderProfileData() {
    if(!teacherNameDisplay || !teacherIdDisplay || !currentAcademicYearDisplay || !teacherIdInput || !teacherNameInput) return;
    teacherNameDisplay.textContent = teacherProfile.name;
    teacherIdDisplay.textContent = `Email: ${teacherProfile.email || '-'}`; // Using email as ID display
    currentAcademicYearDisplay.textContent = `ปีการศึกษา: ${currentAcademicYear}`;
    teacherIdInput.value = teacherProfile.email || ''; // For editing, should be email
    teacherNameInput.value = teacherProfile.name;
}

async function handleSaveProfile() {
    if (!auth.currentUser) {
        showToast("กรุณาเข้าสู่ระบบก่อน", "error");
        return;
    }
    const newName = teacherNameInput.value.trim();
    // Email/ID is generally not changed here directly by user, but by auth processes.
    // We are updating the 'name' and 'responsibleClasses' in our user profile document.
    if (!newName) {
        showToast("กรุณากรอกชื่อ", "warning");
        return;
    }
    try {
        const updatedProfileData = {
            name: newName,
            // responsibleClasses: teacherProfile.responsibleClasses // Assuming this is managed elsewhere if admin
        };
        await updateDocument(`${APP_DB_PREFIX}_users`, auth.currentUser.uid, updatedProfileData);
        teacherProfile.name = newName; // Update local cache
        renderProfileData();
        showToast('บันทึกข้อมูลโปรไฟล์สำเร็จ', 'success');
    } catch (error) {
        console.error("Error saving profile:", error);
        showToast(`เกิดข้อผิดพลาดในการบันทึกโปรไฟล์: ${error.message}`, 'error');
    }
}


async function handleChangePassword() {
    // Password changes should be handled via Firebase Auth's built-in methods
    // e.g., sendPasswordResetEmail or updatePassword if user is recently re-authenticated.
    // This modal is more for a local password system which we are moving away from.
    // For Firebase, you'd typically guide the user to a password reset flow.
    showToast("การเปลี่ยนรหัสผ่านควรทำผ่านระบบยืนยันตัวตนของ Firebase โดยตรง (เช่น ส่งอีเมลรีเซ็ตรหัสผ่าน)", "info");
    // Example: if (auth.currentUser && auth.currentUser.email) {
    // firebase.auth().sendPasswordResetEmail(auth.currentUser.email)
    // .then(() => showToast('อีเมลสำหรับรีเซ็ตรหัสผ่านถูกส่งไปแล้ว', 'success'))
    // .catch((error) => showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error'));
    // }
    closeModal(changePasswordModal);
}


async function loadSettingsForSelectedYear() {
    if(!settingsAcademicYearInput) return;
    const selectedYear = parseInt(settingsAcademicYearInput.value);
    if (isNaN(selectedYear)) {
        showToast('กรุณากรอกปีการศึกษาที่ถูกต้อง (ตัวเลข)', 'warning');
        return;
    }
    currentAcademicYear = selectedYear;
    await loadAcademicYearSettingsFromFirestore(currentAcademicYear); // This will update UI from Firestore data
    updateDateDisplay(new Date(currentSelectedDate));
    await loadStudentsFromFirestore(currentAcademicYear); // Reload students for new year
    await loadAttendanceForDate(currentAcademicYear, currentSelectedDate); // Reload attendance
    updateDashboardStatsAndStatus();
    populateFilters();
    renderProfileData();
    updateAcademicYearDisplays();
    // Reload other year-dependent data
    await loadSavingsFromFirestore(currentAcademicYear);
    await loadHealthFromFirestore(currentAcademicYear);
    populateClassListForAttendance();
}

async function populateHolidayListDisplay(year) {
    if(!holidayListDisplay) return;
    holidayListDisplay.innerHTML = '';
    const yearSettings = academicYearSettings[year];
    if (!yearSettings || !yearSettings.holidays || yearSettings.holidays.length === 0) {
        holidayListDisplay.innerHTML = '<p class="text-sm text-gray-500 text-center">ไม่มีวันหยุดพิเศษ</p>';
        return;
    }
    yearSettings.holidays.forEach((holiday, index) => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center text-sm py-1.5';
        item.innerHTML = `
            <span>${new Date(holiday.date + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}: ${holiday.description}</span>
            <button data-index="${index}" class="remove-holiday-btn text-red-500 hover:text-red-700 holiday-delete-btn">&times;</button>
        `;
        holidayListDisplay.appendChild(item);
    });
    holidayListDisplay.querySelectorAll('.remove-holiday-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const yearToEdit = holidayModalYearDisplay.textContent;
            const holidayIndex = parseInt(e.target.dataset.index);
            if (academicYearSettings[yearToEdit] && academicYearSettings[yearToEdit].holidays) {
                academicYearSettings[yearToEdit].holidays.splice(holidayIndex, 1);
                // No need to save here, saveHolidaysBtn will do it
                populateHolidayListDisplay(yearToEdit); // Re-render list
            }
        });
    });
}

async function handleRecommendHolidaysAI() {
    if(!holidayModalYearDisplay || !aiModalTitle || !aiModalContentDisplay) return;
    const currentYear = holidayModalYearDisplay.textContent;
    const prompt = `แนะนำวันหยุดนักขัตฤกษ์และวันหยุดสำคัญของประเทศไทยสำหรับปี พ.ศ. ${currentYear} (ค.ศ. ${currentYear - 543}) พร้อมวันที่ในรูปแบบ YYYY-MM-DD และคำอธิบายสั้นๆ โดยเน้นวันหยุดที่โรงเรียนมักจะหยุด เช่น วันหยุดราชการ, วันสำคัญทางศาสนา, วันหยุดนักขัตฤกษ์. ให้ผลลัพธ์เป็น JSON array ของ objects โดยแต่ละ object มี "date" (string) และ "description" (string).`;

    aiModalTitle.textContent = 'กำลังแนะนำวันหยุดด้วย AI';
    aiModalContentDisplay.innerHTML = `<div class="flex justify-center items-center py-8"><div class="spinner mr-3"></div><span>กำลังสร้างข้อมูล...</span></div>`;
    openModal(aiModal);

    try {
        const apiKey = ""; // Provided by environment if needed
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: { "date": { "type": "STRING" }, "description": { "type": "STRING" } },
                        "propertyOrdering": ["date", "description"]
                    }
                }
            }
        };
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const result = await response.json();

        if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            const recommendedHolidays = JSON.parse(result.candidates[0].content.parts[0].text);
            let addedCount = 0;
            if (!academicYearSettings[currentYear]) {
                academicYearSettings[currentYear] = { term1: {}, term2: {}, holidays: [] };
            }
            if (!academicYearSettings[currentYear].holidays) academicYearSettings[currentYear].holidays = [];

            recommendedHolidays.forEach(recHoliday => {
                if (!academicYearSettings[currentYear].holidays.find(h => h.date === recHoliday.date)) {
                    academicYearSettings[currentYear].holidays.push(recHoliday);
                    addedCount++;
                }
            });
            academicYearSettings[currentYear].holidays.sort((a,b) => new Date(a.date) - new Date(b.date));
            populateHolidayListDisplay(currentYear);
            aiModalTitle.textContent = 'แนะนำวันหยุดด้วย AI';
            aiModalContentDisplay.innerHTML = `<p class="text-green-600">แนะนำและเพิ่มวันหยุดสำเร็จ ${addedCount} รายการ</p>`;
        } else {
            throw new Error("Unexpected AI response structure or no content.");
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        aiModalTitle.textContent = 'เกิดข้อผิดพลาด';
        aiModalContentDisplay.innerHTML = `<p class="text-red-500">เกิดข้อผิดพลาดในการแนะนำวันหยุด: ${error.message}</p>`;
    }
}

function updateRecommendHolidaysButtonState() {
    if(!autoRecommendHolidaysToggle || !recommendHolidaysAiBtn) return;
    if (autoRecommendHolidaysToggle.checked) {
        recommendHolidaysAiBtn.textContent = 'หยุดแนะนำอัตโนมัติ';
        recommendHolidaysAiBtn.classList.remove('ios-button-gray');
        recommendHolidaysAiBtn.classList.add('bg-orange-500', 'hover:bg-orange-600', 'text-white');
    } else {
        recommendHolidaysAiBtn.textContent = 'แนะนำวันหยุดด้วย AI';
        recommendHolidaysAiBtn.classList.add('ios-button-gray');
        recommendHolidaysAiBtn.classList.remove('bg-orange-500', 'hover:bg-orange-600', 'text-white');
    }
}

function handleAddHoliday() {
    if(!holidayModalYearDisplay || !holidayDateInput || !holidayDescriptionInput) return;
    const yearToEdit = holidayModalYearDisplay.textContent;
    const date = holidayDateInput.value;
    const description = holidayDescriptionInput.value.trim();
    if (date && description) {
        if (!academicYearSettings[yearToEdit]) {
            academicYearSettings[yearToEdit] = { term1: {}, term2: {}, holidays: [] };
        }
        if (!academicYearSettings[yearToEdit].holidays) academicYearSettings[yearToEdit].holidays = [];

        if (!academicYearSettings[yearToEdit].holidays.find(h => h.date === date)) {
            academicYearSettings[yearToEdit].holidays.push({ date, description });
            academicYearSettings[yearToEdit].holidays.sort((a,b) => new Date(a.date) - new Date(b.date));
            populateHolidayListDisplay(yearToEdit);
            holidayDateInput.value = '';
            holidayDescriptionInput.value = '';
        } else {
            showToast('วันหยุดนี้มีอยู่แล้ว', 'warning');
        }
    } else {
        showToast('กรุณากรอกวันที่และรายละเอียดวันหยุด', 'warning');
    }
}

async function handleSaveSystemSettings() {
    if(!settingsAcademicYearInput || !term1StartDateInput || !term1EndDateInput || !term2StartDateInput || !term2EndDateInput) return;
    const yearToSave = settingsAcademicYearInput.value;
    if (!academicYearSettings[yearToSave]) {
        academicYearSettings[yearToSave] = { term1: {}, term2: {}, holidays: [] };
    }
    if (!academicYearSettings[yearToSave].term1) academicYearSettings[yearToSave].term1 = {};
    if (!academicYearSettings[yearToSave].term2) academicYearSettings[yearToSave].term2 = {};

    academicYearSettings[yearToSave].term1.startDate = term1StartDateInput.value;
    academicYearSettings[yearToSave].term1.endDate = term1EndDateInput.value;
    academicYearSettings[yearToSave].term2.startDate = term2StartDateInput.value;
    academicYearSettings[yearToSave].term2.endDate = term2EndDateInput.value;
    // Holidays are saved via their own modal's save button

    try {
        await setDocument(`${APP_DB_PREFIX}_academicYearDetails`, yearToSave, academicYearSettings[yearToSave]);
        showToast(`บันทึกการตั้งค่าสำหรับปีการศึกษา ${yearToSave} สำเร็จ`, 'success');
        updateDashboardStatsAndStatus();
        closeModal(systemSettingsModal);
    } catch (error) {
        console.error("Error saving system settings:", error);
        showToast(`เกิดข้อผิดพลาดในการบันทึกการตั้งค่า: ${error.message}`, 'error');
    }
}

async function handleSaveNewStudent() {
    const studentIdValue = document.getElementById('new-student-id').value.trim(); // This is the custom student ID
    const prefix = newStudentPrefixSelect.value;
    const firstName = document.getElementById('new-student-firstname').value.trim();
    const lastName = document.getElementById('new-student-lastname').value.trim();
    const classId = newStudentClassSelect.value;
    const gender = document.querySelector('input[name="new-student-gender"]:checked').value;

    if (!studentIdValue || !prefix || !firstName || !lastName || !classId || !gender) {
        showToast('กรุณากรอกข้อมูลนักเรียนให้ครบถ้วน', 'warning');
        return;
    }
    // Check if custom student ID already exists for the current academic year
    const studentExists = allStudents.some(s => s.id === studentIdValue && s.academicYear === currentAcademicYear);
    if (studentExists) {
        showToast('รหัสนักเรียนนี้มีอยู่แล้วสำหรับปีการศึกษานี้', 'warning');
        return;
    }

    const className = allClasses.find(c => c.id === classId)?.name || '';
    const newStudentData = {
        id: studentIdValue, // Custom ID
        prefix, firstName, lastName, classId, className, gender,
        academicYear: parseInt(currentAcademicYear)
    };

    try {
        // Firestore document ID will be auto-generated by addDoc, or use studentIdValue if it's meant to be unique across all years
        // For simplicity, let's use studentIdValue as the Firestore document ID, assuming it's unique enough or appends year.
        // If studentIdValue is NOT globally unique, use addDoc and store studentIdValue as a field.
        // Let's assume studentIdValue is the intended Firestore document ID for this student.
        await setDocument(`${APP_DB_PREFIX}_students`, studentIdValue, newStudentData);
        allStudents.push({ ...newStudentData }); // Update local cache
        showToast('เพิ่มนักเรียนใหม่สำเร็จ', 'success');
        updateDashboardStatsAndStatus();
        closeModal(addStudentModal);
        renderTeacherManagedStudentList();
    } catch (error) {
        console.error("Error adding new student:", error);
        showToast(`เกิดข้อผิดพลาดในการเพิ่มนักเรียน: ${error.message}`, 'error');
    }
}

function handleDownloadTemplate() {
    if(!templateAcademicYearSelect) return;
    const selectedYear = templateAcademicYearSelect.value;
    const headers = [
        "รหัสโรงเรียน", "ชื่อโรงเรียน", "เลขประจำตัวประชาชน", "ชั้น", "ห้อง",
        "เลขประจำตัวนักเรียน2", "เพศ", "คำนำหน้าชื่อ", "ชื่อ", "นามสกุล",
        "วันเกิด", "อายุ(ปี)", "น้ำหนัก", "ส่วนสูง", "กลุ่มเลือด",
        "ศาสนา", "เชื้อชาติ", "สัญชาติ", "บ้านเลขที่", "หมู่",
        "ถนน/ซอย", "ตำบล", "อำเภอ", "จังหวัด", "ชื่อผู้ปกครอง",
        "นามสกุลผู้ปกครอง", "อาชีพของผู้ปกครอง", "ความเกี่ยวข้องของผู้ปกครองกับนักเรียน",
        "ชื่อบิดา", "นามสกุลบิดา", "อาชีพของบิดา", "ชื่อมารดา", "นามสกุลมารดา",
        "อาชีพของมารดา", "ความด้อยโอกาส", "ยังไม่สามารถจำหน่ายได้ (3.1.8)"
    ];
    let csvContent = "\uFEFF" + headers.join(',') + "\n";
    const dummyData = [
        ["SC001", "โรงเรียนสาธิต", "1234567890123", "ม.1", "1", "1001", "ชาย", "เด็กชาย", "สมศักดิ์", "สุขใจ", "2012-01-15", "12", "45", "150", "A", "พุทธ", "ไทย", "ไทย", "123", "5", "สุขุมวิท", "คลองเตย", "วัฒนา", "กรุงเทพ", "สมชาย", "สุขใจ", "ค้าขาย", "บิดา", "สมชาย", "สุขใจ", "ค้าขาย", "สมหญิง", "สุขใจ", "แม่บ้าน", "", ""],
    ];
    dummyData.forEach(row => {
        csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `student_template_year_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('ดาวน์โหลดเทมเพลตสำเร็จ!', 'success');
    closeModal(downloadTemplateModal);
}

async function handleConfirmImportStudent() {
    const fileInput = document.getElementById('student-file-input');
    if(!fileInput || !importAcademicYearSelect) return;
    const selectedYear = parseInt(importAcademicYearSelect.value);
    if (fileInput.files.length === 0) {
        showToast('กรุณาเลือกไฟล์สำหรับนำเข้า', 'warning');
        return;
    }
    const file = fileInput.files[0];
    showToast(`กำลังประมวลผลไฟล์: ${file.name} สำหรับปี ${selectedYear}...`, 'info');

    // Placeholder for CSV/Excel parsing logic
    // You would use a library like PapaParse for CSV or SheetJS (xlsx) for Excel
    // Example with PapaParse (you'd need to include it):
    // Papa.parse(file, {
    //     header: true,
    //     skipEmptyLines: true,
    //     complete: async function(results) {
    //         const studentsFromFile = results.data;
    //         let successCount = 0;
    //         let errorCount = 0;
    //         for (const studentData of studentsFromFile) {
    //             try {
    //                 // Adapt studentData fields to your Firestore student structure
    //                 const studentDoc = {
    //                     id: studentData['เลขประจำตัวนักเรียน2'] || crypto.randomUUID(), // Or your preferred ID logic
    //                     prefix: studentData['คำนำหน้าชื่อ'],
    //                     firstName: studentData['ชื่อ'],
    //                     lastName: studentData['นามสกุล'],
    //                     classId: mapClassNameToId(studentData['ชั้น'], studentData['ห้อง']), // You'll need a mapping function
    //                     className: `${studentData['ชั้น']}/${studentData['ห้อง']}`,
    //                     gender: studentData['เพศ'] === 'ชาย' ? 'male' : (studentData['เพศ'] === 'หญิง' ? 'female' : 'unknown'),
    //                     academicYear: selectedYear,
    //                     // ... other fields
    //                 };
    //                 await setDocument(`${APP_DB_PREFIX}_students`, studentDoc.id, studentDoc);
    //                 successCount++;
    //             } catch (e) {
    //                 console.error("Error importing student:", studentData, e);
    //                 errorCount++;
    //             }
    //         }
    //         showToast(`นำเข้าสำเร็จ ${successCount} รายการ, ผิดพลาด ${errorCount} รายการ`, 'success');
    //         await loadStudentsFromFirestore(currentAcademicYear); // Refresh student list
    //         closeModal(importStudentModal);
    //     },
    //     error: function(error) {
    //         showToast(`เกิดข้อผิดพลาดในการอ่านไฟล์: ${error.message}`, 'error');
    //     }
    // });
    showToast(`(Placeholder) การนำเข้าไฟล์ ${file.name} ยังไม่ได้ถูกพัฒนา`, 'info');
    closeModal(importStudentModal);
}

function updateSavingToggleLabel() {
    if(!savingTypeToggle || !savingTypeLabelDeposit || !savingTypeLabelWithdraw) return;
    const isWithdraw = savingTypeToggle.checked;
    savingTypeLabelDeposit.classList.toggle('text-green-600', !isWithdraw);
    savingTypeLabelDeposit.classList.toggle('font-semibold', !isWithdraw);
    savingTypeLabelDeposit.classList.toggle('text-gray-500', isWithdraw);
    savingTypeLabelWithdraw.classList.toggle('text-red-600', isWithdraw);
    savingTypeLabelWithdraw.classList.toggle('font-semibold', isWithdraw);
    savingTypeLabelWithdraw.classList.toggle('text-gray-500', !isWithdraw);
    savingTypeToggle.nextElementSibling.classList.toggle('withdraw-active', isWithdraw);
}

async function renderSavingsList() {
    if(!savingsListContainer || !savingsClassFilter || !allClasses) return;
    savingsListContainer.innerHTML = '';
    const selectedClassId = savingsClassFilter.value;

    // Filter local cache first
    let savingsToDisplay = savingsRecords.filter(r =>
        r.academicYear === currentAcademicYear &&
        (selectedClassId === 'all' || r.classId === selectedClassId) &&
        (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(r.classId))
    );
    savingsToDisplay.sort((a,b) => new Date(b.date) - new Date(a.date));

    if (savingsToDisplay.length === 0) {
        savingsListContainer.innerHTML = `<div class="p-4 text-center text-gray-500">ไม่มีข้อมูลการออม</div>`;
        return;
    }

    // Calculate running balances for displayed items
    const studentBalances = {};
    const allSavingsForYear = [...savingsRecords] // Use a copy for balance calculation
        .filter(r => r.academicYear === currentAcademicYear && (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(r.classId)))
        .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending for balance

    allSavingsForYear.forEach(record => {
        studentBalances[record.studentId] = studentBalances[record.studentId] || 0;
        if (record.type === 'deposit') {
            studentBalances[record.studentId] += record.amount;
        } else if (record.type === 'withdraw') {
            studentBalances[record.studentId] -= record.amount;
        }
    });


    savingsToDisplay.forEach(record => {
        const item = document.createElement('div');
        item.className = 'student-list-item flex items-center justify-between cursor-pointer hover:bg-gray-50';
        item.dataset.studentId = record.studentId;
        item.dataset.studentName = record.studentName;

        const amountColor = record.type === 'withdraw' ? 'text-red-500' : 'text-green-600';
        const typeText = record.type === 'withdraw' ? 'ถอน' : 'ฝาก';
        // Get the final balance for this student to display, not running balance per transaction line
        const finalBalanceForStudent = studentBalances[record.studentId] || 0;
        const balanceColor = finalBalanceForStudent >= 0 ? 'text-green-600' : 'text-red-600';

        item.innerHTML = `
            <div>
                <div class="font-medium">${record.studentName} <span class="text-xs text-gray-400">(${allClasses.find(c=>c.id === record.classId)?.name || 'N/A'})</span></div>
                <div class="text-sm text-gray-500">วันที่: ${new Date(record.date  + 'T00:00:00').toLocaleDateString('th-TH')} | <span class="${amountColor}">${typeText}: ${record.amount.toLocaleString()} บาท</span> | ยอดคงเหลือ นร.: <span class="${balanceColor}">${finalBalanceForStudent.toLocaleString()} บาท</span></div>
            </div>
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        `;
        item.addEventListener('click', () => showIndividualSavingsModal(record.studentId, record.studentName));
        savingsListContainer.appendChild(item);
    });
}

function showIndividualSavingsModal(studentId, studentName) {
    if(!individualSavingsModalTitle || !individualSavingsList) return;
    individualSavingsModalTitle.textContent = `รายการออมของ ${studentName}`;
    individualSavingsList.innerHTML = '';
    const studentSavings = savingsRecords.filter(r =>
        r.studentId === studentId &&
        r.academicYear === currentAcademicYear &&
        (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(r.classId))
    )
    .sort((a,b) => new Date(a.date) - new Date(b.date)); // Ascending for running balance

    if (studentSavings.length === 0) {
        individualSavingsList.innerHTML = '<p class="p-3 text-sm text-gray-500">ไม่มีรายการออมสำหรับนักเรียนคนนี้</p>';
    } else {
        let currentBalance = 0;
        studentSavings.forEach(record => {
            if (record.type === 'deposit') {
                currentBalance += record.amount;
            } else if (record.type === 'withdraw') {
                currentBalance -= record.amount;
            }
            const amountColor = record.type === 'withdraw' ? 'text-red-500' : 'text-green-600';
            const typeText = record.type === 'withdraw' ? 'ถอน' : 'ฝาก';
            const balanceColor = currentBalance >= 0 ? 'text-green-600' : 'text-red-600';
            const itemDiv = document.createElement('div');
            itemDiv.className = 'student-list-item grid grid-cols-3 items-center gap-2';
            itemDiv.innerHTML = `
                <span class="text-sm col-span-1">${new Date(record.date + 'T00:00:00').toLocaleDateString('th-TH', {day:'2-digit', month:'short', year:'numeric'})}</span>
                <span class="text-sm ${amountColor} col-span-1 text-left">${typeText}: ${record.amount.toLocaleString()} บาท</span>
                <span class="text-sm ${balanceColor} col-span-1 text-right">คงเหลือ: ${currentBalance.toLocaleString()} บาท</span>
            `;
            individualSavingsList.appendChild(itemDiv);
        });
    }
    openModal(individualSavingsModal);
}

function updateSavingsSummary() {
    if(!totalSavingsAmountEl || !studentsSavingCountEl) return;
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    const filteredSavings = savingsRecords.filter(r =>
        r.academicYear === currentAcademicYear &&
        (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(r.classId))
    );
    filteredSavings.forEach(r => {
        if (r.type === 'deposit') totalDeposits += r.amount;
        else if (r.type === 'withdraw') totalWithdrawals += r.amount;
    });
    const netSavings = totalDeposits - totalWithdrawals;
    const uniqueSavers = new Set(filteredSavings.map(r => r.studentId)).size;
    totalSavingsAmountEl.textContent = `฿ ${netSavings.toLocaleString()}`;
    studentsSavingCountEl.textContent = `${uniqueSavers} คน`;
}

async function handleSaveNewSaving() {
    if(!savingStudentSelect || !savingDateInput || !savingAmountInput || !savingTypeToggle) return;
    const studentId = savingStudentSelect.value;
    const date = savingDateInput.value;
    let amount = parseFloat(savingAmountInput.value);
    const type = savingTypeToggle.checked ? 'withdraw' : 'deposit';

    if (!studentId || !date || isNaN(amount) || amount <= 0) {
        showToast('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง', 'warning');
        return;
    }
    const student = allStudents.find(s => s.id === studentId);
    if (!student) {
        showToast('ไม่พบข้อมูลนักเรียน', 'error');
        return;
    }
    const newSavingData = {
        studentId,
        studentName: `${student.prefix}${student.firstName} ${student.lastName}`,
        classId: student.classId,
        date, amount, type,
        academicYear: parseInt(currentAcademicYear)
    };
    try {
        const docRef = await addDocument(`${APP_DB_PREFIX}_savingsTransactions`, newSavingData);
        savingsRecords.push({ id: docRef, ...newSavingData }); // Add to local cache with Firestore ID
        renderSavingsList();
        updateSavingsSummary();
        closeModal(addSavingModal);
        savingStudentSelect.value = '';
        savingAmountInput.value = '';
        showToast('บันทึกรายการออมสำเร็จ', 'success');
    } catch (error) {
        console.error("Error saving new saving record:", error);
        showToast(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`, 'error');
    }
}

async function renderHealthList() {
    if(!healthListContainer || !healthClassFilter || !allClasses) return;
    healthListContainer.innerHTML = '';
    const selectedClassId = healthClassFilter.value;
    let healthToDisplay = healthRecords.filter(r =>
        r.academicYear === currentAcademicYear &&
        (selectedClassId === 'all' || r.classId === selectedClassId) &&
        (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(r.classId))
    );
    healthToDisplay.sort((a,b) => new Date(b.date) - new Date(a.date));

    if (healthToDisplay.length === 0) {
        healthListContainer.innerHTML = `<div class="p-4 text-center text-gray-500">ไม่มีข้อมูลสุขภาพ</div>`;
        return;
    }
    healthToDisplay.forEach(record => {
        const item = document.createElement('div');
        const statusClass = record.status === 'normal' ? 'health-item-normal' : 'health-item-watchout';
        const statusTextColor = record.status === 'normal' ? 'text-green-600' : 'text-red-600';
        item.className = `student-list-item flex items-center justify-between ${statusClass} cursor-pointer hover:bg-gray-50`;
        item.dataset.recordId = record.id; // Firestore document ID
        item.innerHTML = `
            <div>
                <div class="font-medium">${record.studentName} <span class="text-xs text-gray-400">(${allClasses.find(c=>c.id === record.classId)?.name || 'N/A'})</span></div>
                <div class="text-sm text-gray-500">
                    น้ำหนัก: ${record.weight} กก. | ส่วนสูง: ${record.height} ซม. |
                    BMI: ${record.bmi} (<span class="${statusTextColor}">${record.notes}</span>)
                </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        `;
        item.addEventListener('click', () => showHealthDetailModal(record));
        healthListContainer.appendChild(item);
    });
}

function showHealthDetailModal(record) {
    if(!healthDetailModalTitle || !healthDetailContent || !allClasses) return;
    healthDetailModalTitle.textContent = `รายละเอียดสุขภาพของ ${record.studentName}`;
    healthDetailContent.innerHTML = `
        <p><strong>รหัสนักเรียน:</strong> ${record.studentId}</p>
        <p><strong>ชั้นเรียน:</strong> ${allClasses.find(c => c.id === record.classId)?.name || 'N/A'}</p>
        <p><strong>วันที่บันทึก:</strong> ${new Date(record.date + 'T00:00:00').toLocaleDateString('th-TH')}</p>
        <p><strong>น้ำหนัก:</strong> ${record.weight} กก.</p>
        <p><strong>ส่วนสูง:</strong> ${record.height} ซม.</p>
        <p><strong>BMI:</strong> ${record.bmi} (<span class="${record.status === 'normal' ? 'text-green-600' : 'text-red-600'}">${record.notes}</span>)</p>
        <p><strong>หมายเหตุเพิ่มเติม:</strong> ${record.notes || '-'}</p>
    `;
    openModal(healthDetailModal);
}

function updateHealthSummary() {
    if(!healthNormalCountEl || !healthWatchoutCountEl) return;
    let normalCount = 0;
    let watchoutCount = 0;
    const latestHealthByStudent = {};
    const filteredHealth = healthRecords.filter(r =>
        r.academicYear === currentAcademicYear &&
        (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(r.classId))
    );
    filteredHealth.forEach(r => {
        if (!latestHealthByStudent[r.studentId] || new Date(r.date) > new Date(latestHealthByStudent[r.studentId].date)) {
            latestHealthByStudent[r.studentId] = r;
        }
    });
    Object.values(latestHealthByStudent).forEach(record => {
        if (record.status === 'normal') normalCount++;
        else watchoutCount++;
    });
    healthNormalCountEl.textContent = `${normalCount} คน`;
    healthWatchoutCountEl.textContent = `${watchoutCount} คน`;
}

async function handleSaveNewHealthRecord() {
    if(!healthStudentSelect || !healthDateInput || !healthWeightInput || !healthHeightInput || !healthNotesInput) return;
    const studentId = healthStudentSelect.value;
    const date = healthDateInput.value;
    const weight = parseFloat(healthWeightInput.value);
    const height = parseFloat(healthHeightInput.value);
    const notes = healthNotesInput.value.trim();

    if (!studentId || !date || isNaN(weight) || weight <=0 || isNaN(height) || height <=0) {
        showToast('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง', 'warning');
        return;
    }
    const student = allStudents.find(s => s.id === studentId);
    if (!student) {
        showToast('ไม่พบข้อมูลนักเรียน', 'error');
        return;
    }
    const heightM = height / 100;
    const bmi = parseFloat((weight / (heightM * heightM)).toFixed(1));
    const status = bmi > 25 || bmi < 18.5 ? 'watchout' : 'normal';
    const autoNotes = notes || (status === 'watchout' ? (bmi > 25 ? 'น้ำหนักเกิน' : 'น้ำหนักน้อย') : 'สมส่วน');

    const newHealthData = {
        studentId,
        studentName: `${student.prefix}${student.firstName} ${student.lastName}`,
        classId: student.classId,
        date, weight, height, bmi, notes: autoNotes, status,
        academicYear: parseInt(currentAcademicYear)
    };
    try {
        const docRef = await addDocument(`${APP_DB_PREFIX}_healthEntries`, newHealthData);
        healthRecords.push({ id: docRef, ...newHealthData }); // Add to local cache
        renderHealthList();
        updateHealthSummary();
        closeModal(addHealthRecordModal);
        healthStudentSelect.value = '';
        healthWeightInput.value = '';
        healthHeightInput.value = '';
        healthNotesInput.value = '';
        showToast('บันทึกข้อมูลสุขภาพสำเร็จ', 'success');
    } catch (error) {
        console.error("Error saving new health record:", error);
        showToast(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`, 'error');
    }
}

function populateFilters() {
    const historyClassFilter = document.getElementById('history-class-filter');
    const reportClassFilter = document.getElementById('report-class-filter');
    const historyMonthFilter = document.getElementById('history-month-filter');

    if(historyClassFilter) populateClassSelect(historyClassFilter);
    if(reportClassFilter) populateClassSelect(reportClassFilter);

    if(historyMonthFilter) {
        historyMonthFilter.innerHTML = '';
        // This needs to query distinct months from Firestore attendance data for the current year
        // For now, using local attendanceHistory as a placeholder if it were populated
        const historyForYear = attendanceHistory.filter(h => h.academicYear === currentAcademicYear);
        const uniqueMonths = [...new Set(historyForYear.map(h => h.date.substring(0, 7)))].sort().reverse();
        uniqueMonths.forEach(monthStr => {
            const option = document.createElement('option');
            option.value = monthStr;
            const d = new Date(monthStr + '-01T00:00:00'); // Ensure correct date parsing
            option.textContent = d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
            historyMonthFilter.appendChild(option);
        });
        if (historyMonthFilter.options.length > 0) historyMonthFilter.value = uniqueMonths[0];
    }
}

function initAttendanceLineChart() {
    const chartEl = document.getElementById('attendance-chart');
    if(!chartEl) return;
    const ctx = chartEl.getContext('2d');
    if (attendanceLineChart) attendanceLineChart.destroy();
    attendanceLineChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [
            { label: 'มาเรียน (%)', data: [], borderColor: 'rgba(0, 122, 255, 1)', backgroundColor: 'rgba(0, 122, 255, 0.2)', tension: 0.3, fill: true },
            { label: 'ขาดเรียน (%)', data: [], borderColor: 'rgba(255, 59, 48, 1)', backgroundColor: 'rgba(255, 59, 48, 0.2)', tension: 0.3, fill: true }
        ]},
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: value => value + '%' }}}}
    });
    updateAttendanceHistoryDisplay();
}

async function updateAttendanceHistoryDisplay() {
    if (!attendanceLineChart || !document.getElementById('history-class-filter') || !document.getElementById('history-month-filter') || !document.getElementById('attendance-history-list') || !document.getElementById('average-attendance-rate')) return;

    const selectedClassId = document.getElementById('history-class-filter').value;
    const selectedMonth = document.getElementById('history-month-filter').value; // YYYY-MM
    const historyListEl = document.getElementById('attendance-history-list');
    historyListEl.innerHTML = '';

    // Fetch attendance data for the selected month and year from Firestore
    // This requires querying documents where the ID starts with `${currentAcademicYear}_${selectedMonth}`
    // Example: /attendance/{academicYear}_{date}
    let monthlyAttendanceDocs = [];
    if (selectedMonth) {
        const attendanceDocsSnap = await db.collection(`${APP_DB_PREFIX}_attendance`)
            .where(firebase.firestore.FieldPath.documentId(), ">=", `${currentAcademicYear}_${selectedMonth}-01`)
            .where(firebase.firestore.FieldPath.documentId(), "<=", `${currentAcademicYear}_${selectedMonth}-31`) // Adjust for days in month
            .orderBy(firebase.firestore.FieldPath.documentId())
            .get();
        attendanceDocsSnap.forEach(doc => monthlyAttendanceDocs.push({ date: doc.id.split('_')[1], records: doc.data().records }));
    } else {
        // Load all for the year if no month selected (can be large, consider pagination)
        // For demo, let's assume it's filtered by a selected month.
        historyListEl.innerHTML = '<p class="p-4 text-center text-gray-500">กรุณาเลือกเดือนเพื่อดูประวัติ</p>';
        return;
    }


    const chartLabels = [];
    const presentRates = [];
    const absentRates = [];
    let totalPresentRateSum = 0;
    let daysForAverage = 0;

    monthlyAttendanceDocs.forEach(entry => {
        const studentsForCalc = selectedClassId === 'all'
                                ? allStudents.filter(s => s.academicYear === currentAcademicYear && (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId)))
                                : allStudents.filter(s => s.classId === selectedClassId && s.academicYear === currentAcademicYear && (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId)));
        if (studentsForCalc.length === 0) return;

        let presentCount = 0;
        studentsForCalc.forEach(s => {
            if (entry.records && entry.records[s.id] === true) presentCount++;
        });

        const rate = (studentsForCalc.length > 0 ? (presentCount / studentsForCalc.length) : 0) * 100;
        chartLabels.push(new Date(entry.date + 'T00:00:00').toLocaleDateString('th-TH', {day: 'numeric', month: 'short'}));
        presentRates.push(rate);
        absentRates.push(100 - rate);
        totalPresentRateSum += rate;
        daysForAverage++;

        const item = document.createElement('div');
        item.className = 'student-list-item flex items-center justify-between';
        item.innerHTML = `
            <div>
                <div class="font-medium">${new Date(entry.date + 'T00:00:00').toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div class="text-xs text-gray-500">${selectedClassId === 'all' ? 'ทุกชั้น' : (allClasses.find(c => c.id === selectedClassId)?.name || 'N/A')} - นักเรียน ${studentsForCalc.length} คน</div>
            </div>
            <div class="text-right">
                <div class="font-medium ${rate > 70 ? 'text-green-600' : 'text-orange-600'}">${rate.toFixed(0)}% มาเรียน</div>
                <div class="text-xs text-gray-500">${presentCount} คน</div>
            </div>`;
        historyListEl.appendChild(item);
    });

    attendanceLineChart.data.labels = chartLabels;
    attendanceLineChart.data.datasets[0].data = presentRates;
    attendanceLineChart.data.datasets[1].data = absentRates;
    attendanceLineChart.update();

    const avgRate = daysForAverage > 0 ? (totalPresentRateSum / daysForAverage) : 0;
    document.getElementById('average-attendance-rate').textContent = `${avgRate.toFixed(0)}%`;

    if (monthlyAttendanceDocs.length === 0) {
        historyListEl.innerHTML = '<p class="p-4 text-center text-gray-500">ไม่มีข้อมูลประวัติสำหรับเดือนนี้</p>';
    }
}

function updateReportDetails() {
    const reportClassFilterEl = document.getElementById('report-class-filter');
    const reportDetailsEl = document.getElementById('report-details');
    const reportDateEl = document.getElementById('report-date');
    const reportPresentCountEl = document.getElementById('report-present-count');
    const reportAbsentCountEl = document.getElementById('report-absent-count');

    if(!reportClassFilterEl || !reportDetailsEl || !reportDateEl || !reportPresentCountEl || !reportAbsentCountEl) return;

    const selectedClassId = reportClassFilterEl.value;
    reportDetailsEl.innerHTML = '';
    reportDateEl.textContent = new Date(currentSelectedDate + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    const studentsForReport = selectedClassId === 'all'
        ? allStudents.filter(s => s.academicYear === currentAcademicYear && (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId)))
        : allStudents.filter(s => s.classId === selectedClassId && s.academicYear === currentAcademicYear && (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId)));

    if (studentsForReport.length === 0) {
        reportDetailsEl.innerHTML = '<p class="p-4 text-center text-gray-500">ไม่มีนักเรียนในกลุ่มที่เลือก</p>';
        reportPresentCountEl.textContent = `0 (0%)`;
        reportAbsentCountEl.textContent = `0 (0%)`;
        return;
    }

    let presentCount = 0;
    studentsForReport.forEach(s => { if (attendanceDataForSelectedDate[s.id] === true) presentCount++; });
    const absentCount = studentsForReport.length - presentCount;
    const presentRate = (studentsForReport.length > 0 ? (presentCount / studentsForReport.length * 100) : 0).toFixed(0);
    const absentRate = (studentsForReport.length > 0 ? (absentCount / studentsForReport.length * 100) : 0).toFixed(0);

    reportPresentCountEl.textContent = `${presentCount} (${presentRate}%)`;
    reportAbsentCountEl.textContent = `${absentCount} (${absentRate}%)`;

    if (selectedClassId === 'all') {
        const classesToDisplayInReport = teacherProfile.isAdmin
                                        ? allClasses
                                        : allClasses.filter(cls => teacherProfile.responsibleClasses.includes(cls.id));
        classesToDisplayInReport.forEach(cls => {
            const classStudents = studentsForReport.filter(s => s.classId === cls.id);
            if (classStudents.length === 0) return;
            let classPresent = 0;
            classStudents.forEach(s => { if (attendanceDataForSelectedDate[s.id] === true) classPresent++; });
            const classRate = (classStudents.length > 0 ? (classPresent / classStudents.length * 100) : 0).toFixed(0);
            const item = document.createElement('div');
            item.className = 'student-list-item flex items-center justify-between';
            item.innerHTML = `<div><div class="font-medium">${cls.name}</div><div class="text-xs text-gray-500">นักเรียน ${classStudents.length} คน</div></div><div class="text-right"><div class="font-medium">${classRate}%</div><div class="text-xs">${classPresent} มา</div></div>`;
            reportDetailsEl.appendChild(item);
        });
    } else {
        studentsForReport.sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'th')).forEach(s => {
            const isPresent = attendanceDataForSelectedDate[s.id];
            const item = document.createElement('div');
            item.className = 'student-list-item flex items-center justify-between';
            item.innerHTML = `<div><div class="font-medium">${s.prefix}${s.firstName} ${s.lastName}</div><div class="text-xs text-gray-500">รหัส: ${s.id}</div></div><div class="${isPresent ? 'text-green-600' : 'text-red-600'} font-medium">${isPresent ? 'มาเรียน' : 'ขาดเรียน'}</div>`;
            reportDetailsEl.appendChild(item);
        });
    }
}

function handleExportCsv() {
    const reportClassFilterEl = document.getElementById('report-class-filter');
    if(!reportClassFilterEl) return;
    const selectedClassId = reportClassFilterEl.value;
    const studentsForReport = selectedClassId === 'all'
        ? allStudents.filter(s => s.academicYear === currentAcademicYear && (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId)))
        : allStudents.filter(s => s.classId === selectedClassId && s.academicYear === currentAcademicYear && (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId)));

    if (studentsForReport.length === 0) {
        showToast('ไม่มีข้อมูลสำหรับส่งออก', 'warning');
        return;
    }
    let csvContent = "\uFEFFรหัสนักเรียน,คำนำหน้า,ชื่อ,นามสกุล,ชั้นเรียน,สถานะการมาเรียน\n";
    studentsForReport.forEach(s => {
        const status = attendanceDataForSelectedDate[s.id] === true ? 'มาเรียน' : (attendanceDataForSelectedDate[s.id] === false ? 'ขาดเรียน' : 'ยังไม่เช็ค');
        const row = [s.id, s.prefix, s.firstName, s.lastName, s.className, status].join(',');
        csvContent += row + "\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `รายงานการมาเรียน_${currentSelectedDate}_${selectedClassId === 'all' ? 'ทุกชั้น' : allClasses.find(c=>c.id === selectedClassId)?.name || selectedClassId}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

async function handleDeleteAllStudents() {
    if (!teacherProfile.isAdmin) {
        showToast('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถลบข้อมูลนักเรียนทั้งหมดได้', 'error');
        return;
    }
    if (confirm(`Admin: ยืนยันการลบนักเรียนทั้งหมดสำหรับปีการศึกษา ${currentAcademicYear} ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้และจะลบข้อมูลที่เกี่ยวข้องทั้งหมด (การเข้าเรียน, ออมทรัพย์, สุขภาพ) ของนักเรียนในปีนี้ด้วย`)) {
        try {
            showToast('กำลังลบข้อมูลนักเรียนทั้งหมด...', 'info');
            // Delete all students for the current academic year
            const studentsToDelete = await queryDocuments(`${APP_DB_PREFIX}_students`, where("academicYear", "==", parseInt(currentAcademicYear)));
            for (const student of studentsToDelete) {
                await deleteDocument(`${APP_DB_PREFIX}_students`, student.id);
                // TODO: Add deletion of related savings, health, and modify attendance records
                // This part can be complex and might require batched writes or a Cloud Function for efficiency and atomicity.
            }
            allStudents = []; // Clear local cache

            // Clear related data for the year (simplified example)
            // attendanceDataForSelectedDate = {};
            // savingsRecords = [];
            // healthRecords = [];
            // Need to clear from Firestore as well, which is more involved.

            showToast(`ลบนักเรียนทั้งหมดสำหรับปี ${currentAcademicYear} สำเร็จ`, 'success');
            await loadStudentsFromFirestore(currentAcademicYear); // Refresh (should be empty)
            updateDashboardStatsAndStatus();
            renderTeacherManagedStudentList();
        } catch (error) {
            console.error("Error deleting all students:", error);
            showToast(`เกิดข้อผิดพลาดในการลบนักเรียนทั้งหมด: ${error.message}`, 'error');
        }
    }
}


async function renderUserListForAdmin() {
    if(!userListDisplay || !teacherProfile.isAdmin) return;
    userListDisplay.innerHTML = '';
    const users = await queryDocuments(`${APP_DB_PREFIX}_users`); // Fetch all user profiles
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'p-1.5 border-b border-gray-200 flex justify-between items-center';
        userDiv.innerHTML = `
            <span>${user.email || user.id} (สิทธิ์: ${user.role || 'user'})</span>
            <button data-userid="${user.id}" class="edit-user-btn text-xs text-blue-500 hover:text-blue-700 p-1">แก้ไข</button>
        `;
        userListDisplay.appendChild(userDiv);
    });
    userListDisplay.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userIdToEdit = e.target.dataset.userid;
            const userToEdit = await getDocument(`${APP_DB_PREFIX}_users`, userIdToEdit);
            if (userToEdit && userFormModalTitle && userFormMode && editingUserIdHidden && userFormIdInput && userFormPasswordInput && userFormRoleSelect && userFormResponsibleClassesCheckboxes) {
                userFormModalTitle.textContent = 'แก้ไขผู้ใช้งาน';
                userFormMode.value = 'edit';
                editingUserIdHidden.value = userIdToEdit;
                userFormIdInput.value = userToEdit.email || userIdToEdit; // Display email
                userFormIdInput.setAttribute('readonly', true); // Email/UID not editable here
                userFormPasswordInput.value = ''; // Password change handled by Firebase Auth flows
                userFormPasswordInput.placeholder = "เว้นว่าง (จัดการรหัสผ่านผ่าน Firebase Auth)";
                userFormRoleSelect.value = userToEdit.role || 'user';
                populateResponsibleClassesCheckboxes(userFormResponsibleClassesCheckboxes, userToEdit.responsibleClasses || []);
                openModal(userFormModal);
            }
        });
    });
}

async function handleSaveUserForm() {
    if(!userFormMode || !editingUserIdHidden || !userFormIdInput || !userFormRoleSelect || !userFormResponsibleClassesCheckboxes) return;
    const mode = userFormMode.value;
    const userId = editingUserIdHidden.value; // For edit mode, this is the Firebase UID
    const email = userFormIdInput.value.trim(); // This is displayed, but not changed here
    const role = userFormRoleSelect.value;
    const responsibleClasses = getSelectedResponsibleClasses(userFormResponsibleClassesCheckboxes);

    if (mode === 'edit') {
        if (!userId) {
            showToast("ไม่พบ ID ผู้ใช้สำหรับแก้ไข", "error");
            return;
        }
        try {
            await updateDocument(`${APP_DB_PREFIX}_users`, userId, { role, responsibleClasses });
            showToast(`อัปเดตข้อมูลผู้ใช้ ${email} สำเร็จ`, 'success');
            // If the edited user is the current admin, update their local profile
            if (auth.currentUser && auth.currentUser.uid === userId) {
                teacherProfile.role = role;
                teacherProfile.isAdmin = role === 'admin';
                teacherProfile.responsibleClasses = responsibleClasses;
                updateAdminView();
                // Refresh data views that depend on responsible classes
                populateClassListForAttendance();
            }
        } catch (error) {
            console.error("Error updating user:", error);
            showToast(`เกิดข้อผิดพลาดในการอัปเดตผู้ใช้: ${error.message}`, 'error');
        }
    } else if (mode === 'add') {
        // Adding a new user should ideally involve Firebase Auth user creation (e.g., createUserWithEmailAndPassword)
        // Then, create the profile document in Firestore.
        // This simplified form assumes auth user is created elsewhere or this is just for local roles.
        // For a full Firebase app, this needs to be integrated with Auth user creation.
        showToast("การเพิ่มผู้ใช้ใหม่ต้องทำผ่านระบบ Firebase Authentication ก่อน แล้วจึงกำหนดสิทธิ์ที่นี่", "info");
        // Example:
        // const newPassword = userFormPasswordInput.value;
        // if (!newPassword) { showToast("กรุณากำหนดรหัสผ่านสำหรับผู้ใช้ใหม่", "warning"); return; }
        // try {
        // const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, newPassword);
        // const newUserId = userCredential.user.uid;
        // await setDocument(`${APP_DB_PREFIX}_users`, newUserId, { email, role, responsibleClasses, name: "ผู้ใช้ใหม่" });
        // showToast(`สร้างผู้ใช้งาน ${email} สำเร็จ`, 'success');
        // } catch (error) { showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error'); }
    }
    await renderUserListForAdmin();
    closeModal(userFormModal);
}

function populateResponsibleClassesCheckboxes(containerElement, selectedClasses = []) {
    if(!containerElement) return;
    containerElement.innerHTML = '';
    allClasses.forEach(cls => {
        const isChecked = selectedClasses.includes(cls.id);
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'flex items-center';
        checkboxDiv.innerHTML = `
            <input type="checkbox" id="class-${cls.id}-${containerElement.id}" value="${cls.id}" class="form-checkbox h-4 w-4 text-blue-600 rounded" ${isChecked ? 'checked' : ''}>
            <label for="class-${cls.id}-${containerElement.id}" class="ml-2 text-gray-700">${cls.name}</label>
        `;
        containerElement.appendChild(checkboxDiv);
    });
}

function getSelectedResponsibleClasses(containerElement) {
    if(!containerElement) return [];
    const selected = [];
    containerElement.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        selected.push(checkbox.value);
    });
    return selected;
}

async function renderCurrentClassListForAdmin() {
    if(!currentClassListDisplay || !teacherProfile.isAdmin) return;
    currentClassListDisplay.innerHTML = '';
    if (allClasses.length === 0) {
        currentClassListDisplay.innerHTML = '<p class="text-gray-500">ยังไม่มีชั้นเรียน</p>';
        return;
    }
    allClasses.forEach(cls => {
        const classDiv = document.createElement('div');
        classDiv.className = 'flex justify-between items-center p-1.5 border-b border-gray-200';
        classDiv.innerHTML = `
            <span>${cls.name} (ID: ${cls.id})</span>
            <button data-class-id="${cls.id}" class="remove-class-btn text-red-500 text-xs hover:text-red-700 p-1">&times; ลบ</button>
        `;
        currentClassListDisplay.appendChild(classDiv);
    });
    currentClassListDisplay.querySelectorAll('.remove-class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const classIdToRemove = e.target.dataset.classId;
            if (confirm(`ยืนยันการลบชั้นเรียน ID: ${classIdToRemove}? การดำเนินการนี้ไม่สามารถย้อนกลับได้`)) {
                try {
                    await deleteDocument(`${APP_DB_PREFIX}_classes`, classIdToRemove);
                    allClasses = allClasses.filter(c => c.id !== classIdToRemove); // Update local cache
                    showToast(`ลบชั้นเรียน ${classIdToRemove} สำเร็จ`, 'success');
                    await loadClassesFromFirestore(); // Refresh from DB
                    updateAllClassDependentDropdowns();
                    populateClassListForAttendance();
                } catch (error) {
                    console.error("Error deleting class:", error);
                    showToast(`เกิดข้อผิดพลาดในการลบชั้นเรียน: ${error.message}`, 'error');
                }
            }
        });
    });
}

async function handleAddNewClassToList() {
    if(!newClassNameInput) return;
    const newName = newClassNameInput.value.trim();
    if (!newName) {
        showToast('กรุณากรอกชื่อชั้นเรียน', 'warning');
        return;
    }
    // Generate an ID, e.g., based on name or a UUID. For simplicity, use name (slugified).
    const newId = newName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9ก-๙-]/gi, '');
    if (allClasses.find(c => c.id === newId || c.name === newName)) {
        showToast('ชื่อชั้นเรียนหรือ ID นี้มีอยู่แล้ว', 'warning');
        return;
    }
    try {
        await setDocument(`${APP_DB_PREFIX}_classes`, newId, { name: newName });
        allClasses.push({ id: newId, name: newName }); // Update local cache
        showToast(`เพิ่มชั้นเรียน ${newName} สำเร็จ`, 'success');
        await loadClassesFromFirestore(); // Refresh from DB
        newClassNameInput.value = '';
        updateAllClassDependentDropdowns();
        populateClassListForAttendance();
    } catch (error) {
        console.error("Error adding new class:", error);
        showToast(`เกิดข้อผิดพลาดในการเพิ่มชั้นเรียน: ${error.message}`, 'error');
    }
}

function updateAllClassDependentDropdowns() {
    populateClassSelect(savingsClassFilter);
    populateClassSelect(healthClassFilter);
    populateClassSelect(newStudentClassSelect, false);
    const historyClassFilterEl = document.getElementById('history-class-filter');
    if(historyClassFilterEl) populateClassSelect(historyClassFilterEl);
    const reportClassFilterEl = document.getElementById('report-class-filter');
    if(reportClassFilterEl) populateClassSelect(reportClassFilterEl);
    populateAcademicYearSelects();
}

function openModal(modalElement) {
    if(!modalElement) return;
    if (modalElement.id === 'system-settings-modal' && settingsAcademicYearInput) {
        settingsAcademicYearInput.value = currentAcademicYear;
        loadSettingsForSelectedYear(); // This now calls loadAcademicYearSettingsFromFirestore
    }
    if (modalElement.id === 'manage-users-modal') {
        renderUserListForAdmin();
    }
    if (modalElement.id === 'manage-classes-modal') {
        renderCurrentClassListForAdmin();
    }
    modalElement.classList.add('active');
}
function closeModal(modalElement) {
    if(!modalElement) return;
    modalElement.classList.remove('active');
}

// Initialize Firebase and then the app logic
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebaseServices(); // This sets up onAuthStateChanged which will call initializeAppLogic
});
