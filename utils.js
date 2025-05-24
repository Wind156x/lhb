// utils.js

import { openModal, closeModal, showToast, teacherProfile, appId } from './firebase.js';

export let allStudents = [];
export let allClasses = [];
export let academicYearSettings = {};

export function setGlobalData(students, classes, settings) {
    allStudents = students;
    allClasses = classes;
    academicYearSettings = settings;
}

export function inferGenderFromPrefix(prefix) {
    const malePrefixes = ['เด็กชาย', 'นาย', 'ด.ช.'];
    const femalePrefixes = ['เด็กหญิง', 'นางสาว', 'ด.ญ.'];
    if (malePrefixes.some(p => prefix.toLowerCase().includes(p.toLowerCase()))) return 'male';
    if (femalePrefixes.some(p => prefix.toLowerCase().includes(p.toLowerCase()))) return 'female';
    return 'unknown'; 
}

export function populatePrefixSelect(selectElement, gender) {
    const prefixesMale = ['เด็กชาย', 'นาย'];
    const prefixesFemale = ['เด็กหญิง', 'นางสาว'];
    const prefixes = gender === 'male' ? prefixesMale : prefixesFemale;

    selectElement.innerHTML = '';
    prefixes.forEach(prefix => {
        const option = document.createElement('option');
        option.value = prefix;
        option.textContent = prefix;
        selectElement.appendChild(option);
    });
}

export function populateStudentSelectInModal(selectElement, classId, currentAcademicYear, placeholderText = "เลือกนักเรียน...") {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">${placeholderText}</option>`;
    
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

export function populateClassSelect(selectElement, addAllOption = true) { 
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

export function populateResponsibleClassesCheckboxes(containerElement, selectedClasses = []) {
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

export function getSelectedResponsibleClasses(containerElement) {
    const selected = [];
    containerElement.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        selected.push(checkbox.value);
    });
    return selected;
}

export function updateAllClassDependentDropdowns(currentAcademicYear) {
    const savingsClassFilter = document.getElementById('savings-class-filter');
    const healthClassFilter = document.getElementById('health-class-filter');
    const newStudentClassSelect = document.getElementById('new-student-class');
    const historyClassFilter = document.getElementById('history-class-filter');
    const reportClassFilter = document.getElementById('report-class-filter');
    const teacherManageClassFilter = document.getElementById('teacher-manage-class-filter');
    const importAcademicYearSelect = document.getElementById('import-academic-year');
    const templateAcademicYearSelect = document.getElementById('template-academic-year');

    populateClassSelect(savingsClassFilter);
    populateClassSelect(healthClassFilter);
    populateClassSelect(newStudentClassSelect, false);
    populateClassSelect(historyClassFilter);
    populateClassSelect(reportClassFilter);
    populateClassSelect(teacherManageClassFilter);
    populateAcademicYearSelects(importAcademicYearSelect, templateAcademicYearSelect, currentAcademicYear);
}

export function populateAcademicYearSelects(importSelect, templateSelect, currentAcademicYear) {
    const availableYears = Object.keys(academicYearSettings).map(Number).sort((a,b) => a - b);
    if (availableYears.length === 0) {
        availableYears.push(currentAcademicYear);
    }

    [importSelect, templateSelect].forEach(select => {
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

export function getCurrentTerm(dateStr, yearSettings) {
    const date = new Date(dateStr);
    if (yearSettings.term1 && yearSettings.term1.startDate && yearSettings.term1.endDate) {
        if (date >= new Date(yearSettings.term1.startDate) && date <= new Date(yearSettings.term1.endDate)) {
            return yearSettings.term1;
        }
    }
    if (yearSettings.term2 && yearSettings.term2.startDate && yearSettings.term2.endDate) {
         if (date >= new Date(yearSettings.term2.startDate) && date <= new Date(yearSettings.term2.endDate)) {
            return yearSettings.term2;
        }
    }
    return null; 
}

export function calculateBMI(weight, height) {
    const heightM = height / 100;
    return parseFloat((weight / (heightM * heightM)).toFixed(1));
}

export function getBMIStatus(bmi) {
    if (bmi > 25) return { status: 'watchout', notes: 'น้ำหนักเกิน' };
    if (bmi < 18.5) return { status: 'watchout', notes: 'น้ำหนักน้อย' };
    return { status: 'normal', notes: 'สมส่วน' };
}

export async function recommendHolidaysAI(currentYear) {
    const prompt = `แนะนำวันหยุดนักขัตฤกษ์และวันหยุดสำคัญของประเทศไทยสำหรับปี พ.ศ. ${currentYear} (ค.ศ. ${currentYear - 543}) พร้อมวันที่ในรูปแบบYYYY-MM-DD และคำอธิบายสั้นๆ โดยเน้นวันหยุดที่โรงเรียนมักจะหยุด เช่น วันหยุดราชการ, วันสำคัญทางศาสนา, วันหยุดนักขัตฤกษ์. ให้ผลลัพธ์เป็น JSON array ของ objects โดยแต่ละ object มี "date" (string) และ "description" (string).`;
    
    const aiModalTitle = document.getElementById('ai-modal-title');
    const aiModalContentDisplay = document.getElementById('ai-modal-content-display');
    const aiModal = document.getElementById('ai-modal');

    aiModalTitle.textContent = 'กำลังแนะนำวันหยุดด้วย AI';
    aiModalContentDisplay.innerHTML = `<div class="flex justify-center items-center py-8"><div class="spinner mr-3"></div><span>กำลังสร้างข้อมูล...</span></div>`;
    openModal(aiModal);

    try {
        const apiKey = ""; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            "date": { "type": "STRING" },
                            "description": { "type": "STRING" }
                        },
                        "propertyOrdering": ["date", "description"]
                    }
                }
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);
        const result = await response.json();
        
        if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
            const recommendedHolidays = JSON.parse(result.candidates[0].content.parts[0].text);
            aiModalTitle.textContent = 'แนะนำวันหยุดด้วย AI';
            aiModalContentDisplay.innerHTML = `<p class="text-green-600">สร้างคำแนะนำวันหยุดสำเร็จ</p>`;
            return recommendedHolidays;
        } else {
            throw new Error("Unexpected AI response structure or no content.");
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        aiModalTitle.textContent = 'เกิดข้อผิดพลาด';
        aiModalContentDisplay.innerHTML = `<p class="text-red-500">เกิดข้อผิดพลาดในการแนะนำวันหยุด: ${error.message}</p>`;
        return [];
    } finally {
        // Close modal after a short delay to allow user to read the message
        setTimeout(() => closeModal(aiModal), 1500);
    }
}
