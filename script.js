import { initializeApp as initializeFirebaseApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

        const ADMIN_UID = "De4FbjpF4uYHGOjV8HzKuK0M2Wm2"; // UID for the Firebase Admin user
        import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        const firebaseConfig = {
          apiKey: "AIzaSyCrERohH3MOKMCsZQiu6W0xLU5gsE1AyhI",
          authDomain: "dataschool185.firebaseapp.com",
          projectId: "dataschool185",
          storageBucket: "dataschool185.firebasestorage.app",
          messagingSenderId: "992145631724",
          appId: "1:992145631724:web:adf28feec2d32f3938f8c9",
          measurementId: "G-ZKCCY5GVCR"
        };
        let db, auth, userId;
        let isAuthReady = false;

        // Initialize Firebase App and Auth
        const app = initializeFirebaseApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // Firebase Auth State Change Listener
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in.
                userId = user.uid;
                console.log("User is signed in:", userId);
                isAuthReady = true;

                if (userId === ADMIN_UID) {
                    if (!teacherProfile.isAdmin) {
                        teacherProfile.isAdmin = true;
                        teacherProfile.role = 'admin'; // Set role to admin
                        adminLoginStatusBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg><span>Admin Mode</span>';
                        adminLoginStatusBtn.classList.add('admin-active');
                        adminSettingsSection.classList.remove('hidden');
                        showToast("ผู้ดูแลระบบล็อกอินอัตโนมัติแล้ว", "success");
                        // updateAdminView(); // Ensure admin view is updated
                    }
                } else {
                    // A non-admin user is signed in.
                    teacherProfile.isAdmin = false;
                    teacherProfile.role = 'viewer'; // Set role to viewer for all non-admins
                    // The redundant if block was removed.
                    // updateAdminView() called by initializeAppLogic() will correctly update UI.
                }
                initializeAppLogic(); // Call main app logic
            } else {
                // User is signed out.
                console.log("User is signed out.");
                userId = null;
                isAuthReady = true; // Auth state is known (signed out)

                if (teacherProfile.isAdmin) { // Clear admin state if admin was logged in
                    teacherProfile.isAdmin = false;
                    adminLoginStatusBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg><span>Admin Login</span>';
                    adminLoginStatusBtn.classList.remove('admin-active');
                    adminSettingsSection.classList.add('hidden');
                }

                // Attempt anonymous sign-in to allow app functionality for non-admins
                signInAnonymously(auth)
                    .then((anonymousUserCredential) => {
                        userId = anonymousUserCredential.user.uid;
                        teacherProfile.role = 'viewer'; // Explicitly set role for anonymous user
                        teacherProfile.isAdmin = false; // Ensure isAdmin is explicitly false
                        console.log('Signed in anonymously with UID:', userId);
                        initializeAppLogic(); // Call main app logic for anonymous user
                    })
                    .catch((error) => {
                        console.error('Anonymous sign-in error:', error);
                        // Handle critical error if anonymous sign-in fails and is required
                        // For now, let's proceed with a fallback UID if anon sign-in fails
                        // to allow the app to at least try to initialize.
                        if (!userId) { // Only set if not already set by a race condition
                            userId = crypto.randomUUID();
                            teacherProfile.role = 'viewer'; // Explicitly set role for fallback user
                            teacherProfile.isAdmin = false; // Ensure isAdmin is explicitly false
                            console.warn("Using fallback UUID due to anonymous sign-in error.");
                        }
                        initializeAppLogic();
                    });
            }
        });

        let currentSelectedDate = new Date().toISOString().split('T')[0];
        let currentAcademicYear = new Date().getFullYear() + 543; 
        let attendanceData = {}; 
        let allStudents = []; 
        let allClasses = []; 
        let attendanceHistory = []; 
        let currentClassForModal = null; 
        let currentGenderForModal = 'male'; 
        let attendanceLineChart = null; 
        
        let academicYearSettings = {}; 
        
        let teacherProfile = {
            id: 'T001',
            name: 'คุณครูใจดี',
            isAdmin: false,
            responsibleClasses: [],
            role: 'viewer' // Add role property, default to viewer
        };

        // userCredentials for admin is now handled by Firebase Authentication.
        // Keeping other teacher credentials if they are still used locally.
        let userCredentials = {
            'teacher01': { password: 'teacher01', role: 'user', responsibleClasses: ['m1', 'm2']},
            'teacher02': { password: 'teacher02', role: 'user', responsibleClasses: ['m3', 'm4']}
        };
        let editingUserId = null; 

        let savingsRecords = [];
        let healthRecords = [];

        // DOM Elements
        const pages = document.querySelectorAll('.page');
        const navItems = document.querySelectorAll('.nav-item');
        const headerTitle = document.getElementById('header-title');
        const currentDateElement = document.getElementById('current-date');
        const dateSelectorDisplay = document.getElementById('date-selector-display');
        const adminLoginStatusBtn = document.getElementById('admin-login-status-btn');
        // const datePickerInputTrigger = document.getElementById('date-picker-input-trigger'); // Removed unused variable
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
        const teacherIdInput = document.getElementById('teacher-id-input');
        const teacherNameInput = document.getElementById('teacher-name-input');
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
        const autoRecommendHolidaysToggle = document.getElementById('auto-recommend-holidays-toggle'); // New toggle
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
        // Removed back buttons as per request
        const deleteAllStudentsBtn = document.getElementById('delete-all-students-btn');
        // const backToProfileFromHistoryBtn = document.getElementById('back-to-profile-from-history');
        // const backToProfileFromReportBtn = document.getElementById('back-to-profile-from-report');
        const exportCsvBtn = document.getElementById('export-csv-btn');
        const currentYearInSubpageElements = document.querySelectorAll('.current-year-in-subpage');


        function showToast(message, type = 'info') {
            // Basic toast implementation (can be improved with a proper UI element)
            console.log(`Toast (${type}): ${message}`);
            // For a quick visual, use alert. Replace with a better UI element later.
            alert(`${type.toUpperCase()}: ${message}`);
        }

        // This function will contain the core application setup logic
        // It's called AFTER authentication is resolved by the global onAuthStateChanged.
        function initializeAppLogic() {
            // Ensure this function is called only once after auth is ready
            if (initializeAppLogic.hasRun) return;
            initializeAppLogic.hasRun = true;

            console.log("initializeAppLogic called with userId:", userId);
            
            loadDefaultAcademicYearSettings(currentAcademicYear); 
            loadSampleData(); 
            setupEventListeners();
            
            updateDateDisplay(new Date(currentSelectedDate));
            
            populateClassListForAttendance();
            populateFilters();
            updateDashboardStatsAndStatus(); 
            initAttendanceLineChart();
            
            renderProfileData();
            updateAdminView();
            
            populateAcademicYearSelects();
            populateClassSelect(savingsClassFilter);
            populateClassSelect(healthClassFilter);
            populateClassSelect(newStudentClassSelect, false); 
            populatePrefixSelect('male'); // Default prefixes for new student modal

            settingsAcademicYearInput.value = currentAcademicYear; 
            loadSettingsForSelectedYear(); 

            renderSavingsList();
            updateSavingsSummary();
            renderHealthList();
            updateHealthSummary();
            updateAcademicYearDisplays();
            renderUserListForAdmin(); 
            renderCurrentClassListForAdmin(); 
        }
        initializeAppLogic.hasRun = false; // Static property to prevent multiple runs
        
        function updateAcademicYearDisplays() {
            savingsAcademicYearDisplay.textContent = currentAcademicYear;
            healthAcademicYearDisplay.textContent = currentAcademicYear;
            currentYearInSubpageElements.forEach(el => el.textContent = currentAcademicYear);
        }

        function loadDefaultAcademicYearSettings(year) {
            if (!academicYearSettings[year]) {
                const currentJsYear = new Date().getFullYear();
                academicYearSettings[year] = {
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
            }
        }


        function loadSampleData() {
            allClasses = [
                { id: 'm1', name: 'ม.1' }, { id: 'm2', name: 'ม.2' },
                { id: 'm3', name: 'ม.3' }, { id: 'm4', name: 'ม.4' },
                { id: 'm5', name: 'ม.5' }, { id: 'm6', name: 'ม.6' }
            ];

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

            attendanceData = {};
            allStudents.forEach(student => {
                attendanceData[student.id] = Math.random() < 0.85; 
            });

            attendanceHistory = [];
            const today = new Date();
            for (let i = 30; i >= 1; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const records = {};
                allStudents.forEach(student => {
                    records[student.id] = Math.random() < (0.7 + Math.random() * 0.25); 
                });
                attendanceHistory.push({ date: dateStr, records: records, academicYear: currentAcademicYear });
            }
            attendanceHistory.push({ date: currentSelectedDate, records: { ...attendanceData }, academicYear: currentAcademicYear });

            savingsRecords = allStudents.slice(0, 15).map((s, idx) => ({ 
                studentId: s.id, studentName: `${s.prefix}${s.firstName} ${s.lastName}`, classId: s.classId,
                date: `2024-05-${String(Math.floor(Math.random()*15)+1).padStart(2,'0')}`, 
                amount: Math.floor(Math.random() * 100) + 10,
                type: idx % 4 === 0 ? 'withdraw' : 'deposit', 
                academicYear: currentAcademicYear 
            }));
            healthRecords = allStudents.slice(5, 10).map(s => {
                const weight = Math.floor(Math.random() * 30) + 40; 
                const height = Math.floor(Math.random() * 30) + 140; 
                const bmi = parseFloat((weight / ((height/100)**2)).toFixed(1));
                return {
                    studentId: s.id, studentName: `${s.prefix}${s.firstName} ${s.lastName}`, classId: s.classId,
                    date: `2024-05-${String(Math.floor(Math.random()*28)+1).padStart(2,'0')}`,
                    weight, height, bmi, 
                    notes: bmi > 25 ? 'น้ำหนักเกิน' : (bmi < 18.5 ? 'น้ำหนักน้อย' : 'สมส่วน'),
                    status: bmi > 25 || bmi < 18.5 ? 'watchout' : 'normal',
                    academicYear: currentAcademicYear
                };
            });
        }

        function inferGenderFromPrefix(prefix) {
            const malePrefixes = ['เด็กชาย', 'นาย', 'ด.ช.'];
            const femalePrefixes = ['เด็กหญิง', 'นางสาว', 'ด.ญ.'];
            if (malePrefixes.some(p => prefix.toLowerCase().includes(p.toLowerCase()))) return 'male';
            if (femalePrefixes.some(p => prefix.toLowerCase().includes(p.toLowerCase()))) return 'female';
            return 'unknown'; 
        }

        function populatePrefixSelect(gender) {
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
            const currentJsYear = new Date().getFullYear();
            const years = [currentJsYear + 543 -1, currentJsYear + 543, currentJsYear + 543 + 1]; 
            // Populate import and template academic year selects based on existing academicYearSettings keys
            const availableYears = Object.keys(academicYearSettings).map(Number).sort((a,b) => a - b);
            if (availableYears.length === 0) { // If no settings exist, default to current year
                availableYears.push(currentAcademicYear);
            }

            [templateAcademicYearSelect, importAcademicYearSelect].forEach(select => {
                if(select) {
                    select.innerHTML = '';
                    availableYears.forEach(year => {
                        const option = document.createElement('option');
                        option.value = year;
                        option.textContent = `ปีการศึกษา ${year}`;
                        select.appendChild(option);
                    });
                    select.value = currentAcademicYear; 
                }
            });
        }
        
        function populateStudentSelectInModal(selectElement, classId, placeholderText = "เลือกนักเรียน...") {
            if (!selectElement) return;
            selectElement.innerHTML = `<option value="">${placeholderText}</option>`;
            // Filter students based on selected class AND academic year AND teacher's responsible classes
            const studentsInClass = allStudents.filter(s => 
                s.academicYear === currentAcademicYear && 
                s.classId === classId &&
                (teacherProfile.isAdmin || teacherProfile.responsibleClasses.includes(s.classId))
            );
            studentsInClass.sort((a,b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'th'))
            .forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
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
            
            // Filter classes based on teacher's responsible classes
            const classesToDisplay = teacherProfile.isAdmin 
                                    ? allClasses 
                                    : allClasses.filter(cls => teacherProfile.responsibleClasses.includes(cls.id));

            classesToDisplay.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                selectElement.appendChild(option);
            });
            if (classesToDisplay.find(c => c.id === currentValue)) { 
                selectElement.value = currentValue;
            } else if (addAllOption) {
                selectElement.value = 'all';
            }
        }


        // --- Event Listeners Setup ---
        function setupEventListeners() {
            navItems.forEach(item => item.addEventListener('click', handleNavClick));
            adminLoginStatusBtn.addEventListener('click', handleAdminStatusClick);
            
            // Modified date selector to open modal
            dateSelectorDisplay.addEventListener('click', () => {
                document.getElementById('date-picker-input').value = currentSelectedDate; // Set modal input to current date
                openModal(document.getElementById('date-picker-modal'));
            });
            // Handle confirmation from the date picker modal
            document.getElementById('confirm-date-btn').addEventListener('click', () => {
                currentSelectedDate = document.getElementById('date-picker-input').value;
                updateDateDisplay(new Date(currentSelectedDate));
                handleConfirmDateFromTrigger({ target: { value: currentSelectedDate } }); // Simulate event for existing logic
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
            
            // Note: openSystemSettingsModalBtn was referenced but not found in HTML or const list.
            // If there's a button to open system settings directly, its ID should be 'open-system-settings-modal-btn'
            // and it should be declared as a const. For now, this listener might not attach to anything.
            const openSystemSettingsModalBtnEl = document.getElementById('open-system-settings-modal-btn');
            if (openSystemSettingsModalBtnEl) {
                openSystemSettingsModalBtnEl.addEventListener('click', () => {
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

            if(manageClassesBtn) { // Check if element exists
                manageClassesBtn.addEventListener('click', () => openModal(manageClassesModal));
            }
            if(manageUsersBtn) { // Check if element exists
                manageUsersBtn.addEventListener('click', () => openModal(manageUsersModal));            }
            addNewClassBtn.addEventListener('click', handleAddNewClassToList);


            openHolidaySettingsModalBtn.addEventListener('click', () => {
                holidayModalYearDisplay.textContent = settingsAcademicYearInput.value; 
                populateHolidayListDisplay(settingsAcademicYearInput.value); 
                openModal(holidaySettingsModal);
            });
            addHolidayBtn.addEventListener('click', handleAddHoliday);
            recommendHolidaysAiBtn.addEventListener('click', handleRecommendHolidaysAI); 
            autoRecommendHolidaysToggle.addEventListener('change', updateRecommendHolidaysButtonState); // New event listener for toggle
            saveHolidaysBtn.addEventListener('click', () => {
                closeModal(holidaySettingsModal);
                loadSettingsForSelectedYear(); 
            });

            
            document.getElementById('add-student-btn').addEventListener('click', () => {
                document.getElementById('new-student-id').value = '';
                newStudentGenderRadios[0].checked = true; 
                populatePrefixSelect('male'); 
                document.getElementById('new-student-firstname').value = '';
                document.getElementById('new-student-lastname').value = '';
                newStudentClassSelect.value = '';
                openModal(addStudentModal);
            });
            newStudentGenderRadios.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    populatePrefixSelect(e.target.value);
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
                populatePrefixSelect('male');
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
            document.getElementById('download-template-btn').addEventListener('click', handleDownloadTemplate); // Updated event listener
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
                    alert('กรุณาเลือกห้องเรียนจากด้านบนก่อนบันทึกการออม');
                    return;
                }
                const selectedClass = allClasses.find(c => c.id === selectedClassId);
                savingModalClassName.textContent = selectedClass ? selectedClass.name : '';
                populateStudentSelectInModal(savingStudentSelect, selectedClassId, "เลือกนักเรียนในห้อง...");
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
                    alert('กรุณาเลือกห้องเรียนจากด้านบนก่อนบันทึกสุขภาพ');
                    return;
                }
                const selectedClass = allClasses.find(c => c.id === selectedClassId);
                healthModalClassName.textContent = selectedClass ? selectedClass.name : '';
                populateStudentSelectInModal(healthStudentSelect, selectedClassId, "เลือกนักเรียนในห้อง...");
                healthDateInput.value = new Date().toISOString().split('T')[0]; 
                openModal(addHealthRecordModal);
            });
            saveNewHealthRecordBtn.addEventListener('click', handleSaveNewHealthRecord);
            
            document.getElementById('history-class-filter').addEventListener('change', updateAttendanceHistoryDisplay);
            document.getElementById('history-month-filter').addEventListener('change', updateAttendanceHistoryDisplay);
            document.getElementById('report-class-filter').addEventListener('change', updateReportDetails);
            


            showHistoryBtn.addEventListener('click', () => showProfileSubPage('history'));
            showReportBtn.addEventListener('click', () => showProfileSubPage('report'));
            // Removed back buttons as per request
            // backToProfileFromHistoryBtn.addEventListener('click', () => showProfileSubPage('main'));
            // backToProfileFromReportBtn.addEventListener('click', () => showProfileSubPage('main'));
            if(deleteAllStudentsBtn){
                deleteAllStudentsBtn.addEventListener('click', () => {
                    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อนักเรียนทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
                        allStudents = []; // Example action: clear the array
                        alert('รายชื่อนักเรียนทั้งหมดถูกลบแล้ว (ตัวอย่าง)');
                        updateDashboardStatsAndStatus(); // Refresh UI
                    }
                });
            }
            exportCsvBtn.addEventListener('click', handleExportCsv);
        }

        // --- Admin Login & User Management ---
        function handleAdminStatusClick() {
            if (auth.currentUser && auth.currentUser.uid === ADMIN_UID) { // Check current Firebase auth state
                // Admin is logged in via Firebase, so clicking the button means logout
                signOut(auth).then(() => {
                    // teacherProfile.isAdmin will be set to false by onAuthStateChanged
                    // UI updates will also be handled by onAuthStateChanged
                    console.log("Admin explicitly logged out.");
                    showToast("ออกจากระบบผู้ดูแลระบบแล้ว", "success");
                }).catch((error) => {
                    console.error("Admin logout error:", error);
                    showToast("เกิดข้อผิดพลาดในการออกจากระบบ: " + error.message, "error");
                });
            } else {
                // Admin is not logged in, show login modal
                openModal(adminLoginModal);
                if(adminLoginError) {
                    adminLoginError.classList.add('hidden');
                    adminLoginError.textContent = '';
                }
            }
        }

        // Handle admin login with Firebase Authentication
        if (googleAdminLoginBtn) {
            googleAdminLoginBtn.addEventListener('click', () => {
                const errorElement = adminLoginError;
                if (errorElement) {
                    errorElement.classList.add('hidden');
                    errorElement.textContent = '';
                }

                // Use email/password sign-in instead of Google
                const email = document.getElementById('admin-email-input')?.value;
                const password = document.getElementById('admin-password-input')?.value;
                
                if (!email || !password) {
                    if (errorElement) {
                        errorElement.textContent = "กรุณากรอกอีเมลและรหัสผ่าน";
                        errorElement.classList.remove('hidden');
                    }
                    return;
                }
                
                signInWithEmailAndPassword(auth, email, password)
                    .then((userCredential) => {
                        // Check if this is the admin account
                        if (userCredential.user.uid === ADMIN_UID) {
                            closeModal(adminLoginModal);
                            // onAuthStateChanged will handle setting teacherProfile.isAdmin and updating UI
                            showToast("เข้าสู่ระบบผู้ดูแลระบบสำเร็จ", "success");
                        } else {
                            // Not the admin account
                            if (errorElement) {
                                errorElement.textContent = "บัญชีนี้ไม่ใช่บัญชีผู้ดูแลระบบ";
                                errorElement.classList.remove('hidden');
                            }
                            signOut(auth); // Sign out non-admin user immediately
                        }
                    })
                    .catch((error) => {
                        console.error("Admin login error:", error.code, error.message);
                        let errorMessage = "เกิดข้อผิดพลาดในการล็อกอิน โปรดลองอีกครั้ง";
                        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                            errorMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
                        } else if (error.code === 'auth/invalid-email') {
                            errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
                        } else if (error.code === 'auth/too-many-requests') {
                            errorMessage = "ตรวจพบบัญชีมีการใช้งานที่ผิดปกติ โปรดลองอีกครั้งในภายหลัง";
                        }
                        if (errorElement) {
                            errorElement.textContent = errorMessage;
                            errorElement.classList.remove('hidden');
                        }
                    });
            });
        }
        
        function updateAdminView() {
            adminSettingsSection.classList.toggle('hidden', !teacherProfile.isAdmin);
            if (teacherProfile.isAdmin) {
                adminLoginStatusBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg><span>Admin Mode</span>';
                adminLoginStatusBtn.classList.add('text-green-600');
                adminLoginStatusBtn.classList.remove('text-gray-600');
                if (teacherIdInput) teacherIdInput.removeAttribute('readonly');
                if (teacherNameInput) teacherNameInput.removeAttribute('readonly');
            } else {
                adminLoginStatusBtn.innerHTML = 'ผู้ดูแล';
                adminLoginStatusBtn.classList.remove('text-green-600');
                adminLoginStatusBtn.classList.add('text-gray-600');
                if (teacherIdInput) teacherIdInput.setAttribute('readonly', true);
                if (teacherNameInput) teacherNameInput.setAttribute('readonly', true);
            }
            
            const isAdmin = teacherProfile.isAdmin; // or teacherProfile.role === 'admin'
            const currentRole = teacherProfile.role; // Will be 'admin' or 'viewer'

            // Handle .admin-only-item elements
            document.querySelectorAll('.admin-only-item').forEach(el => {
                const isElementAdminOnly = currentRole === 'admin';
                el.style.display = isElementAdminOnly ? '' : 'none';
                if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                    el.disabled = !isElementAdminOnly;
                }
            });

            // Handle .viewer-only-item elements
            document.querySelectorAll('.viewer-only-item').forEach(el => {
                const isElementViewerOnly = currentRole === 'viewer';
                el.style.display = isElementViewerOnly ? '' : 'none';
                if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                    el.disabled = !isElementViewerOnly;
                }
            });
            
            // The old .viewer-hide and .admin-hide loops are removed.
            // The logic for these classes should be migrated to .admin-only-item or .viewer-only-item in HTML.

            // Review this list: Buttons here should NOT have .admin-only-item or .viewer-only-item if they need separate logic.
            // If a button is admin-only, it should be tagged with .admin-only-item in HTML and will be handled above.
            // If a button is viewer-only, it should be tagged with .viewer-only-item in HTML and will be handled above.
            // This list is for elements that might be visible to multiple roles but disabled for some.
            // For now, with only 'admin' and 'viewer' roles, elements are either admin-only, viewer-only, or common.
            // Common elements that need disabling for viewers but are not admin-only (a rare case) would remain here.
            // Most items from the original list are likely to become .admin-only-item.
            
            const commonButtonsToManage = [
                // Example: '#some-button-visible-to-admin-and-user-but-disabled-for-viewer'
                // For current roles 'admin'/'viewer', most buttons are either admin-only or common and always enabled.
                // The change-password-btn might be an example if a 'user' role existed that could use it.
                // With only admin/viewer, if it's not viewer-only and not admin-only, it's for everyone.
                // If it's for admin, it's covered by admin-only-item.
                // Let's assume for now that the specific list of buttons to disable for viewers
                // will be largely superseded by elements being tagged as .admin-only-item in HTML.
                // Any button NOT tagged .admin-only-item or .viewer-only-item is considered a common interactive element.
                // We need to determine which of these common elements should be disabled for viewers.
                 '#change-password-btn', // Visible to admin (non-viewer), should be enabled for admin.
                                         // If it were also visible to a 'user' role, it'd be enabled. Disabled for 'viewer'.
                 '#save-new-password-btn', // Similar to above, part of change password flow.
                 '#save-profile-btn',      // Should be usable by admin.
                 // Buttons like #add-new-saving-btn, #add-new-health-record-btn were viewer-hide,
                 // if they are for admin, they should become admin-only-item.
                 // If they are for a future 'user' role, they would not be admin-only-item.
            ];

            if (currentRole === 'viewer') {
                commonButtonsToManage.forEach(selector => {
                    const btn = document.querySelector(selector);
                    if (btn && !btn.classList.contains('admin-only-item') && !btn.classList.contains('viewer-only-item')) {
                        // Only disable if it's not already handled by admin-only (which would hide/disable it)
                        // or viewer-only (which would show/enable it).
                        btn.disabled = true;
                    }
                });
            } else { // Role is admin (or future 'user')
                commonButtonsToManage.forEach(selector => {
                    const btn = document.querySelector(selector);
                    if (btn && !btn.classList.contains('admin-only-item') && !btn.classList.contains('viewer-only-item')) {
                        btn.disabled = false;
                    }
                });
            }
            // Note: The original comprehensive list of buttons to disable for viewers is now largely
            // expected to be handled by HTML elements having the `admin-only-item` class.
            // The `commonButtonsToManage` list should be refined based on which elements are truly common
            // but need viewer disabling, AFTER HTML is updated with new classes.
            // For this specific task, we are only modifying `updateAdminView`.
            // The existing hardcoded list of selectors for disabling is removed and replaced by this more targeted approach.