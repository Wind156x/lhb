// main.js
// ไฟล์นี้จัดการตรรกะหลักของแอปพลิเคชัน การโต้ตอบกับ UI และ Event Listener

import { 
    auth, db, userId, isAuthReady, teacherProfile, ADMIN_UID, appId,
    showToast, openModal, closeModal, signInAdminWithGoogle, signOutUser, signInAdminWithEmail,
    formatDateToYYYYMMDD, parseDateString, fetchData, saveData, deleteData, setupRealtimeListener
} from './firebase.js';

import { 
    allStudents, allClasses, academicYearSettings, setGlobalData,
    inferGenderFromPrefix, populatePrefixSelect, populateStudentSelectInModal, populateClassSelect,
    populateResponsibleClassesCheckboxes, getSelectedResponsibleClasses, updateAllClassDependentDropdowns,
    populateAcademicYearSelects, getCurrentTerm, calculateBMI, getBMIStatus, recommendHolidaysAI
} from './utils.js';

// ตัวแปรสถานะหลักของแอปพลิเคชัน
let currentSelectedDate = new Date().toISOString().split('T')[0];
let currentAcademicYear = new Date().getFullYear() + 543; 
let attendanceData = {}; // สถานะการเข้าเรียนของนักเรียนในวันที่เลือก
let attendanceHistory = []; // ประวัติการเข้าเรียนทั้งหมด
let currentClassForModal = null; // ชั้นเรียนที่กำลังดูใน Modal
let currentGenderForModal = 'male'; // เพศที่เลือกใน Modal เช็คชื่อ
let attendanceLineChart = null; // Instance ของ Chart.js
let savingsRecords = []; // บันทึกการออมเงิน
let healthRecords = []; // บันทึกสุขภาพ

// DOM Elements (ประกาศตัวแปรสำหรับเข้าถึง Element ต่างๆ ใน HTML)
const pages = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('.nav-item');
const headerTitle = document.getElementById('header-title');
const currentDateElement = document.getElementById('current-date');
const dateSelectorDisplay = document.getElementById('date-selector-display');
const adminLoginStatusBtn = document.getElementById('admin-login-status-btn');
const datePickerInputTrigger = document.getElementById('date-picker-input-trigger'); 
const presentStatCard = document.getElementById('present-stat-card');
const presentCountEl = document.getElementById('present-count');
const presentPercentEl = document.getElementById('present-percent');
const absentCountEl = document.getElementById('absent-count');
const absentPercentEl = document.getElementById('absent-percent');
const totalDaysAttendedOverallEl = document.getElementById('total-days-attended-overall');
const classesCheckedDisplay = document.getElementById('classes-checked-display');
const classesCheckedProgress = document.getElementById('classes-checked-progress'); 
const totalDaysProgress = document.getElementById('total-days-progress'); 
const classSelectionHeader = document.getElementById('class-selection-header');
const classSelectionContent = document.getElementById('class-selection-content');
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
const teacherIdInput = document.getElementById('teacher-id-input'); // ไม่มีใน HTML เดิม
const teacherNameInput = document.getElementById('teacher-name-input'); // ไม่มีใน HTML เดิม
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
const adminLoginError = document.getElementById('admin-login-error');
const adminActionsModal = document.getElementById('admin-actions-modal');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const manageUsersModal = document.getElementById('manage-users-modal');
const addNewUserBtnMain = document.getElementById('add-new-user-btn-main'); 
const userFormModal = document.getElementById('user-form-modal'); 
const userFormModalTitle = document.getElementById('user-form-modal-title');
const userFormMode = document.getElementById('user-form-mode');
const editingUserIdHidden = document.getElementById('editing-user-id-hidden');
const userFormIdInput = document.getElementById('user-form-id-input');
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


// ฟังก์ชันเริ่มต้นแอปพลิเคชันหลัก
// ฟังก์ชันนี้จะถูกเรียกโดย onAuthStateChanged ใน firebase.js เมื่อ Auth พร้อมใช้งาน
window.initializeAppLogic = async function() {
    if (window.initializeAppLogic.hasRun) return;
    window.initializeAppLogic.hasRun = true;

    console.log("initializeAppLogic called with userId:", userId);
    
    // โหลดข้อมูลเริ่มต้นจาก Firestore หรือใช้ข้อมูลตัวอย่าง
    await loadInitialData(); 
    setGlobalData(allStudents, allClasses, academicYearSettings); // อัปเดตข้อมูล global ใน utils.js

    setupEventListeners();
    
    updateDateDisplay(new Date(currentSelectedDate));
    
    populateClassListForAttendance();
    populateFilters();
    updateDashboardStatsAndStatus(); 
    initAttendanceLineChart();
    
    renderProfileData();
    updateAdminView();
    
    populateAcademicYearSelects(importAcademicYearSelect, templateAcademicYearSelect, currentAcademicYear);
    populateClassSelect(savingsClassFilter);
    populateClassSelect(healthClassFilter);
    populateClassSelect(newStudentClassSelect, false); 
    populatePrefixSelect(newStudentPrefixSelect, 'male'); 

    settingsAcademicYearInput.value = currentAcademicYear; 
    loadSettingsForSelectedYear(); 

    renderSavingsList();
    updateSavingsSummary();
    renderHealthList();
    updateHealthSummary();
    updateAcademicYearDisplays();
    renderUserListForAdmin(); 
    renderCurrentClassListForAdmin(); 
};
window.initializeAppLogic.hasRun = false; 

async function loadInitialData() {
    try {
        // โหลด Classes
        const classesFromDb = await fetchData(`artifacts/${appId}/public/data/classes`);
        if (classesFromDb.length > 0) {
            allClasses = classesFromDb;
        } else {
            // หากไม่มีข้อมูลใน DB ให้ใช้ข้อมูลตัวอย่าง
            allClasses = [
                { id: 'm1', name: 'ม.1' }, { id: 'm2', name: 'ม.2' },
                { id: 'm3', name: 'ม.3' }, { id: 'm4', name: 'ม.4' },
                { id: 'm5', name: 'ม.5' }, { id: 'm6', name: 'ม.6' }
            ];
            // บันทึกข้อมูลตัวอย่างลง DB
            for (const cls of allClasses) {
                await saveData(`artifacts/${appId}/public/data/classes`, cls, cls.id);
            }
        }

        // โหลด Students
        const studentsFromDb = await fetchData(`artifacts/${appId}/public/data/students`, [['academicYear', '==', currentAcademicYear]]);
        if (studentsFromDb.length > 0) {
            allStudents = studentsFromDb;
        } else {
            // หากไม่มีข้อมูลใน DB ให้สร้างข้อมูลตัวอย่าง
            const prefixesMale = ['เด็กชาย', 'นาย'];
            const prefixesFemale = ['เด็กหญิง', 'นางสาว'];
            const firstNamesMale = ['สมชาย', 'วิรัช', 'ประยุทธ', 'ทักษิณ', 'อภิสิทธิ์', 'ธนาธร', 'เอกชัย', 'บรรหาร'];
            const firstNamesFemale = ['สมหญิง', 'ยุพิน', 'ยิ่งลักษณ์', 'สุดารัตน์', 'ช่อลดา', 'พรรณิการ์', 'กัลยา', 'ทิพย์สุดา'];
            const lastNames = ['ใจดี', 'รักเรียน', 'มีทรัพย์', 'สุขสบาย', 'เจริญพร', 'รุ่งเรือง', 'พัฒนา', 'ก้าวหน้า'];
            
            let studentIdCounter = 1000;
            allStudents = [];
            allClasses.forEach(cls => {
                for (let i = 0; i < 8; i++) { 
                    const prefix = prefixesMale[Math.floor(Math.random() * prefixesMale.length)];
                    allStudents.push({
                        id: String(studentIdCounter++),
                        prefix: prefix,
                        firstName: firstNamesMale[Math.floor(Math.random() * firstNamesMale.length)],
                        lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
                        classId: cls.id,
                        className: cls.name,
                        gender: inferGenderFromPrefix(prefix),
                        academicYear: currentAcademicYear 
                    });
                }
                for (let i = 0; i < 7; i++) { 
                    const prefix = prefixesFemale[Math.floor(Math.random() * prefixesFemale.length)];
                    allStudents.push({
                        id: String(studentIdCounter++),
                        prefix: prefix,
                        firstName: firstNamesFemale[Math.floor(Math.random() * firstNamesFemale.length)],
                        lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
                        classId: cls.id,
                        className: cls.name,
                        gender: inferGenderFromPrefix(prefix),
                        academicYear: currentAcademicYear
                    });
                }
            });
            // บันทึกข้อมูลนักเรียนตัวอย่างลง DB
            for (const student of allStudents) {
                await saveData(`artifacts/${appId}/public/data/students`, student, student.id);
            }
        }

        // โหลด Academic Year Settings
        const settingsDocSnap = await getDoc(doc(db, `artifacts/${appId}/public/data/settings`, String(currentAcademicYear)));
        if (settingsDocSnap.exists()) {
            academicYearSettings[currentAcademicYear] = settingsDocSnap.data();
        } else {
            // หากไม่มี ให้สร้างค่าเริ่มต้น
            const currentJsYear = new Date().getFullYear();
            academicYearSettings[currentAcademicYear] = {
                term1: { startDate: `${currentJsYear}-05-15`, endDate: `${currentJsYear}-10-15` },
                term2: { startDate: `${currentJsYear}-11-01`, endDate: `${currentJsYear + 1}-03-15` },
                holidays: [
                    { date: `${currentJsYear}-07-28`, description: 'วันเฉลิมพระชนมพรรษา ร.10' },
                    { date: `${currentJsYear}-08-12`, description: 'วันแม่แห่งชาติ' },
                    { date: `${currentJsYear}-10-13`, description: 'วันคล้ายวันสวรรคต ร.9' },
                    { date: `${currentJsYear}-12-05`, description: 'วันพ่อแห่งชาติ' },
                    { date: `${currentJsYear}-12-10`, description: 'วันรัฐธรรมนูญ' },
                ]
            };
            await saveData(`artifacts/${appId}/public/data/settings`, academicYearSettings[currentAcademicYear], String(currentAcademicYear));
        }

        // โหลด Attendance Data สำหรับวันที่ปัจจุบัน
        const attendanceSnapshot = await getDoc(doc(db, `artifacts/${appId}/public/data/attendance`, currentSelectedDate));
        if (attendanceSnapshot.exists()) {
            attendanceData = attendanceSnapshot.data().records || {};
        } else {
            // หากไม่มีข้อมูล ให้สร้างข้อมูลสุ่ม
            allStudents.filter(s => s.academicYear === currentAcademicYear).forEach(student => {
                attendanceData[student.id] = Math.random() < 0.85; 
            });
            await saveData(`artifacts/${appId}/public/data/attendance`, { date: currentSelectedDate, records: attendanceData, academicYear: currentAcademicYear }, currentSelectedDate);
        }

        // โหลด Attendance History (สำหรับกราฟและรายงาน)
        attendanceHistory = await fetchData(`artifacts/${appId}/public/data/attendance`, [['academicYear', '==', currentAcademicYear]]);
        attendanceHistory.sort((a,b) => new Date(a.date) - new Date(b.date));

        // โหลด Savings Records
        savingsRecords = await fetchData(`artifacts/${appId}/public/data/savings`, [['academicYear', '==', currentAcademicYear]]);

        // โหลด Health Records
        healthRecords = await fetchData(`artifacts/${appId}/public/data/health`, [['academicYear', '==', currentAcademicYear]]);

    } catch (error) {
        console.error("Error loading initial data:", error);
        showToast("เกิดข้อผิดพลาดในการโหลดข้อมูลเริ่มต้น: " + error.message, "error");
    }
}

function updateAcademicYearDisplays() {
    savingsAcademicYearDisplay.textContent = currentAcademicYear;
    healthAcademicYearDisplay.textContent = currentAcademicYear;
    currentYearInSubpageElements.forEach(el => el.textContent = currentAcademicYear);
}

// Event Listeners Setup
function setupEventListeners() {
    navItems.forEach(item => item.addEventListener('click', handleNavClick));
    adminLoginStatusBtn.addEventListener('click', handleAdminStatusClick);
    
    dateSelectorDisplay.addEventListener('click', () => {
        document.getElementById('date-picker-input').value = currentSelectedDate; 
        openModal(document.getElementById('date-picker-modal'));
    });
    document.getElementById('confirm-date-btn').addEventListener('click', () => {
        currentSelectedDate = document.getElementById('date-picker-input').value;
        updateDateDisplay(new Date(currentSelectedDate));
        handleConfirmDateFromTrigger({ target: { value: currentSelectedDate } }); 
        closeModal(document.getElementById('date-picker-modal'));
    });

    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => closeModal(e.target.closest('.ios-modal')));
    });
    document.querySelectorAll('.ios-modal').forEach(modal => {
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(modal); });
    });

    attendanceModalGenderSegment.querySelectorAll('.ios-segment').forEach(segment => {
        segment.addEventListener('click', () => handleAttendanceModalGenderChange(segment.dataset.gender));
    });
    attendanceModalMarkAllPresentBtn.addEventListener('click', handleAttendanceModalMarkAllPresent);
    saveAttendanceModalBtn.addEventListener('click', handleSaveAttendanceFromModal);

    saveProfileBtn.addEventListener('click', handleSaveProfile);
    changePasswordBtn.addEventListener('click', () => {
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
        openModal(changePasswordModal);
    }); 
    saveNewPasswordBtn.addEventListener('click', handleChangePassword); 
    
    if (openSystemSettingsModalBtn) {
        openSystemSettingsModalBtn.addEventListener('click', () => {
            settingsAcademicYearInput.value = currentAcademicYear;
            loadSettingsForSelectedYear();
            openModal(systemSettingsModal);
        });
    }

    settingsAcademicYearInput.addEventListener('change', loadSettingsForSelectedYear); 
    settingsAcademicYearInput.addEventListener('keyup', (e) => { 
        if (e.key === 'Enter') loadSettingsForSelectedYear();
    });

    manageUsersBtn.addEventListener('click', () => openModal(manageUsersModal));
    addNewUserBtnMain.addEventListener('click', () => { 
        userFormModalTitle.textContent = 'เพิ่มผู้ใช้งานใหม่';
        userFormMode.value = 'add';
        userFormIdInput.value = '';
        userFormIdInput.removeAttribute('readonly'); 
        userFormPasswordInput.value = '';
        userFormRoleSelect.value = 'user';
        populateResponsibleClassesCheckboxes(userFormResponsibleClassesCheckboxes, []); 
        openModal(userFormModal);
    });
    saveUserFormBtn.addEventListener('click', handleSaveUserForm); 

    if(manageClassesBtn) { 
        manageClassesBtn.addEventListener('click', () => openModal(manageClassesModal));
    }
    if(manageUsersBtn) { 
        manageUsersBtn.addEventListener('click', () => openModal(manageUsersModal));            
    }
    addNewClassBtn.addEventListener('click', handleAddNewClassToList);


    openHolidaySettingsModalBtn.addEventListener('click', () => {
        holidayModalYearDisplay.textContent = settingsAcademicYearInput.value; 
        populateHolidayListDisplay(settingsAcademicYearInput.value); 
        openModal(holidaySettingsModal);
    });
    addHolidayBtn.addEventListener('click', handleAddHoliday);
    recommendHolidaysAiBtn.addEventListener('click', handleRecommendHolidaysAIWrapper); 
    autoRecommendHolidaysToggle.addEventListener('change', updateRecommendHolidaysButtonState); 
    saveHolidaysBtn.addEventListener('click', async () => {
        await handleSaveSystemSettings(); // Save current academic year settings including holidays
        closeModal(holidaySettingsModal);
        loadSettingsForSelectedYear(); 
    });

    document.getElementById('add-student-btn').addEventListener('click', () => {
        document.getElementById('new-student-id').value = '';
        newStudentGenderRadios[0].checked = true; 
        populatePrefixSelect(newStudentPrefixSelect, 'male'); 
        document.getElementById('new-student-firstname').value = '';
        document.getElementById('new-student-lastname').value = '';
        newStudentClassSelect.value = '';
        openModal(addStudentModal);
    });
    newStudentGenderRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            populatePrefixSelect(newStudentPrefixSelect, e.target.value);
        });
    });
    document.getElementById('save-new-student-btn').addEventListener('click', handleSaveNewStudent);

    manageStudentsByTeacherBtn.addEventListener('click', () => {
        populateClassSelect(teacherManageClassFilter); 
        teacherManageClassFilter.value = 'all'; 
        teacherManageGenderFilter.value = 'all'; 
        renderTeacherManagedStudentList();
        openModal(manageStudentsByTeacherModal);
    });
    teacherManageClassFilter.addEventListener('change', renderTeacherManagedStudentList); 
    teacherManageGenderFilter.addEventListener('change', renderTeacherManagedStudentList); 

    addStudentByTeacherBtn.addEventListener('click', () => {
        document.getElementById('new-student-id').value = '';
        newStudentGenderRadios[0].checked = true; 
        populatePrefixSelect(newStudentPrefixSelect, 'male');
        document.getElementById('new-student-firstname').value = '';
        document.getElementById('new-student-lastname').value = '';
        
        const responsibleClasses = teacherProfile.isAdmin ? allClasses.map(c => c.id) : teacherProfile.responsibleClasses;
        if (responsibleClasses.length === 1) {
            newStudentClassSelect.value = responsibleClasses[0];
            newStudentClassSelect.setAttribute('disabled', true); 
        } else {
            newStudentClassSelect.value = '';
            newStudentClassSelect.removeAttribute('disabled');
        }
        openModal(addStudentModal);
    });


    document.getElementById('import-student-btn').addEventListener('click', () => openModal(importStudentModal));
    document.getElementById('download-template-btn').addEventListener('click', handleDownloadTemplate); 
    if(confirmImportStudentBtn) {
        confirmImportStudentBtn.addEventListener('click', handleConfirmImportStudent);
    }


    savingsClassFilter.addEventListener('change', () => {
        renderSavingsList();
        const selectedClass = allClasses.find(c => c.id === savingsClassFilter.value);
        savingsListClassDisplay.textContent = selectedClass ? selectedClass.name : (savingsClassFilter.value === 'all' ? 'ทุกห้อง (รวมทั้งปี)' : 'N/A');
    });
    healthClassFilter.addEventListener('change', () => {
        renderHealthList();
        const selectedClass = allClasses.find(c => c.id === healthClassFilter.value);
        healthListClassDisplay.textContent = selectedClass ? selectedClass.name : (healthClassFilter.value === 'all' ? 'ทุกห้อง (รวมทั้งปี)' : 'N/A');
    });


    addNewSavingBtn.addEventListener('click', () => {
        const selectedClassId = savingsClassFilter.value;
        if (!selectedClassId || selectedClassId === 'all') {
            showToast('กรุณาเลือกห้องเรียนจากด้านบนก่อนบันทึกการออม', 'warning');
            return;
        }
        const selectedClass = allClasses.find(c => c.id === selectedClassId);
        savingModalClassName.textContent = selectedClass ? selectedClass.name : '';
        populateStudentSelectInModal(savingStudentSelect, selectedClassId, currentAcademicYear, "เลือกนักเรียนในห้อง...");
        savingDateInput.value = new Date().toISOString().split('T')[0]; 
        savingTypeToggle.checked = false; 
        updateSavingToggleLabel();
        openModal(addSavingModal);
    });
    savingTypeToggle.addEventListener('change', updateSavingToggleLabel);
    saveNewSavingBtn.addEventListener('click', handleSaveNewSaving);

    addNewHealthRecordBtn.addEventListener('click', () => {
        const selectedClassId = healthClassFilter.value;
         if (!selectedClassId || selectedClassId === 'all') {
            showToast('กรุณาเลือกห้องเรียนจากด้านบนก่อนบันทึกสุขภาพ', 'warning');
            return;
        }
        const selectedClass = allClasses.find(c => c.id === selectedClassId);
        healthModalClassName.textContent = selectedClass ? selectedClass.name : '';
        populateStudentSelectInModal(healthStudentSelect, selectedClassId, currentAcademicYear, "เลือกนักเรียนในห้อง...");
        healthDateInput.value = new Date().toISOString().split('T')[0]; 
        openModal(addHealthRecordModal);
    });
    saveNewHealthRecordBtn.addEventListener('click', handleSaveNewHealthRecord);
    
    document.getElementById('history-class-filter').addEventListener('change', updateAttendanceHistoryDisplay);
    document.getElementById('history-month-filter').addEventListener('change', updateAttendanceHistoryDisplay);
    document.getElementById('report-class-filter').addEventListener('change', updateReportDetails);
    
    showHistoryBtn.addEventListener('click', () => showProfileSubPage('history'));
    showReportBtn.addEventListener('click', () => showProfileSubPage('report'));
    
    if(deleteAllStudentsBtn){
        deleteAllStudentsBtn.addEventListener('click', async () => {
            if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อนักเรียนทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
                // ลบนักเรียนทั้งหมดจาก Firestore
                for (const student of allStudents) {
                    await deleteData(`artifacts/${appId}/public/data/students`, student.id);
                }
                allStudents = []; // เคลียร์ array ใน memory
                showToast('รายชื่อนักเรียนทั้งหมดถูกลบแล้ว', 'success');
                updateDashboardStatsAndStatus(); 
                renderTeacherManagedStudentList();
            }
        });
    }
    exportCsvBtn.addEventListener('click', handleExportCsv);

    // Initial update for the recommend holidays button state
    updateRecommendHolidaysButtonState();
}

// Admin Login & User Management
function handleAdminStatusClick() {
    if (auth.currentUser && teacherProfile.isAdmin) { 
        openModal(adminActionsModal);
    } else {
        openModal(adminLoginModal);
        if(adminLoginError) {
            adminLoginError.classList.add('hidden');
            adminLoginError.textContent = '';
        }
    }
}

if (googleAdminLoginBtn) {
    googleAdminLoginBtn.addEventListener('click', async () => {
        const errorElement = adminLoginError;
        if (errorElement) {
            errorElement.classList.add('hidden');
            errorElement.textContent = '';
        }
        try {
            const user = await signInAdminWithGoogle();
            if (user.uid !== ADMIN_UID) {
                showToast("บัญชี Google นี้ไม่ได้รับสิทธิ์ผู้ดูแลระบบ", "error");
                signOutUser(); 
            } else {
                closeModal(adminLoginModal);
                showToast("เข้าสู่ระบบผู้ดูแลระบบด้วย Google สำเร็จ!", "success");
            }
        } catch (error) {
            let errorMessage = "เกิดข้อผิดพลาดในการลงชื่อเข้าใช้ด้วย Google: ";
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = "หน้าต่างลงชื่อเข้าใช้ถูกปิดก่อนดำเนินการสำเร็จ";
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessage = "คำขอลงชื่อเข้าใช้ซ้ำซ้อน ถูกยกเลิก";
            } else {
                errorMessage += error.message;
            }
            if (errorElement) {
                errorElement.textContent = errorMessage;
                errorElement.classList.remove('hidden');
            }
        }
    });
}

if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', async () => {
        try {
            await signOutUser();
            closeModal(adminActionsModal);
            showToast("ออกจากระบบผู้ดูแลระบบแล้ว", "success");
        } catch (error) {
            showToast("เกิดข้อผิดพลาดในการออกจากระบบ: " + error.message, "error");
        }
    });
}

function updateAdminView() {
    adminSettingsSection.classList.toggle('hidden', !teacherProfile.isAdmin);
    if (teacherProfile.isAdmin) {
        adminLoginStatusBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg><span>Admin Mode</span>';
        adminLoginStatusBtn.classList.add('text-green-600');
        adminLoginStatusBtn.classList.remove('text-gray-600');
        // teacherIdInput.removeAttribute('readonly'); // Removed as these inputs are not in HTML
        // teacherNameInput.removeAttribute('readonly'); // Removed as these inputs are not in HTML
    } else {
        adminLoginStatusBtn.innerHTML = 'ผู้ดูแล'; 
        adminLoginStatusBtn.classList.remove('text-green-600');
        adminLoginStatusBtn.classList.add('text-gray-600');
        // teacherIdInput.setAttribute('readonly', true); // Removed
        // teacherNameInput.setAttribute('readonly', true); // Removed
    }
}

async function handleSaveUserForm() {
    const mode = userFormMode.value;
    const id = userFormIdInput.value.trim();
    const password = userFormPasswordInput.value;
    const role = userFormRoleSelect.value;
    const responsibleClasses = getSelectedResponsibleClasses(userFormResponsibleClassesCheckboxes);

    if (!id || (mode === 'add' && !password)) {
        showToast("กรุณากรอกรหัสผู้ใช้งานและรหัสผ่าน (สำหรับผู้ใช้ใหม่)", 'warning');
        return;
    }

    const userDocRef = doc(db, `artifacts/${appId}/users`, id);
    const userDocSnap = await getDoc(userDocRef);

    try {
        if (mode === 'add') {
            if (userDocSnap.exists()) {
                showToast("รหัสผู้ใช้งานนี้มีอยู่แล้ว", 'warning');
                return;
            }
            // สร้างผู้ใช้ใน Firebase Authentication (ถ้าจำเป็น)
            // สำหรับแอปนี้จะสมมติว่าผู้ใช้จะถูกสร้างผ่าน Google Sign-in หรือ Admin สร้างให้
            // หรือคุณสามารถเพิ่ม createUserWithEmailAndPassword ที่นี่ได้
            
            const userData = { role: role, responsibleClasses: responsibleClasses, name: `ผู้ใช้งาน ${id}` };
            await setDoc(userDocRef, userData);
            showToast(`สร้างผู้ใช้งาน ${id} (${role}) สำเร็จ`, 'success');
        } else if (mode === 'edit') {
            const originalId = editingUserIdHidden.value;
            if (id !== originalId && userDocSnap.exists()) { 
                showToast("รหัสผู้ใช้งานใหม่นี้มีอยู่แล้ว", 'warning');
                return;
            }
            
            if (id !== originalId) {
                // หากเปลี่ยน ID ผู้ใช้ จะต้องลบเอกสารเก่าและสร้างใหม่
                await deleteData(`artifacts/${appId}/users`, originalId);
            }
            const userData = { ...userDocSnap.data(), role: role, responsibleClasses: responsibleClasses }; 
            // ไม่มีการเปลี่ยนรหัสผ่านผ่านฟอร์มนี้โดยตรง ต้องไปที่ Change Password
            await setDoc(doc(db, `artifacts/${appId}/users`, id), userData);
            showToast(`อัปเดตข้อมูลผู้ใช้ ${id} สำเร็จ`, 'success');
        }

        renderUserListForAdmin(); 
        closeModal(userFormModal); 
        // อัปเดตโปรไฟล์ครูหากมีการแก้ไขโปรไฟล์ของครูที่ล็อกอินอยู่
        if (teacherProfile.id === id || teacherProfile.id === editingUserIdHidden.value) { 
            const updatedProfileSnap = await getDoc(doc(db, `artifacts/${appId}/users`, teacherProfile.id));
            if (updatedProfileSnap.exists()) {
                Object.assign(teacherProfile, updatedProfileSnap.data());
                teacherProfile.id = updatedProfileSnap.id; 
            }
            renderProfileData();
            updateAdminView();
            populateClassListForAttendance();
            updateAllClassDependentDropdowns(currentAcademicYear);
            renderSavingsList();
            updateSavingsSummary();
            renderHealthList();
            updateHealthSummary();
        }
    } catch (error) {
        console.error("Error saving user form:", error);
        showToast("เกิดข้อผิดพลาดในการบันทึกข้อมูลผู้ใช้: " + error.message, 'error');
    }
}

async function handleChangePassword() {
    const currentPass = currentPasswordInput.value;
    const newPass = newPasswordInput.value;
    const confirmNewPass = confirmNewPasswordInput.value;

    if (!currentPass || !newPass || !confirmNewPass) {
        showToast('กรุณากรอกรหัสผ่านให้ครบถ้วน', 'warning');
        return;
    }

    if (newPass.length < 6) { 
        showToast('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning');
        return;
    }
    if (newPass !== confirmNewPass) {
        showToast('รหัสผ่านใหม่ไม่ตรงกัน', 'warning');
        return;
    }

    try {

        
        // ตัวอย่าง: ถ้าใช้ Email/Password Auth
        const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPass);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPass);

        showToast('เปลี่ยนรหัสผ่านสำเร็จ! (ฟังก์ชันนี้ต้องเชื่อมต่อกับ Firebase Auth API จริง)', 'success');
        closeModal(changePasswordModal);
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
    } catch (error) {
        console.error("Error changing password:", error);
        showToast("เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน: " + error.message, 'error');
    }
}

async function renderUserListForAdmin() {
    userListDisplay.innerHTML = '';
    const users = await fetchData(`artifacts/${appId}/users`);
    if (users.length === 0) {
        userListDisplay.innerHTML = '<p class="p-1.5 text-center text-gray-500">ไม่มีผู้ใช้งาน</p>';
        return;
    }
    users.forEach(user => {
        const userDiv = document.createElement('div');
        userDiv.className = 'p-1.5 border-b border-gray-200 flex justify-between items-center';
        userDiv.innerHTML = `
            <span>${user.id} (สิทธิ์: ${user.role || 'user'})</span>
            <button data-userid="${user.id}" class="edit-user-btn text-xs text-blue-500 hover:text-blue-700 p-1">แก้ไข</button>
        `;
        userListDisplay.appendChild(userDiv);
    });
    userListDisplay.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userIdToEdit = e.target.dataset.userid;
            const userToEditSnap = await getDoc(doc(db, `artifacts/${appId}/users`, userIdToEdit));
            if (userToEditSnap.exists()) {
                const userToEdit = { id: userToEditSnap.id, ...userToEditSnap.data() };
                userFormModalTitle.textContent = 'แก้ไขผู้ใช้งาน';
                userFormMode.value = 'edit';
                editingUserIdHidden.value = userIdToEdit;
                userFormIdInput.value = userIdToEdit;
                userFormIdInput.setAttribute('readonly', true); 
                userFormPasswordInput.value = ''; 
                userFormRoleSelect.value = userToEdit.role || 'user';
                populateResponsibleClassesCheckboxes(userFormResponsibleClassesCheckboxes, userToEdit.responsibleClasses || []);
                openModal(userFormModal);
            } else {
                showToast("ไม่พบข้อมูลผู้ใช้งาน", 'error');
            }
        });
    });
}

async function renderCurrentClassListForAdmin() {
    currentClassListDisplay.innerHTML = '';
    const classesFromDb = await fetchData(`artifacts/${appId}/public/data/classes`);
    allClasses = classesFromDb; // อัปเดต global allClasses
    setGlobalData(allStudents, allClasses, academicYearSettings); // อัปเดตข้อมูล global ใน utils.js

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
            if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบชั้นเรียน ${classIdToRemove}?`)) {
                try {
                    await deleteData(`artifacts/${appId}/public/data/classes`, classIdToRemove);
                    showToast(`ชั้นเรียน ${classIdToRemove} ถูกลบแล้ว`, 'success');
                    renderCurrentClassListForAdmin(); 
                    updateAllClassDependentDropdowns(currentAcademicYear);
                    populateClassListForAttendance();
                } catch (error) {
                    showToast("เกิดข้อผิดพลาดในการลบชั้นเรียน: " + error.message, 'error');
                }
            }
        });
    });
}

async function handleAddNewClassToList() {
    const newName = newClassNameInput.value.trim();
    if (!newName) {
        showToast('กรุณากรอกชื่อชั้นเรียน', 'warning');
        return;
    }
    const newId = newName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9ก-๙]/gi, ''); 
    if (allClasses.find(c => c.id === newId || c.name === newName)) {
        showToast('ชื่อชั้นเรียนหรือ ID นี้มีอยู่แล้ว', 'warning');
        return;
    }
    try {
        await saveData(`artifacts/${appId}/public/data/classes`, { id: newId, name: newName }, newId);
        showToast(`เพิ่มชั้นเรียน ${newName} สำเร็จ`, 'success');
        renderCurrentClassListForAdmin();
        newClassNameInput.value = '';
        updateAllClassDependentDropdowns(currentAcademicYear);
        populateClassListForAttendance();
    } catch (error) {
        showToast("เกิดข้อผิดพลาดในการเพิ่มชั้นเรียน: " + error.message, 'error');
    }
}

// Navigation & Profile Sub-pages
function handleNavClick(event) {
    const targetPageId = event.currentTarget.dataset.page;
    pages.forEach(page => page.classList.toggle('active', page.id === targetPageId));
    navItems.forEach(item => item.classList.toggle('active', item.dataset.page === targetPageId));
    
    const pageTitles = {
        'attendance-page': 'เช็คชื่อ', 'savings-page': 'ออมเงิน',
        'health-page': 'สุขภาพ', 'profile-page': 'โปรไฟล์'
    };
    headerTitle.textContent = pageTitles[targetPageId] || 'ระบบเช็คชื่อ';

    profileMainContent.classList.remove('hidden'); 
    historyPageContent.classList.add('hidden');
    reportPageContent.classList.add('hidden');
    document.querySelectorAll('.ios-modal').forEach(modal => {
        modal.classList.remove('active');
    });

    if (targetPageId === 'profile-page') {
        showProfileSubPage('main'); 
    }
    if (targetPageId === 'savings-page') {
        savingsListClassDisplay.textContent = savingsClassFilter.options[savingsClassFilter.selectedIndex]?.text || 'ทุกห้อง (รวมทั้งปี)';
        renderSavingsList();
    }
    if (targetPageId === 'health-page') {
        healthListClassDisplay.textContent = healthClassFilter.options[healthClassFilter.selectedIndex]?.text || 'ทุกห้อง (รวมทั้งปี)';
        renderHealthList();
    }
}

function showProfileSubPage(subPage) { 
    profileMainContent.classList.toggle('hidden', subPage !== 'main');
    historyPageContent.classList.toggle('hidden', subPage !== 'history');
    reportPageContent.classList.toggle('hidden', subPage !== 'report');
    updateAcademicYearDisplays();

    if (subPage === 'history') {
        headerTitle.textContent = 'ประวัติการเข้าเรียน';
        updateAttendanceHistoryDisplay();
    } else if (subPage === 'report') {
        headerTitle.textContent = 'รายงานการมาเรียน';
        updateReportDetails();
    } else {
        headerTitle.textContent = 'โปรไฟล์'; 
    }
}

async function renderTeacherManagedStudentList() {
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
        btn.addEventListener('click', async (e) => {
            const studentIdToDelete = e.target.dataset.studentId;
            await handleDeleteStudentByTeacher(studentIdToDelete);
        });
    });
}

async function handleDeleteStudentByTeacher(studentId) {
    if (teacherProfile.isAdmin) {
        if (confirm(`Admin: ยืนยันการลบนักเรียน ID: ${studentId} ใช่หรือไม่?`)) {
            try {
                await deleteData(`artifacts/${appId}/public/data/students`, studentId);
                allStudents = allStudents.filter(s => s.id !== studentId);
                setGlobalData(allStudents, allClasses, academicYearSettings);
                showToast(`นักเรียน ID: ${studentId} ถูกลบแล้ว`, 'success');
                renderTeacherManagedStudentList(); 
                updateDashboardStatsAndStatus(); 
            } catch (error) {
                showToast("เกิดข้อผิดพลาดในการลบนักเรียน: " + error.message, 'error');
            }
        }
    } else {
        showToast(`ส่งคำขอลบนักเรียน ID: ${studentId} ไปยังผู้ดูแลระบบแล้ว (การลบจริงต้องได้รับการอนุมัติจาก Admin)`, 'info');
    }
}

// Date Handling
function updateDateDisplay(dateObj) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' };
    currentDateElement.textContent = dateObj.toLocaleDateString('th-TH', options);
}

async function handleConfirmDateFromTrigger(event) { 
    currentSelectedDate = event.target.value;
    updateDateDisplay(new Date(currentSelectedDate)); 
    
    const todayDate = parseDateString(new Date().toISOString().split('T')[0]);
    const selectedDateObj = parseDateString(currentSelectedDate);

    const isFutureDate = selectedDateObj > todayDate;
    
    const studentsForYear = allStudents.filter(s => s.academicYear === currentAcademicYear);
    
    // โหลด attendance data สำหรับวันที่เลือกจาก Firestore
    const attendanceDocSnap = await getDoc(doc(db, `artifacts/${appId}/public/data/attendance`, currentSelectedDate));
    if (attendanceDocSnap.exists()) {
        attendanceData = attendanceDocSnap.data().records || {};
    } else {
        // หากไม่มีข้อมูล ให้สร้างข้อมูลสุ่มและบันทึก
        attendanceData = {};
        studentsForYear.forEach(student => {
            attendanceData[student.id] = isFutureDate ? false : (Math.random() < 0.85); 
        });
        await saveData(`artifacts/${appId}/public/data/attendance`, { date: currentSelectedDate, records: attendanceData, academicYear: currentAcademicYear }, currentSelectedDate);
    }

    updateDashboardStatsAndStatus();
    populateClassListForAttendance(); 
}

// Attendance Logic
function populateClassListForAttendance() {
    classListAttendanceContainer.innerHTML = '';
    const studentsForYear = allStudents.filter(s => s.academicYear === currentAcademicYear);

    const classesToDisplay = teacherProfile.isAdmin 
                                    ? allClasses 
                                    : allClasses.filter(cls => teacherProfile.responsibleClasses.includes(cls.id));

    classesToDisplay.forEach(cls => {
        const classStudents = studentsForYear.filter(s => s.classId === cls.id);
        const totalPresent = classStudents.filter(s => attendanceData[s.id]).length;
        const totalStudentsInClass = classStudents.length;

        const classItem = document.createElement('div');
        classItem.className = 'ios-card p-3 attendance-item'; 
        classItem.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h3 class="text-md font-medium">${cls.name} <span class="text-sm text-gray-500">(${totalPresent}/${totalStudentsInClass} มา)</span></h3>
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
            const classId = e.currentTarget.dataset.classId;
            const className = e.currentTarget.dataset.className;
            openAttendanceCheckModal(classId, className);
        });
        classItem.querySelector('.view-class-attendance-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const classId = e.currentTarget.dataset.classId;
            const className = e.currentTarget.dataset.className;
            showAttendanceDetailModalForClass(classId, className);
        });
    });
}

function showAttendanceDetailModalForClass(classId, className) {
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
            const isPresent = attendanceData[student.id];
            const statusText = isPresent ? 'มาเรียน' : (attendanceData[student.id] === false ? 'ขาดเรียน' : 'ยังไม่เช็ค');
            const statusColor = isPresent ? 'text-green-600' : (attendanceData[student.id] === false ? 'text-red-600' : 'text-gray-500');

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
    attendanceModalClassTitle.textContent = `${className}`; 
    currentGenderForModal = 'male'; 
    updateAttendanceModalGenderSegments();
    loadStudentsForModal();
    openModal(attendanceCheckModal);
}

function updateAttendanceModalGenderSegments() {
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
    if (!currentClassForModal) return;
    
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
                <input type="checkbox" class="attendance-modal-toggle" data-student-id="${student.id}" ${attendanceData[student.id] ? 'checked' : ''}>
                <span class="ios-toggle-slider"></span>
            </label>
        `;
        attendanceModalStudentList.appendChild(studentItem);
        studentItem.querySelector('.attendance-modal-toggle').addEventListener('change', (e) => {
            attendanceData[e.target.dataset.studentId] = e.target.checked;
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
        attendanceData[student.id] = true;
    });
    attendanceModalStudentList.querySelectorAll('.attendance-modal-toggle').forEach(toggle => {
        const studentId = toggle.dataset.studentId;
        if (studentsOfClassAndGender.find(s => s.id === studentId)) { 
            toggle.checked = true;
        }
    });
}

async function handleSaveAttendanceFromModal() {
    const existingEntryIndex = attendanceHistory.findIndex(h => h.date === currentSelectedDate && h.academicYear === currentAcademicYear);
    
    const studentsInCurrentClass = allStudents.filter(s => 
        s.classId === currentClassForModal && 
        s.academicYear === currentAcademicYear &&
        (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId))
    );

    let hasExistingAttendanceForThisClass = false;
    if (existingEntryIndex !== -1) {
        const existingRecords = attendanceHistory[existingEntryIndex].records;
        hasExistingAttendanceForThisClass = studentsInCurrentClass.some(s => existingRecords.hasOwnProperty(s.id) && existingRecords[s.id] !== undefined);
    }

    if (hasExistingAttendanceForThisClass) {
        showToast('ไม่สามารถบันทึกได้: มีการเช็คชื่อสำหรับห้องเรียนนี้ในวันนี้แล้ว', 'warning');
        return;
    }

    // สร้างหรืออัปเดต records สำหรับวันที่ปัจจุบัน
    const newRecordsForDate = {};
    studentsInCurrentClass.forEach(s => {
        newRecordsForDate[s.id] = attendanceData[s.id];
    });

    try {
        if (existingEntryIndex !== -1) {
            // อัปเดตเฉพาะ records ของนักเรียนในชั้นเรียนปัจจุบัน
            const updatedRecords = { ...attendanceHistory[existingEntryIndex].records, ...newRecordsForDate };
            await saveData(`artifacts/${appId}/public/data/attendance`, { records: updatedRecords }, currentSelectedDate);
            attendanceHistory[existingEntryIndex].records = updatedRecords; // อัปเดตใน memory
        } else {
            // สร้างเอกสารใหม่
            const newEntry = { date: currentSelectedDate, records: newRecordsForDate, academicYear: currentAcademicYear };
            await saveData(`artifacts/${appId}/public/data/attendance`, newEntry, currentSelectedDate);
            attendanceHistory.push(newEntry); // เพิ่มใน memory
        }
        showToast('บันทึกการเช็คชื่อสำเร็จ', 'success');
    } catch (error) {
        console.error("Error saving attendance:", error);
        showToast("เกิดข้อผิดพลาดในการบันทึกการเช็คชื่อ: " + error.message, 'error');
    }

    updateDashboardStatsAndStatus();
    populateClassListForAttendance(); 
    updateAttendanceHistoryDisplay(); 
    updateReportDetails(); 
    closeModal(attendanceCheckModal);
}

function updateDashboardStatsAndStatus() { 
    let present = 0;
    const studentsForYear = allStudents.filter(s => s.academicYear === currentAcademicYear);
    const relevantStudents = studentsForYear.filter(s => attendanceData.hasOwnProperty(s.id)); 
    
    relevantStudents.forEach(student => {
        if (attendanceData[student.id]) {
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

    const yearSettings = academicYearSettings[currentAcademicYear] || { term1: {}, term2: {}, holidays: [] };
    
    let totalSchoolDaysAttendedAllTime = 0;
    attendanceHistory.filter(h => h.academicYear === currentAcademicYear).forEach(entry => {
        if (Object.values(entry.records).some(status => status !== undefined)) {
            totalSchoolDaysAttendedAllTime++;
        }
    });
    totalDaysAttendedOverallEl.textContent = `จำนวนวันเปิดเรียน(เทอมนี้) ${totalSchoolDaysAttendedAllTime} วัน`;


    let classesCheckedCount = 0;
    const classesToConsider = teacherProfile.isAdmin 
                                    ? allClasses 
                                    : allClasses.filter(cls => teacherProfile.responsibleClasses.includes(cls.id));

    classesToConsider.forEach(cls => {
        const classStudents = studentsForYear.filter(s => s.classId === cls.id);
        if (classStudents.some(s => attendanceData[s.id] !== undefined)) { 
            classesCheckedCount++;
        }
    });
    classesCheckedDisplay.textContent = `ห้องที่เช็คชื่อแล้ว ${classesCheckedCount}/${classesToConsider.length} ห้อง`;

    const classesProgress = classesToConsider.length > 0 ? (classesCheckedCount / classesToConsider.length) * 100 : 0;
    classesCheckedProgress.style.width = `${classesProgress}%`;

    const maxSchoolDaysForProgress = 100; 
    const daysProgress = (totalSchoolDaysAttendedAllTime / maxSchoolDaysForProgress) * 100;
    totalDaysProgress.style.width = `${Math.min(daysProgress, 100)}%`; 

    if(classesCheckedCount < classesToConsider.length && classesToConsider.length > 0){
        presentStatCard.classList.add('warning');
    } else {
        presentStatCard.classList.remove('warning');
    }
}

// Profile & Admin
function renderProfileData() {
    teacherNameDisplay.textContent = teacherProfile.name;
    teacherIdDisplay.textContent = `รหัสครู: ${teacherProfile.id}`;
    currentAcademicYearDisplay.textContent = `ปีการศึกษา: ${currentAcademicYear}`;
    // teacherIdInput.value = teacherProfile.id; // Removed as these inputs are not in HTML
    // teacherNameInput.value = teacherProfile.name; // Removed as these inputs are not in HTML
}

async function handleSaveProfile() {
    // ในแอปจริง ข้อมูลโปรไฟล์ควรถูกบันทึกใน Firestore
    // และควรอนุญาตให้ผู้ใช้แก้ไขได้เฉพาะข้อมูลของตนเองเท่านั้น
    // Admin อาจจะแก้ไขข้อมูลของคนอื่นได้
    try {
        const userDocRef = doc(db, `artifacts/${appId}/users`, userId);
        await setDoc(userDocRef, { name: teacherProfile.name, id: teacherProfile.id }, { merge: true });
        showToast('บันทึกข้อมูลโปรไฟล์สำเร็จ', 'success');
        renderProfileData();
        updateAdminView(); 
    } catch (error) {
        showToast("เกิดข้อผิดพลาดในการบันทึกโปรไฟล์: " + error.message, 'error');
    }
}

// System Settings (Admin)
async function loadSettingsForSelectedYear() {
    const selectedYear = parseInt(settingsAcademicYearInput.value); 
    if (isNaN(selectedYear)) {
        showToast('กรุณากรอกปีการศึกษาที่ถูกต้อง (ตัวเลข)', 'warning');
        return;
    }
    currentAcademicYear = selectedYear; 
    
    // โหลดจาก Firestore
    const settingsDocSnap = await getDoc(doc(db, `artifacts/${appId}/public/data/settings`, String(currentAcademicYear)));
    if (settingsDocSnap.exists()) {
        academicYearSettings[currentAcademicYear] = settingsDocSnap.data();
    } else {
        // หากไม่มี ให้สร้างค่าเริ่มต้น
        const currentJsYear = new Date().getFullYear();
        academicYearSettings[currentAcademicYear] = {
            term1: { startDate: `${currentJsYear}-05-15`, endDate: `${currentJsYear}-10-15` },
            term2: { startDate: `${currentJsYear}-11-01`, endDate: `${currentJsYear + 1}-03-15` },
            holidays: []
        };
        await saveData(`artifacts/${appId}/public/data/settings`, academicYearSettings[currentAcademicYear], String(currentAcademicYear));
    }
    setGlobalData(allStudents, allClasses, academicYearSettings);

    const yearSettings = academicYearSettings[currentAcademicYear];

    term1StartDateInput.value = yearSettings.term1?.startDate || '';
    term1EndDateInput.value = yearSettings.term1?.endDate || '';
    term2StartDateInput.value = yearSettings.term2?.startDate || '';
    term2EndDateInput.value = yearSettings.term2?.endDate || '';
    updateDateDisplay(new Date(currentSelectedDate)); 
    updateDashboardStatsAndStatus(); 
    populateFilters(); 
    renderProfileData(); 
    updateAcademicYearDisplays();
    renderSavingsList();
    updateSavingsSummary();
    renderHealthList();
    updateHealthSummary();
    populateClassListForAttendance();
    populateAcademicYearSelects(importAcademicYearSelect, templateAcademicYearSelect, currentAcademicYear); 
}

function populateHolidayListDisplay(year) {
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
            <span>${new Date(holiday.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}: ${holiday.description}</span>
            <button data-index="${index}" class="remove-holiday-btn text-red-500 hover:text-red-700 holiday-delete-btn">&times;</button>
        `;
        holidayListDisplay.appendChild(item);
    });
    holidayListDisplay.querySelectorAll('.remove-holiday-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const yearToEdit = holidayModalYearDisplay.textContent; 
            academicYearSettings[yearToEdit].holidays.splice(parseInt(e.target.dataset.index), 1);
            populateHolidayListDisplay(yearToEdit);
        });
    });
}

async function handleRecommendHolidaysAIWrapper() {
    const currentYear = holidayModalYearDisplay.textContent;
    const recommendedHolidays = await recommendHolidaysAI(currentYear);
    let addedCount = 0;
    if (!academicYearSettings[currentYear]) {
        academicYearSettings[currentYear] = { term1: {}, term2: {}, holidays: [] };
    }
    recommendedHolidays.forEach(recHoliday => {
        if (!academicYearSettings[currentYear].holidays.find(h => h.date === recHoliday.date)) {
            academicYearSettings[currentYear].holidays.push(recHoliday);
            addedCount++;
        }
    });
    academicYearSettings[currentYear].holidays.sort((a,b) => new Date(a.date) - new Date(b.date));
    populateHolidayListDisplay(currentYear);
    showToast(`แนะนำและเพิ่มวันหยุดสำเร็จ ${addedCount} รายการ`, 'success');
}

function updateRecommendHolidaysButtonState() {
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

async function handleAddHoliday() {
    const yearToEdit = holidayModalYearDisplay.textContent; 
    const date = holidayDateInput.value;
    const description = holidayDescriptionInput.value.trim();
    if (date && description) {
        if (!academicYearSettings[yearToEdit]) { 
            academicYearSettings[yearToEdit] = { term1: {}, term2: {}, holidays: [] };
        }
        if (!academicYearSettings[yearToEdit].holidays.find(h => h.date === date)) {
            academicYearSettings[yearToEdit].holidays.push({ date, description });
            academicYearSettings[yearToEdit].holidays.sort((a,b) => new Date(a.date) - new Date(b.date)); 
            populateHolidayListDisplay(yearToEdit);
            holidayDateInput.value = '';
            holidayDescriptionInput.value = '';
            showToast('เพิ่มวันหยุดสำเร็จ', 'success');
        } else {
            showToast('วันหยุดนี้มีอยู่แล้ว', 'warning');
        }
    } else {
        showToast('กรุณากรอกวันที่และรายละเอียดวันหยุด', 'warning');
    }
}

async function handleSaveSystemSettings() {
    const yearToSave = settingsAcademicYearInput.value;
    if (!academicYearSettings[yearToSave]) {
        academicYearSettings[yearToSave] = { term1: {}, term2: {}, holidays: [] };
    }
    academicYearSettings[yearToSave].term1.startDate = term1StartDateInput.value;
    academicYearSettings[yearToSave].term1.endDate = term1EndDateInput.value;
    academicYearSettings[yearToSave].term2.startDate = term2StartDateInput.value;
    academicYearSettings[yearToSave].term2.endDate = term2EndDateInput.value;
    
    try {
        await saveData(`artifacts/${appId}/public/data/settings`, academicYearSettings[yearToSave], String(yearToSave));
        showToast(`บันทึกการตั้งค่าสำหรับปีการศึกษา ${yearToSave} สำเร็จ`, 'success');
        updateDashboardStatsAndStatus(); 
    } catch (error) {
        showToast("เกิดข้อผิดพลาดในการบันทึกการตั้งค่าระบบ: " + error.message, 'error');
    }
}

async function handleSaveNewStudent() {
    const id = document.getElementById('new-student-id').value.trim();
    const prefix = newStudentPrefixSelect.value; 
    const firstName = document.getElementById('new-student-firstname').value.trim();
    const lastName = document.getElementById('new-student-lastname').value.trim();
    const classId = newStudentClassSelect.value;
    const gender = document.querySelector('input[name="new-student-gender"]:checked').value; 

    if (!id || !prefix || !firstName || !lastName || !classId || !gender) {
        showToast('กรุณากรอกข้อมูลนักเรียนให้ครบถ้วน', 'warning');
        return;
    }
    if (allStudents.find(s => s.id === id)) {
        showToast('รหัสนักเรียนนี้มีอยู่แล้ว', 'warning');
        return;
    }
    const className = allClasses.find(c => c.id === classId)?.name || '';
    const newStudent = {
        id, prefix, firstName, lastName, classId, className,
        gender: gender, 
        academicYear: currentAcademicYear 
    };
    try {
        await saveData(`artifacts/${appId}/public/data/students`, newStudent, id);
        allStudents.push(newStudent);
        setGlobalData(allStudents, allClasses, academicYearSettings);
        showToast('เพิ่มนักเรียนใหม่สำเร็จ', 'success');
        updateDashboardStatsAndStatus(); 
        closeModal(addStudentModal);
        renderTeacherManagedStudentList(); 
    } catch (error) {
        showToast("เกิดข้อผิดพลาดในการเพิ่มนักเรียน: " + error.message, 'error');
    }
}

async function handleDownloadTemplate() {
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
        ["SC001", "โรงเรียนสาธิต", "9876543210987", "ม.1", "1", "1002", "หญิง", "เด็กหญิง", "มาลี", "รักดี", "2012-03-20", "12", "40", "145", "B", "พุทธ", "ไทย", "ไทย", "456", "2", "ลาดพร้าว", "จอมพล", "จตุจักร", "กรุงเทพ", "มานะ", "รักดี", "รับจ้าง", "บิดา", "มานะ", "รักดี", "รับจ้าง", "มานี", "รักดี", "แม่บ้าน", "", ""]
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

function handleConfirmImportStudent() {
    const fileInput = document.getElementById('student-file-input');
    const selectedYear = importAcademicYearSelect.value;
    if (fileInput.files.length === 0) {
        showToast('กรุณาเลือกไฟล์สำหรับนำเข้า', 'warning');
        return;
    }
    const file = fileInput.files[0];
    showToast(`(Placeholder) กำลังนำเข้าไฟล์: ${file.name} สำหรับปีการศึกษา ${selectedYear}.\nคุณจะต้องพัฒนาส่วนนี้ต่อเพื่ออ่านและประมวลผลไฟล์ CSV/Excel.`, 'info');
}

// Savings Page Logic
function updateSavingToggleLabel() {
    if (savingTypeToggle.checked) { 
        savingTypeLabelDeposit.classList.remove('text-green-600', 'font-semibold');
        savingTypeLabelDeposit.classList.add('text-gray-500');
        savingTypeLabelWithdraw.classList.add('text-red-600', 'font-semibold');
        savingTypeLabelWithdraw.classList.remove('text-gray-500');
        savingTypeToggle.nextElementSibling.classList.add('withdraw-active');

    } else { 
        savingTypeLabelDeposit.classList.add('text-green-600', 'font-semibold');
        savingTypeLabelDeposit.classList.remove('text-gray-500');
        savingTypeLabelWithdraw.classList.remove('text-red-600', 'font-semibold');
        savingTypeLabelWithdraw.classList.add('text-gray-500');
        savingTypeToggle.nextElementSibling.classList.remove('withdraw-active');
    }
}

async function renderSavingsList() {
    savingsListContainer.innerHTML = '';
    const selectedClassId = savingsClassFilter.value;
    
    // โหลดข้อมูลล่าสุดจาก Firestore
    savingsRecords = await fetchData(`artifacts/${appId}/public/data/savings`, [['academicYear', '==', currentAcademicYear]]);

    let savingsToDisplay = savingsRecords.filter(r => r.academicYear === currentAcademicYear);

    if (selectedClassId !== 'all') {
        savingsToDisplay = savingsToDisplay.filter(r => r.classId === selectedClassId);
    }

    savingsToDisplay = savingsToDisplay.filter(r => 
        teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(r.classId)
    );

    savingsToDisplay.sort((a,b) => new Date(b.date) - new Date(a.date)); 

    let runningBalance = {}; 

    if (savingsToDisplay.length === 0) {
        savingsListContainer.innerHTML = `<div class="p-4 text-center text-gray-500">ไม่มีข้อมูลการออมสำหรับ${selectedClassId === 'all' ? 'ปีการศึกษานี้' : `ห้อง ${allClasses.find(c=>c.id === selectedClassId)?.name || ''}`}</div>`;
        return;
    }

    const savingsForBalanceCalc = [...savingsRecords].filter(r => r.academicYear === currentAcademicYear && (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(r.classId))).sort((a,b) => new Date(a.date) - new Date(b.date));
    savingsForBalanceCalc.forEach(record => {
        if (!runningBalance[record.studentId]) {
            runningBalance[record.studentId] = 0;
        }
        if (record.type === 'deposit') {
            runningBalance[record.studentId] += record.amount;
        } else if (record.type === 'withdraw') {
            runningBalance[record.studentId] -= record.amount;
        }
    });

    savingsToDisplay.forEach(record => {
        const item = document.createElement('div');
        item.className = 'student-list-item flex items-center justify-between cursor-pointer hover:bg-gray-50';
        item.dataset.studentId = record.studentId; 
        item.dataset.studentName = record.studentName;

        const amountColor = record.type === 'withdraw' ? 'text-red-500' : 'text-green-600';
        const typeText = record.type === 'withdraw' ? 'ถอน' : 'ฝาก';
        const balanceColor = runningBalance[record.studentId] >= 0 ? 'text-green-600' : 'text-red-600'; 

        item.innerHTML = `
            <div>
                <div class="font-medium">${record.studentName} <span class="text-xs text-gray-400">(${allClasses.find(c=>c.id === record.classId)?.name})</span></div>
                <div class="text-sm text-gray-500">วันที่: ${new Date(record.date).toLocaleDateString('th-TH')} | <span class="${amountColor}">${typeText}: ${record.amount} บาท</span> | คงเหลือ: <span class="${balanceColor}">${runningBalance[record.studentId].toLocaleString()} บาท</span></div>
            </div>
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        `;
        item.addEventListener('click', () => showIndividualSavingsModal(record.studentId, record.studentName));
        savingsListContainer.appendChild(item);
    });
}

async function showIndividualSavingsModal(studentId, studentName) {
    individualSavingsModalTitle.textContent = `รายการออมของ ${studentName}`;
    individualSavingsList.innerHTML = '';
    
    // โหลดข้อมูลล่าสุดจาก Firestore
    const studentSavings = (await fetchData(`artifacts/${appId}/public/data/savings`, [['studentId', '==', studentId], ['academicYear', '==', currentAcademicYear]]))
        .filter(r => teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(r.classId))
        .sort((a,b) => new Date(a.date) - new Date(b.date)); 
    
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
                <span class="text-sm col-span-1">${new Date(record.date).toLocaleDateString('th-TH', {day:'2-digit', month:'short', year:'numeric'})}</span>
                <span class="text-sm ${amountColor} col-span-1 text-left">${typeText}: ${record.amount.toLocaleString()} บาท</span>
                <span class="text-sm ${balanceColor} col-span-1 text-right">คงเหลือ: ${currentBalance.toLocaleString()} บาท</span>
            `;
            individualSavingsList.appendChild(itemDiv);
        });
    }
    openModal(individualSavingsModal);
}

async function updateSavingsSummary() {
    // โหลดข้อมูลล่าสุดจาก Firestore
    const savingsForYear = await fetchData(`artifacts/${appId}/public/data/savings`, [['academicYear', '==', currentAcademicYear]]);
    
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    
    const filteredSavings = savingsForYear.filter(r => 
        teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(r.classId)
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
    const studentId = savingStudentSelect.value;
    const date = savingDateInput.value;
    let amount = parseFloat(savingAmountInput.value);
    const type = savingTypeToggle.checked ? 'withdraw' : 'deposit';

    if (!studentId || !date || isNaN(amount) || amount <= 0) {
        showToast('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง', 'warning');
        return;
    }

    const isDuplicate = savingsRecords.some(r => 
        r.studentId === studentId && r.date === date && r.academicYear === currentAcademicYear
    );

    if (isDuplicate) {
        showToast('ไม่สามารถบันทึกได้: มีรายการออมสำหรับนักเรียนคนนี้ในวันนี้แล้ว', 'warning');
        return;
    }

    const student = allStudents.find(s => s.id === studentId);
    const newSavingRecord = { 
        studentId, 
        studentName: `${student.prefix}${student.firstName} ${student.lastName}`, 
        classId: student.classId, 
        date, 
        amount,
        type,
        academicYear: currentAcademicYear 
    };
    try {
        await saveData(`artifacts/${appId}/public/data/savings`, newSavingRecord);
        savingsRecords.push(newSavingRecord); // อัปเดตใน memory
        showToast('บันทึกรายการออมสำเร็จ', 'success');
        renderSavingsList(); 
        updateSavingsSummary();
        closeModal(addSavingModal);
        savingStudentSelect.value = '';
        savingAmountInput.value = '';
    } catch (error) {
        showToast("เกิดข้อผิดพลาดในการบันทึกการออม: " + error.message, 'error');
    }
}

// Health Page Logic
async function renderHealthList() {
    healthListContainer.innerHTML = '';
    const selectedClassId = healthClassFilter.value;
    
    // โหลดข้อมูลล่าสุดจาก Firestore
    healthRecords = await fetchData(`artifacts/${appId}/public/data/health`, [['academicYear', '==', currentAcademicYear]]);

    let healthToDisplay = healthRecords.filter(r => r.academicYear === currentAcademicYear);

    if (selectedClassId !== 'all') {
        healthToDisplay = healthToDisplay.filter(r => r.classId === selectedClassId);
    }

    healthToDisplay = healthToDisplay.filter(r => 
        teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(r.classId)
    );

    healthToDisplay.sort((a,b) => new Date(b.date) - new Date(a.date));
    if (healthToDisplay.length === 0) {
        healthListContainer.innerHTML = `<div class="p-4 text-center text-gray-500">ไม่มีข้อมูลสุขภาพสำหรับ${selectedClassId === 'all' ? 'ปีการศึกษานี้' : `ห้อง ${allClasses.find(c=>c.id === selectedClassId)?.name || ''}`}</div>`;
        return;
    }
    healthToDisplay.forEach(record => {
        const item = document.createElement('div');
        const statusClass = record.status === 'normal' ? 'health-item-normal' : 'health-item-watchout';
        const statusTextColor = record.status === 'normal' ? 'text-green-600' : 'text-red-600';
        item.className = `student-list-item flex items-center justify-between ${statusClass} cursor-pointer hover:bg-gray-50`; 
        item.dataset.recordId = record.studentId + '_' + record.date; 
        item.innerHTML = `
            <div>
                <div class="font-medium">${record.studentName} <span class="text-xs text-gray-400">(${allClasses.find(c=>c.id === record.classId)?.name})</span></div>
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
    healthDetailModalTitle.textContent = `รายละเอียดสุขภาพของ ${record.studentName}`;
    healthDetailContent.innerHTML = `
        <p><strong>รหัสนักเรียน:</strong> ${record.studentId}</p>
        <p><strong>ชั้นเรียน:</strong> ${allClasses.find(c => c.id === record.classId)?.name}</p>
        <p><strong>วันที่บันทึก:</strong> ${new Date(record.date).toLocaleDateString('th-TH')}</p>
        <p><strong>น้ำหนัก:</strong> ${record.weight} กก.</p>
        <p><strong>ส่วนสูง:</strong> ${record.height} ซม.</p>
        <p><strong>BMI:</strong> ${record.bmi} (<span class="${record.status === 'normal' ? 'text-green-600' : 'text-red-600'}">${record.notes}</span>)</p>
        <p><strong>หมายเหตุ:</strong> ${record.notes || '-'}</p>
    `;
    openModal(healthDetailModal);
}

async function updateHealthSummary() {
    // โหลดข้อมูลล่าสุดจาก Firestore
    const healthForYear = await fetchData(`artifacts/${appId}/public/data/health`, [['academicYear', '==', currentAcademicYear]]);
    
    let normalCount = 0;
    let watchoutCount = 0;
    const latestHealthByStudent = {};

    const filteredHealth = healthForYear.filter(r => 
        teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(r.classId)
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
    const studentId = healthStudentSelect.value;
    const date = healthDateInput.value;
    const weight = parseFloat(healthWeightInput.value);
    const height = parseFloat(healthHeightInput.value); 
    const notes = healthNotesInput.value.trim();

    if (!studentId || !date || isNaN(weight) || weight <=0 || isNaN(height) || height <=0) {
        showToast('กรุณากรอกข้อมูลให้ครบถ้วนและถูกต้อง', 'warning');
        return;
    }

    const isDuplicate = healthRecords.some(r => 
        r.studentId === studentId && r.date === date && r.academicYear === currentAcademicYear
    );

    if (isDuplicate) {
        showToast('ไม่สามารถบันทึกได้: มีข้อมูลสุขภาพสำหรับนักเรียนคนนี้ในวันนี้แล้ว', 'warning');
        return;
    }

    const student = allStudents.find(s => s.id === studentId);
    const { status, notes: autoNotes } = getBMIStatus(calculateBMI(weight, height));

    const newHealthRecord = { 
        studentId, 
        studentName: `${student.prefix}${student.firstName} ${student.lastName}`, 
        classId: student.classId, 
        date, weight, height, 
        bmi: calculateBMI(weight, height), 
        notes: notes || autoNotes, 
        status,
        academicYear: currentAcademicYear 
    };
    try {
        await saveData(`artifacts/${appId}/public/data/health`, newHealthRecord);
        healthRecords.push(newHealthRecord); // อัปเดตใน memory
        showToast('บันทึกข้อมูลสุขภาพสำเร็จ', 'success');
        renderHealthList(); 
        updateHealthSummary();
        closeModal(addHealthRecordModal);
        healthStudentSelect.value = '';
        healthWeightInput.value = '';
        healthHeightInput.value = '';
        healthNotesInput.value = '';
    } catch (error) {
        showToast("เกิดข้อผิดพลาดในการบันทึกข้อมูลสุขภาพ: " + error.message, 'error');
    }
}

// History & Report
function populateFilters() {
    const historyClassFilter = document.getElementById('history-class-filter');
    const reportClassFilter = document.getElementById('report-class-filter');
    const historyMonthFilter = document.getElementById('history-month-filter');
    
    populateClassSelect(historyClassFilter);
    populateClassSelect(reportClassFilter);
    
    historyMonthFilter.innerHTML = '';
    const historyForYear = attendanceHistory.filter(h => h.academicYear === currentAcademicYear);
    const uniqueMonths = [...new Set(historyForYear.map(h => h.date.substring(0, 7)))].sort().reverse();
    uniqueMonths.forEach(monthStr => {
        const option = document.createElement('option');
        option.value = monthStr;
        const d = new Date(monthStr + '-01');
        option.textContent = d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
        historyMonthFilter.appendChild(option);
    });
    if (historyMonthFilter.options.length > 0) historyMonthFilter.value = uniqueMonths[0]; 
}

function initAttendanceLineChart() {
    const ctx = document.getElementById('attendance-chart').getContext('2d');
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

function updateAttendanceHistoryDisplay() {
    if (!attendanceLineChart) return; 

    const selectedClassId = document.getElementById('history-class-filter').value;
    const selectedMonth = document.getElementById('history-month-filter').value;
    const historyListEl = document.getElementById('attendance-history-list');
    historyListEl.innerHTML = '';

    const studentsForYear = allStudents.filter(s => s.academicYear === currentAcademicYear);
    const filteredHistory = attendanceHistory.filter(entry => 
        entry.academicYear === currentAcademicYear && 
        (selectedMonth ? entry.date.startsWith(selectedMonth) : true)
    );
    
    const chartLabels = [];
    const presentRates = [];
    const absentRates = [];
    let totalPresentRateSum = 0;
    let daysForAverage = 0;

    filteredHistory.forEach(entry => {
        const studentsForCalc = selectedClassId === 'all' 
                                ? studentsForYear.filter(s => teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId))
                                : studentsForYear.filter(s => s.classId === selectedClassId && (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId)));
        if (studentsForCalc.length === 0) return;

        let presentCount = 0;
        studentsForCalc.forEach(s => {
            if (entry.records[s.id]) presentCount++;
        });
        
        const rate = (studentsForCalc.length > 0 ? (presentCount / studentsForCalc.length) : 0) * 100;
        chartLabels.push(new Date(entry.date).toLocaleDateString('th-TH', {day: 'numeric', month: 'short'}));
        presentRates.push(rate);
        absentRates.push(100 - rate);
        totalPresentRateSum += rate;
        daysForAverage++;

        const item = document.createElement('div');
        item.className = 'student-list-item flex items-center justify-between';
        item.innerHTML = `
            <div>
                <div class="font-medium">${new Date(entry.date).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</div>
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

    if (filteredHistory.length === 0) {
        historyListEl.innerHTML = '<p class="p-4 text-center text-gray-500">ไม่มีข้อมูลประวัติสำหรับเดือนนี้</p>';
    }
}

function updateReportDetails() {
    const selectedClassId = document.getElementById('report-class-filter').value;
    const reportDetailsEl = document.getElementById('report-details');
    reportDetailsEl.innerHTML = '';
    document.getElementById('report-date').textContent = new Date(currentSelectedDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    const studentsForReport = selectedClassId === 'all' 
        ? allStudents.filter(s => teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId))
        : allStudents.filter(s => s.classId === selectedClassId && (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId)));

    if (studentsForReport.length === 0) {
        reportDetailsEl.innerHTML = '<p class="p-4 text-center text-gray-500">ไม่มีนักเรียนในกลุ่มที่เลือกสำหรับปีการศึกษานี้</p>';
        document.getElementById('report-present-count').textContent = `0 (0%)`;
        document.getElementById('report-absent-count').textContent = `0 (0%)`;
        return;
    }

    let presentCount = 0;
    studentsForReport.forEach(s => { if (attendanceData[s.id]) presentCount++; });
    const absentCount = studentsForReport.length - presentCount;
    const presentRate = (studentsForReport.length > 0 ? (presentCount / studentsForReport.length * 100) : 0).toFixed(0);
    const absentRate = (studentsForReport.length > 0 ? (absentCount / studentsForReport.length * 100) : 0).toFixed(0);


    document.getElementById('report-present-count').textContent = `${presentCount} (${presentRate}%)`;
    document.getElementById('report-absent-count').textContent = `${absentCount} (${absentRate}%)`;

    if (selectedClassId === 'all') {
        const classesToDisplayInReport = teacherProfile.isAdmin 
                                        ? allClasses 
                                        : allClasses.filter(cls => teacherProfile.responsibleClasses.includes(cls.id));

        classesToDisplayInReport.forEach(cls => {
            const classStudents = studentsForReport.filter(s => s.classId === cls.id);
            if (classStudents.length === 0) return;
            let classPresent = 0;
            classStudents.forEach(s => { if (attendanceData[s.id]) classPresent++; });
            const classRate = (classStudents.length > 0 ? (classPresent / classStudents.length * 100) : 0).toFixed(0);
            const item = document.createElement('div');
            item.className = 'student-list-item flex items-center justify-between';
            item.innerHTML = `<div><div class="font-medium">${cls.name}</div><div class="text-xs text-gray-500">นักเรียน ${classStudents.length} คน</div></div><div class="text-right"><div class="font-medium">${classRate}%</div><div class="text-xs">${classPresent} มา</div></div>`;
            reportDetailsEl.appendChild(item);
        });
    } else {
        studentsForReport.sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'th')).forEach(s => {
            const isPresent = attendanceData[s.id];
            const item = document.createElement('div');
            item.className = 'student-list-item flex items-center justify-between';
            item.innerHTML = `<div><div class="font-medium">${s.prefix}${s.firstName} ${s.lastName}</div><div class="text-xs text-gray-500">รหัส: ${s.id}</div></div><div class="${isPresent ? 'text-green-600' : 'text-red-600'} font-medium">${isPresent ? 'มาเรียน' : 'ขาดเรียน'}</div>`;
            reportDetailsEl.appendChild(item);
        });
    }
}

function handleExportCsv() {
    const selectedClassId = document.getElementById('report-class-filter').value;
    const studentsForReport = selectedClassId === 'all' 
        ? allStudents.filter(s => teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId))
        : allStudents.filter(s => s.classId === selectedClassId && (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId)));

    if (studentsForReport.length === 0) {
        showToast('ไม่มีข้อมูลสำหรับส่งออก', 'warning');
        return;
    }

    let csvContent = "รหัสนักเรียน,คำนำหน้า,ชื่อ,นามสกุล,ชั้นเรียน,สถานะการมาเรียน\n";
    studentsForReport.forEach(s => {
        const status = attendanceData[s.id] ? 'มาเรียน' : 'ขาดเรียน';
        const row = [s.id, s.prefix, s.firstName, s.lastName, s.className, status].join(',');
        csvContent += row + "\n";
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `รายงานการมาเรียน_${currentSelectedDate}_${selectedClassId === 'all' ? 'ทุกชั้น' : selectedClassId}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
