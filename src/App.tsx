import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { ministryLogo } from './logo';
import { 
    auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged,
    collection, doc, setDoc, updateDoc, getDoc, getDocs, addDoc, deleteDoc, onSnapshot, query, where, writeBatch
} from "./firebase";

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// =====================================================
// قاعدة بيانات المديريات (21 جهة)
// =====================================================
const directoriesDB = [
    // المديرات الجهوية (10)
    { name: "المديرية الجهوية للتربية والتكوين - مكناس", type: "مديرية جهوية", region: "مكناس" },
    { name: "المديرية الجهوية للتربية والتكوين - فاس", type: "مديرية جهوية", region: "فاس" },
    { name: "المديرية الجهوية للتربية والتكوين - طنجة تطوان الحسيمة", type: "مديرية جهوية", region: "طنجة" },
    { name: "المديرية الجهوية للتربية والتكوين - الرباط سلا القنيطرة", type: "مديرية جهوية", region: "الرباط" },
    { name: "المديرية الجهوية للتربية والتكوين - الدار البيضاء سطات", type: "مديرية جهوية", region: "الدار البيضاء" },
    { name: "المديرية الجهوية للتربية والتكوين - مراكش آسفي", type: "مديرية جهوية", region: "مراكش" },
    { name: "المديرية الجهوية للتربية والتكوين - سوس ماسة", type: "مديرية جهوية", region: "أكادير" },
    { name: "المديرية الجهوية للتربية والتكوين - الشرق", type: "مديرية جهوية", region: "وجدة" },
    { name: "المديرية الجهوية للتربية والتكوين - العيون الساقية الحمراء", type: "مديرية جهوية", region: "العيون" },
    { name: "المديرية الجهوية للتربية والتكوين - الداخلة وادي الذهب", type: "مديرية جهوية", region: "الداخلة" },
    { name: "الأكاديمية الجهوية للتربية والتكوين - بني ملال خنيفرة", type: "أكاديمية جهوية", region: "بني ملال" },
    { name: "الأكاديمية الجهوية للتربية والتكوين - درعة تافيلالت", type: "أكاديمية جهوية", region: "الرشيدية" },
    { name: "وزارة التربية الوطنية - مديرية المناهج", type: "إدارة مركزية", region: "الرباط" },
    { name: "وزارة التربية الوطنية - مديرية الموارد البشرية", type: "إدارة مركزية", region: "الرباط" },
    { name: "المديرية الإقليمية - مكناس", type: "مديرية إقليمية", region: "مكناس" },
    { name: "المديرية الإقليمية - إفران", type: "مديرية إقليمية", region: "إفران" },
    { name: "المديرية الإقليمية - خنيفرة", type: "مديرية إقليمية", region: "خنيفرة" },
    { name: "المديرية الإقليمية - الحاجب", type: "مديرية إقليمية", region: "الحاجب" },
    { name: "نيابة مكناس", type: "نيابة", region: "مكناس" },
    { name: "نيابة إفران", type: "نيابة", region: "إفران" },
    { name: "نيابة خنيفرة", type: "نيابة", region: "خنيفرة" },
    { name: "نيابة الحاجب", type: "نيابة", region: "الحاجب" },
    { name: "نيابة الفقيه بن صالح", type: "نيابة", region: "الفقيه بن صالح" }
];

export default function App() {
    // Auth State
    const [user, setUser] = useState<any>(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Core Data
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState("all");
    const [activeView, setActiveView] = useState("dashboard"); // dashboard, settings, mass_request, mass_send
    const [requestSearchTerm, setRequestSearchTerm] = useState("");
    const [sendSearchTerm, setSendSearchTerm] = useState("");
    const [statsSearchTerm, setStatsSearchTerm] = useState("");
    const [selectedReqStudent, setSelectedReqStudent] = useState<any>(null);
    const [selectedSendStudent, setSelectedSendStudent] = useState<any>(null);
    const [statsSelectedStudent, setStatsSelectedStudent] = useState<any>(null);
    const [searchInstTerm, setSearchInstTerm] = useState("");
    const [selectedInst, setSelectedInst] = useState<any>(null); // { name: string, dir: string }
    const [selectedInterventionStudents, setSelectedInterventionStudents] = useState<string[]>([]);
    const [selectedMassReqStudents, setSelectedMassReqStudents] = useState<string[]>([]);
    const [selectedMassSendStudents, setSelectedMassSendStudents] = useState<string[]>([]);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [showExcelInfoModal, setShowExcelInfoModal] = useState(false);
    const [modalContent, setModalContent] = useState<any>(null);
    const [showPrintBtn, setShowPrintBtn] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ open: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

    // Institution Info (Settings)
    const [schoolName, setSchoolName] = useState("يرجى إدخال اسم المؤسسة");
    const [academyName, setAcademyName] = useState("الأكاديمية الجهوية");
    const [provincialName, setProvincialName] = useState("المديرية الإقليمية");
    const [currentCity, setCurrentCity] = useState("المدينة");

    // Form/Search States
    const [searchDirTerm, setSearchDirTerm] = useState("");
    const [requestTargetDir, setRequestTargetDir] = useState("");
    const [requestDate, setRequestDate] = useState("");
    const [requestRef, setRequestRef] = useState("");
    const [requestNotes, setRequestNotes] = useState("");
    const [requestDate1, setRequestDate1] = useState("");
    const [requestDate2, setRequestDate2] = useState("");
    const [requestDate3, setRequestDate3] = useState("");

    const [sendRef, setSendRef] = useState("");
    const [sendDate, setSendDate] = useState("");
    const [sendNotes, setSendNotes] = useState("");

    const [corrType, setCorrType] = useState("all");
    const [targetDir, setTargetDir] = useState("");
    const [corrDate, setCorrDate] = useState("");
    const [corrRef, setCorrRef] = useState("");
    const [corrSubject, setCorrSubject] = useState("");

    const arrivingInputRef = useRef<HTMLInputElement>(null);
    const departingInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const printDocRef = useRef<HTMLDivElement>(null);

    const downloadPDF = () => {
        if (!printDocRef.current) return;
        const element = printDocRef.current;
        const opt = {
            margin:       0,
            filename:     `doc_${new Date().getTime()}.pdf`,
            image:        { type: 'jpeg' as const, quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };
        html2pdf().set(opt).from(element).save();
    };

    // Firebase Auth Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);
                // Load User Settings
                const userDoc = await getDoc(doc(db, "users", u.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setSchoolName(data.schoolName || "");
                    setAcademyName(data.academyName || "");
                    setProvincialName(data.provincialName || "");
                    setCurrentCity(data.currentCity || "");
                } else {
                    // Initialize user doc
                    await setDoc(doc(db, "users", u.uid), {
                        uid: u.uid,
                        email: u.email,
                        schoolName: "",
                        academyName: "",
                        provincialName: "",
                        currentCity: ""
                    });
                }
            } else {
                setUser(null);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // Firestore Real-time Listener for Students
    useEffect(() => {
        if (user) {
            const q = query(collection(db, "students"), where("uid", "==", user.uid));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const studs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAllStudents(studs);
            }, (error) => {
                console.error("Firestore Error:", error);
                showToast("خطأ في جلب البيانات من السحابة", "error");
            });
            return () => unsubscribe();
        } else {
            setAllStudents([]);
        }
    }, [user]);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setCorrDate(today);
        setRequestDate(today);
    }, []);

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            showToast("تم تسجيل الدخول بنجاح", "success");
        } catch (error) {
            console.error("Login Failed", error);
            showToast("فشل تسجيل الدخول", "error");
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            showToast("تم تسجيل الخروج", "success");
        } catch (error) {
            showToast("خطأ في تسجيل الخروج", "error");
        }
    };

    const saveSettings = async () => {
        if (!user) return;
        try {
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                schoolName,
                academyName,
                provincialName,
                currentCity
            }, { merge: true });
            showToast("تم حفظ الإعدادات بنجاح", "success");
            setActiveView('dashboard');
        } catch (error) {
            showToast("خطأ في حفظ الإعدادات", "error");
        }
    };

    const showToast = (msg: string, type: string) => {
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, 4500);
    };

    const handleUpload = (files: FileList | File[], forcedType?: string) => {
        if (!user) {
            showToast("يرجى تسجيل الدخول أولاً لحفظ البيانات", "error");
            return;
        }
        if (!files || files.length === 0) return;
        
        const filesArray = Array.from(files);
        let totalProcessed = 0;
        let batch = writeBatch(db);
        let count = 0;

        filesArray.forEach((file) => {
            const reader = new FileReader();
            reader.onload = async (e: any) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const wb = XLSX.read(data, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

                    // استخراج المستوى من الخلية C7 (السطر السابع، العمود الثالث - index 6, 2)
                    let fileLevel = "";
                    if (json.length >= 7 && json[6] && json[6][2]) {
                        let val = String(json[6][2]).trim();
                        let clean = val.replace(/(\s*-\s*\d+\/\d+|\s*عام|\s*مسار دولي.*|\s*خيار.*)/g, '').trim();
                        if (clean.includes("أولى") && clean.includes("إعدادي")) fileLevel = "السنة الأولى إعدادي";
                        else if (clean.includes("ثانية") && clean.includes("إعدادي")) fileLevel = "السنة الثانية إعدادي";
                        else if (clean.includes("ثالثة") && clean.includes("إعدادي")) fileLevel = "السنة الثالثة إعدادي";
                        else fileLevel = clean;
                    }

                    // تبدأ المعطيات من السطر رقم 10 (Index 9)
                    for (let i = 9; i < json.length; i++) {
                        const row = json[i];
                        if (row && row.length >= 3) {
                            const studentRef = doc(collection(db, "students"));
                            
                            // نوع التحويل: نستخدم النوع الممرر للدالة أو نحاول استخلاصه من الملف
                            let tType = forcedType || String(row[4] || '').trim();
                            if (!forcedType && tType === '' && row.length >= 7) {
                                tType = "مغادر"; // افتراضي إذا كان غير محدد
                            }

                            // تكييف جلب البيانات حسب نوع التلميذ (وافد أم مغادر)
                            // ملفات مسار تختلف في ترتيب المؤسسة الأصلية والمستقبلة حسب نوع اللائحة
                            let originalInst = "";
                            let receivingInst = "";
                            let originalDir = "";
                            let originalAcademy = "";

                            const isArr = forcedType === "وافد" || (tType.toLowerCase().includes('وافد') || tType.toLowerCase().includes('arriving'));

                            if (isArr) {
                                // ترتيب الوافدين: 6.الاستقبال | 7.الأصلية | 8.المديرية الأصلية | 9.الأكاديمية الأصلية
                                receivingInst = String(row[5] || '').trim();
                                originalInst = String(row[6] || '').trim();
                                originalDir = String(row[7] || '').trim();
                                originalAcademy = String(row[8] || '').trim();
                            } else {
                                // ترتيب المغادرين: 6.الأصلية | 7.الاستقبال | 8.المديرية المستقبلة | 9.الأكاديمية المستقبلة
                                originalInst = String(row[5] || '').trim();
                                receivingInst = String(row[6] || '').trim();
                                originalDir = String(row[7] || '').trim();
                                originalAcademy = String(row[8] || '').trim();
                            }

                            const extractLevel = (r: any[]) => {
                                if (fileLevel) return fileLevel; // إعطاء الأولوية للخلية C7
                                for (let j = 5; j < Math.max(r.length, 15); j++) {
                                    let val = String(r[j] || '').trim();
                                    if (/(أولى|ثانية|ثالثة|رابعة|خامسة|سادسة|إعدادي|ابتدائي|تأهيلي|جذع|بكالوريا|سنة)/i.test(val)) {
                                        let clean = val.replace(/(\s*-\s*\d+\/\d+|\s*عام|\s*مسار دولي.*|\s*خيار.*)/g, '').trim();
                                        if (clean.includes("أولى") && clean.includes("إعدادي")) return "السنة الأولى إعدادي";
                                        if (clean.includes("ثانية") && clean.includes("إعدادي")) return "السنة الثانية إعدادي";
                                        if (clean.includes("ثالثة") && clean.includes("إعدادي")) return "السنة الثالثة إعدادي";
                                        return clean;
                                    }
                                }
                                for (let j = 5; j < Math.max(r.length, 15); j++) {
                                    let val = String(r[j] || '').trim().toUpperCase();
                                    if (val.includes('1APIC')) return "السنة الأولى إعدادي";
                                    if (val.includes('2APIC')) return "السنة الثانية إعدادي";
                                    if (val.includes('3APIC')) return "السنة الثالثة إعدادي";
                                }
                                return String(r[9] || '—').trim();
                            };

                            batch.set(studentRef, {
                                uid: user.uid,
                                studentNum: String(row[0] || '').trim(),
                                lastName: String(row[1] || '').trim(),
                                firstName: String(row[2] || '').trim(),
                                transferDate: String(row[3] || '').trim(),
                                transferType: tType,
                                originalInst, 
                                receivingInst, 
                                originalDir, 
                                originalAcademy,
                                level: extractLevel(row), 
                                createdAt: new Date().toISOString()
                            });
                            count++;
                        }
                    }
                    
                    totalProcessed++;
                    
                    if (totalProcessed === filesArray.length) {
                        await batch.commit();
                        showToast(`تم استيراد وحفظ ${count} سجل بنجاح`, 'success');
                    }
                } catch (err: any) {
                    showToast(`خطأ في قراءة ملف ${file.name}`, 'error');
                    totalProcessed++;
                }
            };
            reader.readAsArrayBuffer(file);
        });
    };

    const isArriving = (s: any) => {
        const t = (s.transferType || '').toLowerCase().trim();
        return t.includes('وافد') || t.includes('وافدة') || t.includes('arriving') || t === '';
    };

    const isDeparting = (s: any) => {
        const t = (s.transferType || '').toLowerCase().trim();
        return t.includes('مغادر') || t.includes('مغادرة') || t.includes('departing');
    };

    const clearData = async () => {
        if (!user) return;
        
        setConfirmModal({
            open: true,
            title: "تأكيد المسح الشامل",
            message: "هل أنت متأكد من مسح جميع البيانات من السحابة؟ لا يمكن التراجع عن هذه الخطوة.",
            onConfirm: async () => {
                try {
                    const q = query(collection(db, "students"), where("uid", "==", user.uid));
                    const snapshot = await getDocs(q);
                    
                    // Firestore batches are limited to 500 actions
                    const docs = snapshot.docs;
                    for (let i = 0; i < docs.length; i += 500) {
                        const batch = writeBatch(db);
                        const chunk = docs.slice(i, i + 500);
                        chunk.forEach(d => batch.delete(d.ref));
                        await batch.commit();
                    }
                    
                    setSelectedReqStudent(null);
                    setSelectedSendStudent(null);
                    setConfirmModal(null);
                    showToast('تم مسح البيانات السحابية بالكامل', 'success');
                } catch (error) {
                    console.error(error);
                    showToast("خطأ في مسح البيانات", "error");
                }
            }
        });
    };

    const exportExcel = () => {
        if (allStudents.length === 0) {
            showToast('لا توجد بيانات للتصدير', 'error');
            return;
        }
        try {
            const ws = XLSX.utils.json_to_sheet(allStudents);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'بيانات_التلاميذ');
            XLSX.writeFile(wb, `تحويلات_${new Date().toISOString().slice(0, 10)}.xlsx`);
            showToast('تم التصدير بنجاح', 'success');
        } catch (e: any) {
            showToast('خطأ في التصدير: ' + e.message, 'error');
        }
    };

    const renderInterventionDoc = (students: any[], targetSchool: string, targetProvince: string, dates: string[]) => {
        return (
            <div className="official-doc" style={{ fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#000', lineHeight: '1.6' }}>
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <img 
                        src={ministryLogo} 
                        alt="وزارة التربية الوطنية والتعليم الأولي والرياضة" 
                        style={{ height: '70px', width: 'auto', display: 'inline-block' }}
                    />
                </div>
                
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', marginBottom: '10px' }}>
                    أكاديمية جهة {academyName.replace(/الأكاديمية الجهوية( للتربية و?\s?التكوين -?)?/g, '').trim()}  /   مديرية عمالة : {provincialName.replace(/المديرية الإقليمية( -)?/g, '').trim()}
                </div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>
                    الثانوية الإعدادية {schoolName}
                </div>
                
                <hr style={{ borderTop: '2px solid black', margin: '15px 0' }} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginRight: '50px', marginLeft: '50px', marginBottom: '20px', fontSize: '16px', fontWeight: 'bold' }}>
                    <div style={{ alignSelf: 'flex-start' }}>من مدير مؤسسة : {schoolName}</div>
                    <div style={{ alignSelf: 'flex-start' }}>المديرية الإقليمية : عمالة : {provincialName.replace(/المديرية الإقليمية( -)?/g, '').trim()}</div>
                    
                    <div style={{ alignSelf: 'center', margin: '20px 0', fontSize: '20px', textDecoration: 'underline' }}>إلــــــــــــــــى</div>
                    
                    <div style={{ alignSelf: 'center' }}>السيد المدير الإقليمي لوزارة التربية الوطنية</div>
                    <div style={{ alignSelf: 'center' }}>المديرية الإقليمية : عمالة : {provincialName.replace(/المديرية الإقليمية( -)?/g, '').trim()}</div>
                </div>

                <div style={{ marginBottom: '25px', fontSize: '17px', fontWeight: 'bold', textDecoration: 'underline' }}>
                    الموضـــــــــوع : طلب تدخل بشأن إرسال ملف مدرسي
                </div>

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '17px', marginBottom: '20px' }}>
                    سلام تام بوجود مولانا الإمام المؤيد بالله
                </div>

                <div style={{ marginBottom: '15px', fontSize: '16px' }}>
                    وبعد ، فعلاقة بالموضوع المشار إليه أعلاه ، يشرفني سيدي أن أطلب منكم التدخل بشأن مراسلة الملف المدرسي للتلميذ (ة) :
                </div>

                <table className="doc-table" style={{ width: '100%', marginBottom: '20px', textAlign: 'center', fontSize: '14px' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}>الرقم</th>
                            <th>النسب</th>
                            <th>الإسم</th>
                            <th>رمز مسار</th>
                            <th>المستوى</th>
                            <th>المؤسسة الأصلية</th>
                            <th>المديرية الأصلية</th>
                            <th>الأكاديمية الأصلية</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((s, i) => (
                            <tr key={i}>
                                <td>{i + 1}</td>
                                <td>{s.lastName}</td>
                                <td>{s.firstName}</td>
                                <td>{s.studentNum}</td>
                                <td>{s.level || '—'}</td>
                                <td>{s.originalInst}</td>
                                <td>{s.originalDir}</td>
                                <td>{s.originalAcademy}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {dates && dates.some(d => d) && (
                    <div style={{ marginTop: '20px', fontSize: '16px' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>وأحيطكم علما سيدي أني قمت بمراسلة السيد مدير المؤسسة الأصلية للتلميذ الوافد ب :</p>
                        <div style={{ paddingRight: '15px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {dates[0] ? <div>&#10148; طلب ملف مدرسي رقم 1 بتاريخ {dates[0]}</div> : null}
                            {dates[1] ? <div>&#10148; طلب ملف مدرسي رقم 2 بتاريخ {dates[1]}</div> : null}
                            {dates[2] ? <div>&#10148; طلب ملف مدرسي رقم 3 بتاريخ {dates[2]}</div> : null}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '40px', paddingLeft: '50px', textAlign: 'left', fontWeight: 'bold', fontSize: '18px' }}>
                    توقيع مدير المؤسسة :
                </div>
            </div>
        );
    };

    // Official Document Generator (A4)
    const renderOfficialDoc = (title: string, salutation: string, students: any[], targetSchool: string, targetProvince: string, ref: string, date: string, notes?: string, reminders?: string[]) => {
        const formattedDate = new Date(date).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' });

        return (
            <div className="official-doc">
                <div className="doc-header-main" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', width: '100%' }}>
                    <div className="ministry-info-right" style={{ flex: 1, textAlign: 'right', lineHeight: '1.4' }}>
                        الأكاديمية الجهوية للتربية و التكوين : {academyName.replace(/الأكاديمية الجهوية( للتربية و?\s?التكوين)?/g, '').replace(/^[\s:\-]+/, '')}<br />
                        المديرية الإقليمية : {provincialName.replace(/المديرية الإقليمية/g, '').replace(/^[\s:\-]+/, '')}<br />
                        مؤسسة: {schoolName}
                    </div>

                    <div className="ministry-logo-center" style={{ flex: 1, textAlign: 'center' }}>
                        <img 
                            src={ministryLogo} 
                            alt="وزارة التربية الوطنية والتعليم الأولي والرياضة" 
                            style={{ height: '90px', width: 'auto', display: 'inline-block' }}
                        />
                    </div>
                    
                    <div className="doc-meta-left" style={{ flex: 1, textAlign: 'left', alignSelf: 'flex-start' }}>
                        {currentCity} في: {formattedDate}
                    </div>
                </div>

                <div className="doc-addresses">
                    من السيد مدير(ة): {schoolName}<br />
                    إلى السيد(ة) مدير(ة): {targetSchool || '............................'}<br />
                    المديرية الإقليمية بـ: {targetProvince || '............................'}<br />
                    تحت إشراف السيد(ة) المدير(ة) الإقليمي بـ: {currentCity}
                </div>

                <div className="doc-meta-inline" style={{ textAlign: 'right', fontWeight: 700, marginBottom: '5px', fontSize: '1.05em' }}>
                    رقم الإرسال: {ref}
                </div>
                <div className="doc-subject">
                    الموضوع: {title}
                </div>
                {notes && <div className="doc-ref">المرجع: {notes}</div>}

                <div className="doc-salutation">
                    سلام تام بوجود مولانا الإمام المؤيد بالله
                </div>

                <div className="doc-context">
                    وبعد، {salutation} في الجدول أسفله:
                </div>

                <table className="doc-table">
                    <thead>
                        <tr>
                            <th>نوع التحويل</th>
                            <th>تاريخ التحويل</th>
                            <th>الاسم الشخصي</th>
                            <th>النسب</th>
                            <th>رمز مسار</th>
                            <th>المستوى</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((s, i) => (
                            <tr key={i}>
                                <td>{s.transferType || 'تحويل فردي'}</td>
                                <td>{s.transferDate}</td>
                                <td>{s.firstName}</td>
                                <td>{s.lastName}</td>
                                <td>{s.studentNum}</td>
                                <td>{s.level || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {(reminders && reminders.some(r => r)) && (
                    <div className="doc-reminders" style={{ marginTop: '20px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
                        <div style={{ fontWeight: 800, marginBottom: '8px' }}>تذكير بالمراسلة/المراسلات السابقة:</div>
                        <div style={{ paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {reminders[0] && <div style={{ display: 'block' }}>- المراسلة الأولى بتاريخ: <strong>{reminders[0]}</strong></div>}
                            {reminders[1] && <div style={{ display: 'block' }}>- المراسلة الثانية بتاريخ: <strong>{reminders[1]}</strong></div>}
                            {reminders[2] && <div style={{ display: 'block' }}>- المراسلة الثالثة بتاريخ: <strong>{reminders[2]}</strong></div>}
                        </div>
                    </div>
                )}

                <div className="signature-zone">
                    خاتم وتوقيع السيد(ة) مدير(ة) المؤسسة:
                </div>
            </div>
        );
    };

    const openBulkRequestModal = () => {
        const arriving = allStudents.filter(isArriving);
        if (arriving.length === 0) {
            showToast('لا يوجد تلاميذ وافدون لطلب ملفاتهم', 'error');
            return;
        }
        setModalContent(renderOfficialDoc(
            "طلب الوثائق المدرسية للتلميذ(ة)/التلاميذ:",
            "يشرفني أن أطلب منكم موافاتي بالوثائق المدرسية للتلميذ(ة)/التلاميذ",
            arriving,
            "",
            "",
            corrRef || "..../....",
            corrDate,
            "شهادة / شواهد المغادرة",
            [requestDate1, requestDate2, requestDate3]
        ));
        setModalOpen(true);
        setShowPrintBtn(true);
    };

    const openBulkSendModal = () => {
        const departing = allStudents.filter(isDeparting);
        if (departing.length === 0) {
            showToast('لا يوجد تلاميذ مغادرون لإرسال ملفاتهم', 'error');
            return;
        }
        setModalContent(renderOfficialDoc(
            "إرسال الوثائق المدرسية للتلميذ(ة)/التلاميذ:",
            "يشرفني أن أرسل إليكم الوثائق المدرسية للتلميذ(ة)/التلاميذ",
            departing,
            "",
            "",
            corrRef || "..../....",
            corrDate,
            "طلب"
        ));
        setModalOpen(true);
        setShowPrintBtn(true);
    };

    const handleRequestSelect = (s: any) => {
        setSelectedReqStudent(s);
        setSelectedSendStudent(null); // Clear other tab selection
        setRequestSearchTerm("");
        setRequestDate1(s.requestDate1 || "");
        setRequestDate2(s.requestDate2 || "");
        setRequestDate3(s.requestDate3 || "");
    };

    const handleSendSelect = (s: any) => {
        setSelectedSendStudent(s);
        setSelectedReqStudent(null); // Clear other tab selection
        setSendSearchTerm("");
        setRequestDate1(s.requestDate1 || "");
        setRequestDate2(s.requestDate2 || "");
        setRequestDate3(s.requestDate3 || "");
    };

    const generateRequestFileCorr = async () => {
        if (!selectedReqStudent) {
            showToast('يرجى اختيار تلميذ أولاً!', 'error');
            return;
        }

        if (!selectedReqStudent.originalInst) {
            showToast('خطأ: المؤسسة الأصلية غير معرفة لهذا التلميذ!', 'error');
            return;
        }

        // Save dates to Firestore first
        try {
            await updateDoc(doc(db, "students", selectedReqStudent.id), {
                requestDate1,
                requestDate2,
                requestDate3
            });
            showToast("تم تحديث تواريخ المراسلات في السحابة", "success");
        } catch (error) {
            console.error("Failed to update dates", error);
            showToast("فشل حفظ التواريخ في السحابة", "error");
        }

        setModalContent(renderOfficialDoc(
            "طلب الوثائق المدرسية للتلميذ(ة):",
            "يشرفني أن أطلب منكم موافاتي بالوثائق المدرسية للتلميذ(ة)",
            [selectedReqStudent],
            selectedReqStudent.originalInst,
            selectedReqStudent.originalDir,
            requestRef,
            requestDate,
            requestNotes || "شهادة المغادرة",
            [requestDate1, requestDate2, requestDate3]
        ));
        setModalOpen(true);
        setShowPrintBtn(true);
    };

    const generateSendFileCorr = async () => {
        if (!selectedSendStudent) {
            showToast('يرجى اختيار تلميذ أولاً!', 'error');
            return;
        }

        if (!selectedSendStudent.receivingInst) {
            showToast('خطأ: مؤسسة الاستقبال غير معرفة لهذا التلميذ!', 'error');
            return;
        }

        setModalContent(renderOfficialDoc(
            "إرسال الوثائق المدرسية للتلميذ(ة):",
            "يشرفني أن أرسل إليكم الوثائق المدرسية للتلميذ(ة)",
            [selectedSendStudent],
            selectedSendStudent.receivingInst,
            selectedSendStudent.originalDir, // Dir of receiving school usually
            sendRef,
            sendDate,
            sendNotes || "طلبكم",
            [requestDate1, requestDate2, requestDate3]
        ));
        setModalOpen(true);
        setShowPrintBtn(true);
    };

    const arrivingStuds = allStudents.filter(isArriving);
    const departingStuds = allStudents.filter(isDeparting);
    const displayStudents = activeTab === 'all' ? allStudents : (activeTab === 'arriving' ? arrivingStuds : departingStuds);

    const requestSearchResults = requestSearchTerm ? arrivingStuds.filter(s =>
        (s.studentNum || '').toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
        (s.firstName || '').toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
        (s.lastName || '').toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
        (s.originalInst || '').toLowerCase().includes(requestSearchTerm.toLowerCase())
    ) : [];

    const sendSearchResults = sendSearchTerm ? departingStuds.filter(s =>
        (s.studentNum || '').toLowerCase().includes(sendSearchTerm.toLowerCase()) ||
        (s.firstName || '').toLowerCase().includes(sendSearchTerm.toLowerCase()) ||
        (s.lastName || '').toLowerCase().includes(sendSearchTerm.toLowerCase()) ||
        (s.receivingInst || '').toLowerCase().includes(sendSearchTerm.toLowerCase())
    ) : [];

    const statsSearchResults = statsSearchTerm ? allStudents.filter(s =>
        (s.studentNum || '').toLowerCase().includes(statsSearchTerm.toLowerCase()) ||
        (s.firstName || '').toLowerCase().includes(statsSearchTerm.toLowerCase()) ||
        (s.lastName || '').toLowerCase().includes(statsSearchTerm.toLowerCase())
    ).slice(0, 5) : [];

    const smartSelect = (s: any) => {
        if (isArriving(s)) {
            handleRequestSelect(s);
        } else {
            handleSendSelect(s);
        }
        // Scroll to search sections
        const el = document.querySelector('.dual-search-grid');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const deleteStudent = async (id: string) => {
        setConfirmModal({
            open: true,
            title: "تأكيد الحذف",
            message: "هل أنت متأكد من حذف هذا التلميذ؟",
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, "students", id));
                    setConfirmModal(null);
                    showToast("تم الحذف بنجاح", "success");
                } catch (error) {
                    showToast("خطأ في الحذف", "error");
                }
            }
        });
    };

    return (
        <div className="app-layout">
            {/* Sidebar */}
            {confirmModal && confirmModal.open && (
                <div className="modal-overlay" style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
                        <h2 style={{ color: '#e53e3e', marginBottom: '10px' }}>{confirmModal.title}</h2>
                        <p style={{ marginBottom: '20px' }}>{confirmModal.message}</p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={() => setConfirmModal(null)}>إلغاء</button>
                            <button className="btn" style={{ background: '#e53e3e', color: '#fff' }} onClick={confirmModal.onConfirm}>تأكيد المسح</button>
                        </div>
                    </div>
                </div>
            )}
            <aside className="sidebar no-print">
                <div className="sidebar-logo">📁 مدير التحويلات</div>
                
                {user ? (
                    <div style={{ padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', marginBottom: '20px', textAlign: 'center' }}>
                        <img src={user.photoURL || ''} alt="avatar" style={{ width: '40px', borderRadius: '50%', marginBottom: '5px' }} />
                        <div style={{ fontSize: '0.9em', fontWeight: 700 }}>{user.displayName}</div>
                        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '0.85em', marginTop: '5px', textDecoration: 'underline' }}>تسجيل الخروج</button>
                    </div>
                ) : (
                    <button className="side-btn" onClick={loginWithGoogle} style={{ background: '#4285f4', color: 'white', marginBottom: '10px' }}>
                        تسجيل الدخول بـ Google
                    </button>
                )}
                
                <button 
                    className="side-btn" 
                    onClick={() => setShowExcelInfoModal(true)} 
                    style={{ background: '#f2994a', color: 'white', marginBottom: '20px' }}>
                    ℹ️ دليل الاستخدام وملاحظات
                </button>

                <button className={`side-btn ${activeView === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveView('dashboard')}>🏠 لوحة التحكم</button>
                <button className={`side-btn ${activeView === 'mass_request' ? 'active' : ''}`} onClick={() => {
                    setActiveView('mass_request');
                    setSearchInstTerm("");
                    setSelectedInst(null);
                }}>📂 طلب ملفات جماعية</button>
                <button className={`side-btn ${activeView === 'mass_send' ? 'active' : ''}`} onClick={() => {
                    setActiveView('mass_send');
                    setSearchInstTerm("");
                    setSelectedInst(null);
                }}>📂 إرسال ملفات جماعية</button>
                <button className={`side-btn ${activeView === 'intervention' ? 'active' : ''}`} onClick={() => {
                    setActiveView('intervention');
                    setSearchInstTerm("");
                    setSelectedInst(null);
                }}>🛡️ طلب تدخل المدير الإقليمي</button>
                <button className={`side-btn ${activeView === 'stats' ? 'active' : ''}`} onClick={() => { setActiveView('stats'); setStatsSearchTerm(""); setStatsSelectedStudent(null); }}>📊 إحصائيات المراسلات</button>
                <button className={`side-btn ${activeView === 'individual_request' ? 'active' : ''}`} onClick={() => { setActiveView('individual_request'); setRequestSearchTerm(""); setSelectedReqStudent(null); }}>📥 طلب ملف مدرسي</button>
                <button className={`side-btn ${activeView === 'individual_send' ? 'active' : ''}`} onClick={() => { setActiveView('individual_send'); setSendSearchTerm(""); setSelectedSendStudent(null); }}>📤 إرسال ملف مدرسي</button>
                <button className={`side-btn ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}>⚙️ الإعدادات</button>
                <div style={{ marginTop: 'auto', fontSize: '0.85em', opacity: 0.8, textAlign: 'center', fontWeight: 'bold', color: 'white' }}>من إنتاج : رشيد الهاريوي</div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <div className="container">
                    {!isAuthReady ? (
                        <div style={{ textAlign: 'center', padding: '100px' }}>جاري التحميل...</div>
                    ) : !user ? (
                        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                            <div style={{ fontSize: '3em', marginBottom: '20px' }}>🔒</div>
                            <h2 style={{ marginBottom: '15px' }}>يرجى تسجيل الدخول للمتابعة</h2>
                            <p style={{ color: '#64748b', marginBottom: '30px' }}>قم بتسجيل الدخول باستخدام حساب Google لحفظ بيانات التلاميذ وإعدادات مؤسستك بشكل دائم في السحابة.</p>
                            <button className="btn btn-primary" onClick={loginWithGoogle}>
                                🌐 تسجيل الدخول بواسطة Google
                            </button>
                        </div>
                    ) : activeView === 'mass_request' ? (
                        <div className="card">
                            <h2 className="card-title">📂 طلب ملفات جماعية (حسب المؤسسة)</h2>
                            <p style={{ marginBottom: '20px', color: '#64748b' }}>ابحث عن المؤسسة الأصلية لتوليد طلب جماعي لجميع التلاميذ الوافدين منها.</p>
                            
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>البحث بالمؤسسة</label>
                                <input 
                                    type="text" 
                                    className="search-input-lg"
                                    placeholder="ادخل اسم المؤسسة الأصلية..."
                                    value={searchInstTerm}
                                    onChange={(e) => {
                                        setSearchInstTerm(e.target.value);
                                        setSelectedInst(null);
                                    }}
                                />
                            </div>

                            {searchInstTerm && !selectedInst && (
                                <div className="search-results-list" style={{ marginBottom: '20px' }}>
                                    {(Array.from(new Set(allStudents.filter(isArriving).filter(s => 
                                        s.originalInst.toLowerCase().includes(searchInstTerm.toLowerCase()) || 
                                        s.originalDir.toLowerCase().includes(searchInstTerm.toLowerCase())
                                    ).map(s => `${s.originalInst}|${s.originalDir}`))) as string[]).map((key, i) => {
                                        const [inst, dir] = key.split('|');
                                        return (
                                            <div key={i} className="search-result-item" onClick={() => {
                                                setSelectedInst({ name: inst, dir });
                                                const instStudents = allStudents.filter(isArriving).filter(s => s.originalInst === inst && s.originalDir === dir);
                                                setSelectedMassReqStudents(instStudents.map(s => s.id));
                                            }}>
                                                <div className="stud-info">
                                                    <span className="name">{inst}</span>
                                                    <span className="massar">المديرية: {dir} | عدد التلاميذ: {allStudents.filter(isArriving).filter(s => s.originalInst === inst && s.originalDir === dir).length}</span>
                                                </div>
                                                <div className="select-badge">✓ اختيار</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {selectedInst && (
                                <div className="selected-inst-view" style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px' }}>
                                    <h3 style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        🏢 {selectedInst.name} ({selectedInst.dir})
                                        <button className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '0.8em' }} onClick={() => setSelectedInst(null)}>تغيير المؤسسة</button>
                                    </h3>
                                    
                                    <div className="table-wrap" style={{ marginBottom: '20px' }}>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={
                                                                allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst.name && s.originalDir === selectedInst.dir).length > 0 && 
                                                                selectedMassReqStudents.length === allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst.name && s.originalDir === selectedInst.dir).length
                                                            }
                                                            onChange={(e) => {
                                                                const allIds = allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst.name && s.originalDir === selectedInst.dir).map(s => s.id);
                                                                if (e.target.checked) setSelectedMassReqStudents(allIds);
                                                                else setSelectedMassReqStudents([]);
                                                            }}
                                                        />
                                                    </th>
                                                    <th>مسار</th>
                                                    <th>الاسم والنسب</th>
                                                    <th>المستوى</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst.name && s.originalDir === selectedInst.dir).map((s, i) => (
                                                    <tr key={i} onClick={() => {
                                                        if (selectedMassReqStudents.includes(s.id)) {
                                                            setSelectedMassReqStudents(selectedMassReqStudents.filter(id => id !== s.id));
                                                        } else {
                                                            setSelectedMassReqStudents([...selectedMassReqStudents, s.id]);
                                                        }
                                                    }} style={{ cursor: 'pointer' }}>
                                                        <td>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedMassReqStudents.includes(s.id)} 
                                                                onChange={() => {}} // handled by tr click
                                                            />
                                                        </td>
                                                        <td>{s.studentNum}</td>
                                                        <td>{s.lastName} {s.firstName}</td>
                                                        <td>{s.level}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="form-grid" style={{ marginBottom: '20px' }}>
                                        <div className="form-group">
                                            <label>رقم المرجع (اختياري)</label>
                                            <input type="text" placeholder="رقم الإرسالية" value={corrRef} onChange={(e) => setCorrRef(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة</label>
                                            <input type="date" value={corrDate} onChange={(e) => setCorrDate(e.target.value)} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '15px', background: '#fff9f0', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                                        <div className="form-group" style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#9a3412', marginBottom: '5px' }}>تذكير بالمراسلات السابقة (التي تمت):</div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 1</label>
                                            <input type="date" value={requestDate1} onChange={(e) => setRequestDate1(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 2</label>
                                            <input type="date" value={requestDate2} onChange={(e) => setRequestDate2(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 3</label>
                                            <input type="date" value={requestDate3} onChange={(e) => setRequestDate3(e.target.value)} />
                                        </div>
                                        <div className="form-group" style={{ marginTop: '10px' }}>
                                            <button 
                                                className="btn btn-primary" 
                                                style={{ width: '100%', fontSize: '0.9em', padding: '8px' }} 
                                                onClick={async () => {
                                                    const students = allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst.name && s.originalDir === selectedInst.dir && selectedMassReqStudents.includes(s.id));
                                                    if (students.length === 0) {
                                                        showToast("المرجو تحديد تلميذ واحد على الأقل", "error");
                                                        return;
                                                    }
                                                    try {
                                                        const batch = writeBatch(db);
                                                        students.forEach(s => batch.update(doc(db, "students", s.id), { requestDate1, requestDate2, requestDate3 }));
                                                        await batch.commit();
                                                        showToast("تم تخزين وتحديث التواريخ بنجاح للمجموعة", "success");
                                                    } catch (error) {
                                                        console.error(error);
                                                        showToast("فشل تخزين التواريخ", "error");
                                                    }
                                                }}
                                            >
                                                💾 تخزين التواريخ للمجموعة
                                            </button>
                                        </div>
                                    </div>

                                    <button className="btn btn-warning" style={{ width: '100%' }} onClick={async () => {
                                        const students = allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst.name && s.originalDir === selectedInst.dir && selectedMassReqStudents.includes(s.id));
                                        
                                        if (students.length === 0) {
                                            showToast("المرجو تحديد تلميذ واحد على الأقل", "error");
                                            return;
                                        }

                                        // Save dates to all students in the batch
                                        try {
                                            const batch = writeBatch(db);
                                            students.forEach(s => {
                                                batch.update(doc(db, "students", s.id), {
                                                    requestDate1,
                                                    requestDate2,
                                                    requestDate3
                                                });
                                            });
                                            await batch.commit();
                                            showToast("تم تحديث تواريخ المراسلات لجميع تلاميذ المجموعة", "success");
                                        } catch (error) {
                                            console.error("Batch update failed", error);
                                            showToast("فشل تحديث التواريخ للمجموعة", "error");
                                        }

                                        setModalContent(renderOfficialDoc(
                                            "طلب الوثائق المدرسية (طلب جماعي)",
                                            "يشرفني أن أطلب منكم موافاتي بالوثائق المدرسية للتلاميذ المدرجة أسماؤهم أدناه",
                                            students,
                                            selectedInst.name,
                                            selectedInst.dir,
                                            corrRef || "..../....",
                                            corrDate,
                                            "شواهد المغادرة الأصلية",
                                            [requestDate1, requestDate2, requestDate3]
                                        ));
                                        setModalOpen(true);
                                        setShowPrintBtn(true);
                                    }}>
                                        📄 توليد المراسلة الجماعية لهذه المؤسسة
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : activeView === 'intervention' ? (
                        <div className="card">
                            <h2 className="card-title">🛡️ طلب تدخل المدير الإقليمي</h2>
                            <p style={{ marginBottom: '20px', color: '#64748b' }}>توليد رسالة موجهة إلى السيد المدير الإقليمي للتدخل من أجل جلب ملفات التلاميذ المتعثرة.</p>
                            
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>البحث بالمؤسسة الأصلية أو اسم التلميذ</label>
                                <input 
                                    type="text" 
                                    className="search-input-lg"
                                    placeholder="ادخل اسم المؤسسة، المديرية، أو اسم/مسار التلميذ..."
                                    value={searchInstTerm}
                                    onChange={(e) => {
                                        setSearchInstTerm(e.target.value);
                                        setSelectedInst(null);
                                    }}
                                />
                            </div>

                            {searchInstTerm && !selectedInst && (
                                <div className="search-results-list" style={{ marginBottom: '20px' }}>
                                    {(Array.from(new Set(allStudents.filter(isArriving).filter(s => {
                                        const term = searchInstTerm.toLowerCase();
                                        return s.originalInst.toLowerCase().includes(term) || 
                                               s.originalDir.toLowerCase().includes(term) ||
                                               s.lastName.toLowerCase().includes(term) ||
                                               s.firstName.toLowerCase().includes(term) ||
                                               `${s.firstName} ${s.lastName}`.toLowerCase().includes(term) ||
                                               `${s.lastName} ${s.firstName}`.toLowerCase().includes(term) ||
                                               s.studentNum.toLowerCase().includes(term);
                                    }).map(s => `${s.originalInst}|${s.originalDir}`))) as string[]).map((key, i) => {
                                        const [inst, dir] = key.split('|');
                                        return (
                                            <div key={i} className="search-result-item" onClick={() => setSelectedInst({ name: inst, dir })}>
                                                <div className="stud-info">
                                                    <span className="name">{inst}</span>
                                                    <span className="massar">المديرية: {dir} | عدد التلاميذ: {allStudents.filter(isArriving).filter(s => s.originalInst === inst && s.originalDir === dir).length}</span>
                                                </div>
                                                <div className="select-badge">✓ اختيار</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {selectedInst && (
                                <div className="selected-inst-view" style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px' }}>
                                    <h3 style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        🏢 {selectedInst.name} ({selectedInst.dir})
                                        <button className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '0.8em' }} onClick={() => setSelectedInst(null)}>تغيير المؤسسة</button>
                                    </h3>
                                    
                                    <div className="table-wrap" style={{ marginBottom: '20px' }}>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px', textAlign: 'center' }}>
                                                        <input 
                                                            type="checkbox"
                                                            checked={
                                                                allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst.name && s.originalDir === selectedInst.dir).length > 0 && 
                                                                selectedInterventionStudents.length === allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst.name && s.originalDir === selectedInst.dir).length
                                                            }
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    const allIds = allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst.name && s.originalDir === selectedInst.dir).map(s => s.id);
                                                                    setSelectedInterventionStudents(allIds);
                                                                } else {
                                                                    setSelectedInterventionStudents([]);
                                                                }
                                                            }}
                                                        />
                                                    </th>
                                                    <th>مسار</th>
                                                    <th>الاسم والنسب</th>
                                                    <th>المستوى</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst.name && s.originalDir === selectedInst.dir).map((s, i) => (
                                                    <tr key={i} onClick={() => {
                                                        if (selectedInterventionStudents.includes(s.id)) {
                                                            setSelectedInterventionStudents(selectedInterventionStudents.filter(id => id !== s.id));
                                                        } else {
                                                            setSelectedInterventionStudents([...selectedInterventionStudents, s.id]);
                                                        }
                                                    }} style={{ cursor: 'pointer', background: selectedInterventionStudents.includes(s.id) ? '#f0fdf4' : 'transparent' }}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedInterventionStudents.includes(s.id)} 
                                                                onChange={() => {}} // Controlled by row click
                                                            />
                                                        </td>
                                                        <td>{s.studentNum}</td>
                                                        <td>{s.lastName} {s.firstName}</td>
                                                        <td>{s.level}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="form-grid" style={{ marginBottom: '20px' }}>
                                        <div className="form-group">
                                            <label>رقم إرسالية المؤسسة (رقم المرجع)</label>
                                            <input type="text" placeholder="رقم إرسالية طلب الملف" value={corrRef} onChange={(e) => setCorrRef(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة الحالية</label>
                                            <input type="date" value={corrDate} onChange={(e) => setCorrDate(e.target.value)} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '15px', background: '#fff1f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
                                        <div className="form-group" style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#9f1239', marginBottom: '5px' }}>تذكير بالاتصالات السابقة (المراسلات التي تمت):</div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 1</label>
                                            <input type="date" value={requestDate1} onChange={(e) => setRequestDate1(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 2</label>
                                            <input type="date" value={requestDate2} onChange={(e) => setRequestDate2(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 3</label>
                                            <input type="date" value={requestDate3} onChange={(e) => setRequestDate3(e.target.value)} />
                                        </div>
                                    </div>

                                    <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => {
                                        const students = allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst.name && s.originalDir === selectedInst.dir);
                                        const selectedSts = students.filter(s => selectedInterventionStudents.includes(s.id));
                                        
                                        if (selectedSts.length === 0) {
                                            showToast("المرجو تحديد تلميذ واحد على الأقل", "error");
                                            return;
                                        }

                                        setModalContent(renderInterventionDoc(
                                            selectedSts,
                                            selectedInst.name,
                                            selectedInst.dir,
                                            [requestDate1, requestDate2, requestDate3]
                                        ));
                                        setModalOpen(true);
                                        setShowPrintBtn(true);
                                    }}>
                                        🛡️ توليد طلب تدخل المدير الإقليمي
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : activeView === 'stats' ? (
                        <div className="card">
                            <h2 className="card-title">📊 إحصائيات طلبات الملفات المدرسية</h2>
                            <p style={{ marginBottom: '20px', color: '#64748b' }}>نظرة شاملة حول وضعية المراسلات والطلبات للتلاميذ الوافدين.</p>
                            
                            <div className="stats-row">
                                <div className="stat-card" style={{ borderBottomColor: '#1e3c72' }}>
                                    <div className="stat-num">{allStudents.filter(isArriving).length}</div>
                                    <div className="stat-label">إجمالي الوافدين</div>
                                </div>
                                <div className="stat-card" style={{ borderBottomColor: '#10b981' }}>
                                    <div className="stat-num">{allStudents.filter(isArriving).filter(s => s.requestDate1 || s.requestDate2 || s.requestDate3).length}</div>
                                    <div className="stat-label">تلاميذ تمت مراسلتهم</div>
                                </div>
                                <div className="stat-card" style={{ borderBottomColor: '#f59e0b' }}>
                                    <div className="stat-num">{allStudents.filter(isArriving).filter(s => !s.requestDate1 && !s.requestDate2 && !s.requestDate3).length}</div>
                                    <div className="stat-label">لم تتم مراسلتهم قط</div>
                                </div>
                            </div>

                            <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ marginBottom: '15px', color: '#334155' }}>🔍 البحث السريع عن تلميذ ومراسلاته</h3>
                                <input 
                                    type="text" 
                                    className="search-input-lg" 
                                    placeholder="البحث برقم مسار أو الاسم..."
                                    value={statsSearchTerm}
                                    onChange={(e) => setStatsSearchTerm(e.target.value)}
                                    style={{ marginBottom: '15px' }}
                                />

                                {statsSearchTerm && statsSearchResults.length > 0 && !statsSelectedStudent && (
                                    <div className="search-results-list">
                                        {statsSearchResults.map((s, i) => (
                                            <div key={i} className="search-result-item" onClick={() => {
                                                setStatsSelectedStudent(s);
                                                setStatsSearchTerm("");
                                            }}>
                                                <div className="stud-info">
                                                    <div className="name" style={{ fontWeight: 'bold' }}>{s.lastName} {s.firstName}</div>
                                                    <div className="massar" style={{ fontSize: '0.85em', color: '#666' }}>
                                                        🆔 {s.studentNum} | 🏫 من: {s.originalInst || 'غير محدد'} ➔ إلى: {s.receivingInst || 'غير محدد'}
                                                    </div>
                                                </div>
                                                <div className="select-badge">✓ عرض</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {statsSearchTerm && statsSearchResults.length === 0 && (
                                    <div className="empty-msg" style={{ padding: '15px' }}>لا يوجد تلميذ بهذا البحث</div>
                                )}

                                {statsSelectedStudent && (
                                    <div className="selected-student-info" style={{ marginTop: '15px', background: '#fff', padding: '20px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                                            <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1.2em' }}>👤 {statsSelectedStudent.lastName} {statsSelectedStudent.firstName}</h4>
                                            <button className="btn btn-select" onClick={() => setStatsSelectedStudent(null)}>إغلاق ✕</button>
                                        </div>
                                        
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.95em' }}>
                                            <div><strong>🆔 رقم مسار:</strong> {statsSelectedStudent.studentNum}</div>
                                            <div><strong>📚 المستوى:</strong> {statsSelectedStudent.level || 'غير مبين'}</div>
                                            <div><strong>🏫 المؤسسة الأصلية:</strong> {statsSelectedStudent.originalInst || 'غير محدد'}</div>
                                            <div><strong>🎓 مؤسسة الاستقبال:</strong> {statsSelectedStudent.receivingInst || 'غير محدد'}</div>
                                            <div><strong>🗂️ الحالة:</strong> {isArriving(statsSelectedStudent) ? 'وافد 📥' : isDeparting(statsSelectedStudent) ? 'مغادر 📤' : 'غير معروف'}</div>
                                        </div>

                                        <div style={{ marginTop: '20px', background: '#f0fdf4', padding: '15px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                                            <h5 style={{ margin: '0 0 10px 0', color: '#166534' }}>📅 تاريخ المراسلات ({[statsSelectedStudent.requestDate1, statsSelectedStudent.requestDate2, statsSelectedStudent.requestDate3].filter(Boolean).length} / 3)</h5>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.9em' }}>
                                                <div><strong>مراسلة 1:</strong> {statsSelectedStudent.requestDate1 || <span style={{ color: '#94a3b8' }}>لم تنجز بعد</span>}</div>
                                                <div><strong>مراسلة 2:</strong> {statsSelectedStudent.requestDate2 || <span style={{ color: '#94a3b8' }}>لم تنجز بعد</span>}</div>
                                                <div><strong>مراسلة 3:</strong> {statsSelectedStudent.requestDate3 || <span style={{ color: '#94a3b8' }}>لم تنجز بعد</span>}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="tabs-nav" style={{ marginTop: '30px' }}>
                                <button className={`tab-btn ${corrType === 'all' ? 'active' : ''}`} onClick={() => setCorrType('all')}>الكل</button>
                                <button className={`tab-btn ${corrType === 'none' ? 'active' : ''}`} onClick={() => setCorrType('none')}>لم يراسلوا ❌</button>
                                <button className={`tab-btn ${corrType === '1' ? 'active' : ''}`} onClick={() => setCorrType('1')}>المراسلة 1 📩</button>
                                <button className={`tab-btn ${corrType === '2' ? 'active' : ''}`} onClick={() => setCorrType('2')}>المراسلة 2 📩</button>
                                <button className={`tab-btn ${corrType === '3' ? 'active' : ''}`} onClick={() => setCorrType('3')}>المراسلة 3 📩</button>
                            </div>

                            <div className="table-wrap" style={{ marginTop: '20px' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>مسار</th>
                                            <th>الاسم والنسب</th>
                                            <th>المستوى</th>
                                            <th>المؤسسة الأصلية</th>
                                            <th>المراسات</th>
                                            <th>الإجراء</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allStudents.filter(isArriving).filter(s => {
                                            if (corrType === 'all') return true;
                                            if (corrType === 'none') return !s.requestDate1 && !s.requestDate2 && !s.requestDate3;
                                            if (corrType === '1') return s.requestDate1 && !s.requestDate2 && !s.requestDate3;
                                            if (corrType === '2') return s.requestDate1 && s.requestDate2 && !s.requestDate3;
                                            if (corrType === '3') return s.requestDate1 && s.requestDate2 && s.requestDate3;
                                            return true;
                                        }).map((s, i) => (
                                            <tr key={i}>
                                                <td>{s.studentNum}</td>
                                                <td>{s.lastName} {s.firstName}</td>
                                                <td>{s.level}</td>
                                                <td>{s.originalInst}</td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85em' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span title="مراسلة 1" style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.requestDate1 ? '#10b981' : '#e2e8f0', flexShrink: 0 }}></span>
                                                            <span style={{ color: s.requestDate1 ? '#065f46' : '#94a3b8' }}>{s.requestDate1 || '—'}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span title="مراسلة 2" style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.requestDate2 ? '#10b981' : '#e2e8f0', flexShrink: 0 }}></span>
                                                            <span style={{ color: s.requestDate2 ? '#065f46' : '#94a3b8' }}>{s.requestDate2 || '—'}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span title="مراسلة 3" style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.requestDate3 ? '#10b981' : '#e2e8f0', flexShrink: 0 }}></span>
                                                            <span style={{ color: s.requestDate3 ? '#065f46' : '#94a3b8' }}>{s.requestDate3 || '—'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <button className="btn-select" onClick={() => {
                                                        setActiveView('dashboard');
                                                        smartSelect(s);
                                                        setTimeout(() => {
                                                            const el = document.getElementById('search-request-box');
                                                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                                                        }, 100);
                                                    }}>مراسلة</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : activeView === 'mass_send' ? (
                        <div className="card">
                            <h2 className="card-title">📤 إرسال ملفات جماعية (حسب المؤسسة)</h2>
                            <p style={{ marginBottom: '20px', color: '#64748b' }}>ابحث عن مؤسسة الاستقبال لتوليد إرسال جماعي لجميع التلاميذ المغادرين إليها.</p>
                            
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>البحث بالمؤسسة</label>
                                <input 
                                    type="text" 
                                    className="search-input-lg"
                                    placeholder="ادخل اسم مؤسسة الاستقبال..."
                                    value={searchInstTerm}
                                    onChange={(e) => {
                                        setSearchInstTerm(e.target.value);
                                        setSelectedInst(null);
                                    }}
                                />
                            </div>

                            {searchInstTerm && !selectedInst && (
                                <div className="search-results-list" style={{ marginBottom: '20px' }}>
                                    {(Array.from(new Set(allStudents.filter(isDeparting).filter(s => 
                                        s.receivingInst.toLowerCase().includes(searchInstTerm.toLowerCase()) || 
                                        s.originalDir.toLowerCase().includes(searchInstTerm.toLowerCase())
                                    ).map(s => `${s.receivingInst}|${s.originalDir}`))) as string[]).map((key, i) => {
                                        const [inst, dir] = key.split('|');
                                        return (
                                            <div key={i} className="search-result-item" onClick={() => {
                                                setSelectedInst({ name: inst, dir });
                                                const instStudents = allStudents.filter(isDeparting).filter(s => s.receivingInst === inst && s.originalDir === dir);
                                                setSelectedMassSendStudents(instStudents.map(s => s.id));
                                            }}>
                                                <div className="stud-info">
                                                    <span className="name">{inst}</span>
                                                    <span className="massar">المديرية: {dir} | عدد التلاميذ: {allStudents.filter(isDeparting).filter(s => s.receivingInst === inst && s.originalDir === dir).length}</span>
                                                </div>
                                                <div className="select-badge">✓ اختيار</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {selectedInst && (
                                <div className="selected-inst-view" style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px' }}>
                                    <h3 style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        🏢 {selectedInst.name} ({selectedInst.dir})
                                        <button className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '0.8em' }} onClick={() => setSelectedInst(null)}>تغيير المؤسسة</button>
                                    </h3>
                                    
                                    <div className="table-wrap" style={{ marginBottom: '20px' }}>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={
                                                                allStudents.filter(isDeparting).filter(s => s.receivingInst === selectedInst.name && s.originalDir === selectedInst.dir).length > 0 && 
                                                                selectedMassSendStudents.length === allStudents.filter(isDeparting).filter(s => s.receivingInst === selectedInst.name && s.originalDir === selectedInst.dir).length
                                                            }
                                                            onChange={(e) => {
                                                                const allIds = allStudents.filter(isDeparting).filter(s => s.receivingInst === selectedInst.name && s.originalDir === selectedInst.dir).map(s => s.id);
                                                                if (e.target.checked) setSelectedMassSendStudents(allIds);
                                                                else setSelectedMassSendStudents([]);
                                                            }}
                                                        />
                                                    </th>
                                                    <th>مسار</th>
                                                    <th>الاسم والنسب</th>
                                                    <th>المستوى</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allStudents.filter(isDeparting).filter(s => s.receivingInst === selectedInst.name && s.originalDir === selectedInst.dir).map((s, i) => (
                                                    <tr key={i} onClick={() => {
                                                        if (selectedMassSendStudents.includes(s.id)) {
                                                            setSelectedMassSendStudents(selectedMassSendStudents.filter(id => id !== s.id));
                                                        } else {
                                                            setSelectedMassSendStudents([...selectedMassSendStudents, s.id]);
                                                        }
                                                    }} style={{ cursor: 'pointer' }}>
                                                        <td>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedMassSendStudents.includes(s.id)} 
                                                                onChange={() => {}} // handled by tr click
                                                            />
                                                        </td>
                                                        <td>{s.studentNum}</td>
                                                        <td>{s.lastName} {s.firstName}</td>
                                                        <td>{s.level}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="form-grid" style={{ marginBottom: '20px' }}>
                                        <div className="form-group">
                                            <label>رقم المرجع (اختياري)</label>
                                            <input type="text" placeholder="رقم الإرسالية" value={corrRef} onChange={(e) => setCorrRef(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة</label>
                                            <input type="date" value={corrDate} onChange={(e) => setCorrDate(e.target.value)} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '15px', background: '#e0f2fe', borderRadius: '10px', border: '1px solid #bae6fd' }}>
                                        <div className="form-group" style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#0369a1', marginBottom: '5px' }}>تذكير بالمراسلات السابقة (إن وجدت):</div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 1</label>
                                            <input type="date" value={requestDate1} onChange={(e) => setRequestDate1(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 2</label>
                                            <input type="date" value={requestDate2} onChange={(e) => setRequestDate2(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 3</label>
                                            <input type="date" value={requestDate3} onChange={(e) => setRequestDate3(e.target.value)} />
                                        </div>
                                        <div className="form-group" style={{ marginTop: '10px' }}>
                                            <button 
                                                className="btn btn-primary" 
                                                style={{ width: '100%', fontSize: '0.9em', padding: '8px' }} 
                                                onClick={async () => {
                                                    const students = allStudents.filter(isDeparting).filter(s => s.receivingInst === selectedInst.name && s.originalDir === selectedInst.dir && selectedMassSendStudents.includes(s.id));
                                                    if (students.length === 0) {
                                                        showToast("المرجو تحديد تلميذ واحد على الأقل", "error");
                                                        return;
                                                    }
                                                    try {
                                                        const batch = writeBatch(db);
                                                        students.forEach(s => batch.update(doc(db, "students", s.id), { requestDate1, requestDate2, requestDate3 }));
                                                        await batch.commit();
                                                        showToast("تم تخزين وتحديث التواريخ بنجاح للمجموعة", "success");
                                                    } catch (error) {
                                                        console.error(error);
                                                        showToast("فشل تخزين التواريخ", "error");
                                                    }
                                                }}
                                            >
                                                💾 تخزين التواريخ للمجموعة
                                            </button>
                                        </div>
                                    </div>

                                    <button className="btn btn-warning" style={{ width: '100%' }} onClick={() => {
                                        const students = allStudents.filter(isDeparting).filter(s => s.receivingInst === selectedInst.name && s.originalDir === selectedInst.dir && selectedMassSendStudents.includes(s.id));
                                        if (students.length === 0) {
                                            showToast("المرجو تحديد تلميذ واحد على الأقل", "error");
                                            return;
                                        }
                                        setModalContent(renderOfficialDoc(
                                            "إرسال الوثائق المدرسية (إرسال جماعي)",
                                            "يشرفني أن أرسل إليكم الوثائق المدرسية للتلاميذ المدرجة أسماؤهم أدناه",
                                            students,
                                            selectedInst.name,
                                            selectedInst.dir,
                                            corrRef || "..../....",
                                            corrDate,
                                            "طلبكم",
                                            [requestDate1, requestDate2, requestDate3]
                                        ));
                                        setModalOpen(true);
                                        setShowPrintBtn(true);
                                    }}>
                                        📄 توليد الإرسال الجماعي لهذه المؤسسة
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : activeView === 'individual_request' ? (
                        <div className="card">
                            <h2 className="card-title">🔍 طلب ملف مدرسي فردي (وافدون)</h2>
                            <p style={{ fontSize: '0.85em', color: '#666', marginBottom: '20px' }}>البحث عن تلميذ وافد لتوليد طلب ملفه من مؤسسته الأصلية</p>
                            
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>البحث عن التلميذ</label>
                                <input 
                                    type="text" 
                                    className="search-input-lg" 
                                    placeholder="ابحث برقم مسار أو الاسم..."
                                    value={requestSearchTerm}
                                    onChange={(e) => setRequestSearchTerm(e.target.value)}
                                />
                            </div>

                            {requestSearchTerm && requestSearchResults.length > 0 && !selectedReqStudent && (
                                <div className="search-results-list" style={{ marginBottom: '20px' }}>
                                    {requestSearchResults.map((s, i) => (
                                        <div key={i} className="search-result-item" onClick={() => handleRequestSelect(s)}>
                                            <div className="stud-info">
                                                <div className="name" style={{ fontWeight: 'bold', fontSize: '1.05em' }}>{s.lastName} {s.firstName}</div>
                                                <div className="massar" style={{ fontSize: '0.85em', color: '#666' }}>
                                                    🆔 {s.studentNum} | 🏫 من: <span style={{ color: '#c2410c' }}>{s.originalInst}</span> ➔ إلى: <span style={{ color: '#15803d' }}>{s.receivingInst}</span>
                                                </div>
                                            </div>
                                            <div className="select-badge">✓ اختر</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {requestSearchTerm && requestSearchResults.length === 0 && (
                                <div className="empty-msg" style={{ padding: '20px', fontSize: '0.9em' }}>لا توجد نتائج لطلب الملف</div>
                            )}

                            {selectedReqStudent && (
                                <div className="selected-student-info" style={{ border: '1px solid #f2994a', background: '#fff9f0', padding: '20px', borderRadius: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                       <h3 style={{ margin: 0, color: '#9a3412' }}>✅ المختار: {selectedReqStudent.lastName} {selectedReqStudent.firstName}</h3>
                                       <button className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '0.8em' }} onClick={() => setSelectedReqStudent(null)}>تغيير التلميذ</button>
                                    </div>
                                    <div className="form-grid" style={{ marginBottom: '20px' }}>
                                        <div className="form-group">
                                            <label>رقم المرجع (اختياري)</label>
                                            <input type="text" placeholder="رقم المرجع" value={requestRef} onChange={(e) => setRequestRef(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة</label>
                                            <input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '10px', border: '1px solid #ffedd5' }}>
                                        <div className="form-group" style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#9a3412', marginBottom: '5px' }}>تذكير بالمراسلات السابقة (التي تمت):</div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 1</label>
                                            <input type="date" value={requestDate1} onChange={(e) => setRequestDate1(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 2</label>
                                            <input type="date" value={requestDate2} onChange={(e) => setRequestDate2(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 3</label>
                                            <input type="date" value={requestDate3} onChange={(e) => setRequestDate3(e.target.value)} />
                                        </div>
                                        <div className="form-group" style={{ marginTop: '10px' }}>
                                            <button 
                                                className="btn btn-primary" 
                                                style={{ width: '100%', fontSize: '0.9em', padding: '8px' }} 
                                                onClick={async () => {
                                                    try {
                                                        await updateDoc(doc(db, "students", selectedReqStudent.id), {
                                                            requestDate1, requestDate2, requestDate3
                                                        });
                                                        showToast("تم تخزين وتحديث التواريخ بنجاح", "success");
                                                    } catch (error) {
                                                        console.error(error);
                                                        showToast("فشل تخزين التواريخ", "error");
                                                    }
                                                }}
                                            >
                                                💾 تخزين التواريخ في قاعدة البيانات
                                            </button>
                                        </div>
                                    </div>
                                    <button className="btn btn-warning" style={{ width: '100%' }} onClick={generateRequestFileCorr}>📋 توليد طلب الملف</button>
                                </div>
                            )}
                        </div>
                    ) : activeView === 'individual_send' ? (
                        <div className="card">
                            <h2 className="card-title">📤 إرسال ملف مدرسي فردي (مغادرون)</h2>
                            <p style={{ fontSize: '0.85em', color: '#64748b', marginBottom: '20px' }}>البحث عن تلميذ مغادر لتوليد إرسالية ملفه للمؤسسة المستقبلة</p>
                            
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>البحث عن التلميذ</label>
                                <input 
                                    type="text" 
                                    className="search-input-lg" 
                                    placeholder="ابحث برقم مسار أو الاسم..."
                                    value={sendSearchTerm}
                                    onChange={(e) => setSendSearchTerm(e.target.value)}
                                />
                            </div>

                            {sendSearchTerm && sendSearchResults.length > 0 && !selectedSendStudent && (
                                <div className="search-results-list" style={{ marginBottom: '20px' }}>
                                    {sendSearchResults.map((s, i) => (
                                        <div key={i} className="search-result-item" onClick={() => handleSendSelect(s)}>
                                            <div className="stud-info">
                                                <div className="name" style={{ fontWeight: 'bold', fontSize: '1.05em' }}>{s.lastName} {s.firstName}</div>
                                                <div className="massar" style={{ fontSize: '0.85em', color: '#666' }}>
                                                    🆔 {s.studentNum} | 🏫 من: <span style={{ color: '#c2410c' }}>{s.originalInst}</span> ➔ إلى: <span style={{ color: '#15803d' }}>{s.receivingInst}</span>
                                                </div>
                                            </div>
                                            <div className="select-badge">✓ اختر</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {sendSearchTerm && sendSearchResults.length === 0 && (
                                <div className="empty-msg" style={{ padding: '20px', fontSize: '0.9em' }}>لا توجد نتائج لإرسال الملف</div>
                            )}

                            {selectedSendStudent && (
                                <div className="selected-student-info" style={{ border: '1px solid #3b82f6', background: '#eff6ff', padding: '20px', borderRadius: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                       <h3 style={{ margin: 0, color: '#1e3a8a' }}>✅ المختار: {selectedSendStudent.lastName} {selectedSendStudent.firstName}</h3>
                                       <button className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '0.8em' }} onClick={() => setSelectedSendStudent(null)}>تغيير التلميذ</button>
                                    </div>
                                    <div className="form-grid" style={{ marginBottom: '20px' }}>
                                        <div className="form-group">
                                            <label>رقم المرجع (اختياري)</label>
                                            <input type="text" placeholder="رقم المرجع" value={sendRef} onChange={(e) => setSendRef(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة</label>
                                            <input type="date" value={sendDate} onChange={(e) => setSendDate(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>بناءً على</label>
                                            <input type="text" placeholder="مثال: طلبكم رقم..." value={sendNotes} onChange={(e) => setSendNotes(e.target.value)} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                                        <div className="form-group" style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#1e3a8a', marginBottom: '5px' }}>تذكير بالمراسلات السابقة (إن وجدت):</div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 1</label>
                                            <input type="date" value={requestDate1} onChange={(e) => setRequestDate1(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 2</label>
                                            <input type="date" value={requestDate2} onChange={(e) => setRequestDate2(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>تاريخ المراسلة رقم 3</label>
                                            <input type="date" value={requestDate3} onChange={(e) => setRequestDate3(e.target.value)} />
                                        </div>
                                        <div className="form-group" style={{ marginTop: '10px' }}>
                                            <button 
                                                className="btn btn-primary" 
                                                style={{ width: '100%', fontSize: '0.9em', padding: '8px' }} 
                                                onClick={async () => {
                                                    try {
                                                        await updateDoc(doc(db, "students", selectedSendStudent.id), {
                                                            requestDate1, requestDate2, requestDate3
                                                        });
                                                        showToast("تم تخزين وتحديث التواريخ بنجاح", "success");
                                                    } catch (error) {
                                                        console.error(error);
                                                        showToast("فشل تخزين التواريخ", "error");
                                                    }
                                                }}
                                            >
                                                💾 تخزين التواريخ في قاعدة البيانات
                                            </button>
                                        </div>
                                    </div>
                                    <button className="btn btn-primary" style={{ width: '100%', marginTop: '15px' }} onClick={generateSendFileCorr}>📤 توليد إرسال ملف</button>
                                </div>
                            )}
                        </div>
                    ) : activeView === 'dashboard' ? (
                        <>
                            {/* Header */}
                            <div className="header no-print">
                                <h1>📋 نظام إدارة تحويلات التلاميذ</h1>
                                <p>استيراد وتصنيف التلاميذ وتوليد المراسلات الرسمية (A4) للطلب والإرسال</p>
                            </div>

                            {/* Section Upload */}
                            <div className="card no-print" id="section-upload">
                                <h2 className="card-title">📥 استيراد وتصنيف البيانات</h2>

                                <div className="upload-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    {/* Arriving Import */}
                                    <div 
                                        className="upload-zone arriving" 
                                        onClick={() => arrivingInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (e.dataTransfer.files) handleUpload(e.dataTransfer.files, "وافد");
                                        }}
                                        style={{ borderColor: '#10b981', background: '#f0fdf4' }}
                                    >
                                        <div className="upload-icon">📥</div>
                                        <h3>استيراد "وافدين"</h3>
                                        <p>سحب وإفلات ملفات التلاميذ الوافدين هنا</p>
                                        <input 
                                            type="file" 
                                            ref={arrivingInputRef} 
                                            style={{ display: 'none' }} 
                                            accept=".xlsx,.xls" 
                                            multiple 
                                            onChange={(e) => e.target.files && handleUpload(e.target.files, "وافد")} 
                                        />
                                    </div>

                                    {/* Departing Import */}
                                    <div 
                                        className="upload-zone departing" 
                                        onClick={() => departingInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (e.dataTransfer.files) handleUpload(e.dataTransfer.files, "مغادر");
                                        }}
                                        style={{ borderColor: '#ef4444', background: '#fef2f2' }}
                                    >
                                        <div className="upload-icon">📤</div>
                                        <h3>استيراد "مغادرين"</h3>
                                        <p>سحب وإفلات ملفات التلاميذ المغادرين هنا</p>
                                        <input 
                                            type="file" 
                                            ref={departingInputRef} 
                                            style={{ display: 'none' }} 
                                            accept=".xlsx,.xls" 
                                            multiple 
                                            onChange={(e) => e.target.files && handleUpload(e.target.files, "مغادر")} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="stats-row no-print">
                                <div className="stat-card arriving">
                                    <div className="stat-num">{arrivingStuds.length}</div>
                                    <div className="stat-label">وافد 📥</div>
                                </div>
                                <div className="stat-card departing">
                                    <div className="stat-num">{departingStuds.length}</div>
                                    <div className="stat-label">مغادر 📤</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-num">{allStudents.length}</div>
                                    <div className="stat-label">المجموع 👥</div>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="card no-print">
                                <div className="tabs-nav">
                                    <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>الجميع</button>
                                    <button className={`tab-btn ${activeTab === 'arriving' ? 'active' : ''}`} onClick={() => setActiveTab('arriving')}>الوافدون</button>
                                    <button className={`tab-btn ${activeTab === 'departing' ? 'active' : ''}`} onClick={() => setActiveTab('departing')}>المغادرون</button>
                                </div>
                                <div className="table-wrap">
                                    {displayStudents.length > 0 ? (
                                        <table>
                                            <thead>
                                                {activeTab === 'arriving' ? (
                                                    <tr>
                                                        <th>رقم التلميذ</th>
                                                        <th>النسب</th>
                                                        <th>الإسم</th>
                                                        <th>المستوى</th>
                                                        <th>تاريخ التحويل</th>
                                                        <th>نوع التحويل</th>
                                                        <th>مؤسسة الإستقبال</th>
                                                        <th>المؤسسة الأصلية</th>
                                                        <th>م. الإقليمية الأصلية</th>
                                                        <th>الأكاديمية الأصلية</th>
                                                        <th>إجراء</th>
                                                    </tr>
                                                ) : activeTab === 'departing' ? (
                                                    <tr>
                                                        <th>رقم التلميذ</th>
                                                        <th>النسب</th>
                                                        <th>الإسم</th>
                                                        <th>المستوى</th>
                                                        <th>تاريخ التحويل</th>
                                                        <th>نوع التحويل</th>
                                                        <th>المؤسسة الأصلية</th>
                                                        <th>مؤسسة الإستقبال</th>
                                                        <th>م. الإقليمية الإستقبال</th>
                                                        <th>الأكاديمية الإستقبال</th>
                                                        <th>إجراء</th>
                                                    </tr>
                                                ) : (
                                                    <tr>
                                                        <th>رمز مسار</th>
                                                        <th>النسب</th>
                                                        <th>الإسم</th>
                                                        <th>التاريخ</th>
                                                        <th>مؤسسة الأصل</th>
                                                        <th>المستوى</th>
                                                        <th>إجراء</th>
                                                    </tr>
                                                )}
                                            </thead>
                                            <tbody>
                                                {displayStudents.map((s, i) => (
                                                    <tr key={i}>
                                                        {activeTab === 'arriving' ? (
                                                            <>
                                                                <td>{s.studentNum}</td>
                                                                <td>{s.lastName}</td>
                                                                <td>{s.firstName}</td>
                                                                <td>{s.level}</td>
                                                                <td>{s.transferDate}</td>
                                                                <td>{s.transferType}</td>
                                                                <td>{s.receivingInst}</td>
                                                                <td>{s.originalInst}</td>
                                                                <td>{s.originalDir}</td>
                                                                <td>{s.originalAcademy}</td>
                                                            </>
                                                        ) : activeTab === 'departing' ? (
                                                            <>
                                                                <td>{s.studentNum}</td>
                                                                <td>{s.lastName}</td>
                                                                <td>{s.firstName}</td>
                                                                <td>{s.level}</td>
                                                                <td>{s.transferDate}</td>
                                                                <td>{s.transferType}</td>
                                                                <td>{s.originalInst}</td>
                                                                <td>{s.receivingInst}</td>
                                                                <td>{s.originalDir}</td>
                                                                <td>{s.originalAcademy}</td>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <td>{s.studentNum}</td>
                                                                <td>{s.lastName}</td>
                                                                <td>{s.firstName}</td>
                                                                <td>{s.transferDate}</td>
                                                                <td>{s.originalInst || s.receivingInst}</td>
                                                                <td>{s.level}</td>
                                                            </>
                                                        )}
                                                        <td>
                                                            <button className="btn-select" style={{ color: 'red', marginLeft: '10px' }} onClick={() => deleteStudent(s.id)}>حذف</button> 
                                                            <button className="btn-select" style={{ color: 'blue' }} onClick={() => smartSelect(s)}>اختر</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : <div className="empty-msg">لا توجد سجلات لعرضها</div>}
                                </div>
                                <div className="btn-group" style={{ marginTop: '20px' }}>
                                    <button className="btn btn-danger" onClick={clearData}>🗑️ مسح الكل</button>
                                    <button className="btn btn-success" onClick={exportExcel}>💾 تصدير Excel</button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="card">
                            <h2 className="card-title">⚙️ إعدادات المؤسسة</h2>
                            <p style={{ marginBottom: '20px' }}>أدخل معلومات مؤسستك التي ستظهر في رؤوس المراسلات الرسمية</p>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>اسم الأكاديمية الجهوية</label>
                                    <input value={academyName} onChange={(e) => setAcademyName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>اسم المديرية الإقليمية</label>
                                    <input value={provincialName} onChange={(e) => setProvincialName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>اسم مؤسستك</label>
                                    <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>المدينة (للتأريخ)</label>
                                    <input value={currentCity} onChange={(e) => setCurrentCity(e.target.value)} />
                                </div>
                            </div>
                            <button className="btn btn-primary" style={{ marginTop: '20px' }} onClick={saveSettings}>حفظ والعودة</button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal for App Guide & Excel Notes */}
            {showExcelInfoModal && (
                <div className="modal-overlay" style={{ display: 'block' }} onClick={() => setShowExcelInfoModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', margin: '5% auto', padding: '30px', borderRadius: '15px', background: 'white', maxHeight: '85vh', overflowY: 'auto' }}>
                        
                        <h2 style={{ color: '#2563eb', marginBottom: '15px', borderBottom: '2px solid #2563eb', paddingBottom: '10px' }}>💡 طريقة استعمال التطبيق</h2>
                        <ol style={{ paddingRight: '20px', fontSize: '1.05em', lineHeight: '1.8', color: '#334155', marginBottom: '30px' }}>
                            <li style={{ marginBottom: '10px' }}><strong>الإعدادات أولاً:</strong> قم بالدخول إلى لوحة (الإعدادات ⚙️) وتعبئة بيانات مؤسستك (الاسم، الأكاديمية، المديرية...) لطباعتها في رأس المراسلات.</li>
                            <li style={{ marginBottom: '10px' }}><strong>استيراد البيانات:</strong> من (لوحة التحكم 🏠)، قم برفع ملف Excel الخاص بالتلاميذ لجلبه وتصنيفه تلقائياً، مع مراعاة الملاحظات أدناه.</li>
                            <li style={{ marginBottom: '10px' }}><strong>العمليات الجماعية:</strong> استخدم "طلب ملفات جماعية" أو "إرسال ملفات جماعية" لإنشاء وطباعة مراسلات دفعة واحدة مجمعة حسب المؤسسة.</li>
                            <li style={{ marginBottom: '10px' }}><strong>العمليات الفردية:</strong> من قوائم الأزرار "طلب ملف مدرسي" أو "إرسال ملف مدرسي"، يمكنك البحث عن تلميذ محدد وتوليد وثيقة مخصصة له فقط.</li>
                            <li><strong>الطباعة والحفظ:</strong> عند توليد أي وثيقة، ستظهر نافذة تتيح لك طباعتها مباشرة (A4) أو حفظها كملف PDF.</li>
                        </ol>

                        <h2 style={{ color: '#92400e', marginBottom: '15px', borderBottom: '2px solid #f2994a', paddingBottom: '10px', marginTop: '20px' }}>📌 ملاحظات هامة حول ملف Excel</h2>
                        <ul style={{ listStyle: 'none', padding: '0', fontSize: '1.05em', lineHeight: '1.8', color: '#78350f' }}>
                            <li style={{ marginBottom: '10px' }}>• يبدأ جلب المعطيات تلقائياً من <strong>السطر رقم 10</strong> في ملف مسار.</li>
                            <li style={{ marginBottom: '10px' }}>• <strong>للوافيـدين يجب أن يكون الترتيب:</strong> 6.مؤسسة الاستقبال | 7.المؤسسة الأصلية | 8.المديرية الأصلية | 9.الأكاديمية الأصلية.</li>
                            <li style={{ marginBottom: '10px' }}>• <strong>للمغادرين يجب أن يكون الترتيب:</strong> 6.المؤسسة الأصلية | 7.مؤسسة الاستقبال | 8.المديرية المستقبلة | 9.الأكاديمية المستقبلة.</li>
                            <li>• اختر منطقة الاستيراد المناسبة لتصنيف التلاميذ بطريقة صحيحة (وافدون أو مغادرون).</li>
                        </ul>

                        <div style={{ textAlign: 'center', marginTop: '30px' }}>
                            <button className="btn btn-primary" onClick={() => setShowExcelInfoModal(false)} style={{ fontSize: '1.1em', padding: '10px 30px' }}>حسناً، فهمت</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Official Documents */}
            <div className="modal-overlay" style={{ display: modalOpen ? 'block' : 'none' }} onClick={() => setModalOpen(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <button className="modal-close no-print" onClick={() => setModalOpen(false)} style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 1100, padding: '10px 20px', borderRadius: '10px', background: '#eb3349', color: 'white', border: 'none', cursor: 'pointer' }}>إغلاق ✕</button>
                    {showPrintBtn && (
                        <div className="no-print" style={{ position: 'fixed', top: '20px', left: '120px', zIndex: 1100, display: 'flex', gap: '10px' }}>
                            <button className="btn btn-success" onClick={() => window.print()}>🖨️ طباعة</button>
                            <button className="btn" style={{ background: '#2563eb', color: 'white' }} onClick={downloadPDF}>📥 تحميل PDF</button>
                        </div>
                    )}
                    <div ref={printDocRef}>
                        {modalContent}
                    </div>
                </div>
            </div>
        </div>
    );
}
