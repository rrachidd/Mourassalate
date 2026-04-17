import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
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
    const [selectedReqStudent, setSelectedReqStudent] = useState<any>(null);
    const [selectedSendStudent, setSelectedSendStudent] = useState<any>(null);
    const [searchInstTerm, setSearchInstTerm] = useState("");
    const [selectedInst, setSelectedInst] = useState<string | null>(null);

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
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

                            batch.set(studentRef, {
                                uid: user.uid,
                                studentNum: String(row[0] || '').trim(),
                                lastName: String(row[1] || '').trim(),
                                firstName: String(row[2] || '').trim(),
                                transferDate: String(row[3] || '').trim(),
                                transferType: tType,
                                originalInst: String(row[5] || '').trim(), 
                                receivingInst: String(row[6] || '').trim(), 
                                originalDir: String(row[7] || '').trim(), 
                                originalAcademy: String(row[8] || '').trim(),
                                level: String(row[9] || '—').trim(), 
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
        const t = s.transferType.toLowerCase().trim();
        return t.includes('وافد') || t.includes('وافدة') || t.includes('arriving') || t === '';
    };

    const isDeparting = (s: any) => {
        const t = s.transferType.toLowerCase().trim();
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

    // Official Document Generator (A4)
    const renderOfficialDoc = (title: string, salutation: string, students: any[], targetSchool: string, targetProvince: string, ref: string, date: string, notes?: string, reminders?: string[]) => {
        const formattedDate = new Date(date).toLocaleDateString('ar-MA', { year: 'numeric', month: 'long', day: 'numeric' });

        return (
            <div className="official-doc">
                <div className="doc-header-top">
                    <div className="ministry-info" style={{ textAlign: 'right' }}>
                        المملكة المغربية<br />
                        وزارة التربية الوطنية والتعليم الأولي والرياضة<br />
                        {academyName}<br />
                        {provincialName}<br />
                        مؤسسة: {schoolName}
                    </div>
                    <div className="doc-meta">
                        رقم الإرسال: {ref}<br />
                        {currentCity} في: {formattedDate}
                    </div>
                </div>

                <div className="doc-addresses">
                    من السيد مدير(ة): {schoolName}<br />
                    إلى السيد(ة) مدير(ة): {targetSchool || '............................'}<br />
                    المديرية الإقليمية بـ: {targetProvince || '............................'}<br />
                    تحت إشراف السيد(ة) المدير(ة) الإقليمي بـ: {currentCity}
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
                        <div style={{ fontWeight: 800, marginBottom: '5px' }}>تذكير بالمراسلة/المراسلات السابقة:</div>
                        <ul style={{ listStyle: 'none', paddingRight: '20px' }}>
                            {reminders[0] && <li>- المراسلة الأولى بتاريخ: {reminders[0]}</li>}
                            {reminders[1] && <li>- المراسلة الثانية بتاريخ: {reminders[1]}</li>}
                            {reminders[2] && <li>- المراسلة الثالثة بتاريخ: {reminders[2]}</li>}
                        </ul>
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
            "شهادة / شواهد المغادرة"
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
        setRequestSearchTerm("");
        setRequestDate1(s.requestDate1 || "");
        setRequestDate2(s.requestDate2 || "");
        setRequestDate3(s.requestDate3 || "");
    };

    const handleSendSelect = (s: any) => {
        setSelectedSendStudent(s);
        setSendSearchTerm("");
    };

    const generateRequestFileCorr = async () => {
        if (!selectedReqStudent) {
            showToast('يرجى اختيار تلميذ أولاً!', 'error');
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

        setModalContent(renderOfficialDoc(
            "إرسال الوثائق المدرسية للتلميذ(ة):",
            "يشرفني أن أرسل إليكم الوثائق المدرسية للتلميذ(ة)",
            [selectedSendStudent],
            selectedSendStudent.receivingInst,
            selectedSendStudent.originalDir, // Dir of receiving school usually
            sendRef,
            sendDate,
            sendNotes || "طلبكم"
        ));
        setModalOpen(true);
        setShowPrintBtn(true);
    };

    const arrivingStuds = allStudents.filter(isArriving);
    const departingStuds = allStudents.filter(isDeparting);
    const displayStudents = activeTab === 'all' ? allStudents : (activeTab === 'arriving' ? arrivingStuds : departingStuds);

    const requestSearchResults = requestSearchTerm ? arrivingStuds.filter(s =>
        s.studentNum.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
        s.firstName.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
        s.lastName.toLowerCase().includes(requestSearchTerm.toLowerCase())
    ) : [];

    const sendSearchResults = sendSearchTerm ? departingStuds.filter(s =>
        s.studentNum.toLowerCase().includes(sendSearchTerm.toLowerCase()) ||
        s.firstName.toLowerCase().includes(sendSearchTerm.toLowerCase()) ||
        s.lastName.toLowerCase().includes(sendSearchTerm.toLowerCase())
    ) : [];

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
                    <button className="side-btn" onClick={loginWithGoogle} style={{ background: '#4285f4', color: 'white', marginBottom: '20px' }}>
                        تسجيل الدخول بـ Google
                    </button>
                )}

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
                <button className="side-btn" onClick={openBulkRequestModal}>📥 طلب ملف مدرسي</button>
                <button className="side-btn" onClick={openBulkSendModal}>📤 إرسال ملف مدرسي</button>
                <button className={`side-btn ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')}>⚙️ الإعدادات</button>
                <div style={{ marginTop: 'auto', fontSize: '0.8em', opacity: 0.7, textAlign: 'center' }}>إصدار 2.0.0 Pro</div>
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
                                    {Array.from(new Set(allStudents.filter(isArriving).filter(s => 
                                        s.originalInst.toLowerCase().includes(searchInstTerm.toLowerCase())
                                    ).map(s => s.originalInst))).map((inst, i) => (
                                        <div key={i} className="search-result-item" onClick={() => setSelectedInst(inst)}>
                                            <div className="stud-info">
                                                <span className="name">{inst}</span>
                                                <span className="massar">عدد التلاميذ: {allStudents.filter(isArriving).filter(s => s.originalInst === inst).length}</span>
                                            </div>
                                            <div className="select-badge">✓ اختيار</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedInst && (
                                <div className="selected-inst-view" style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px' }}>
                                    <h3 style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        🏢 المؤسسة المختارة: {selectedInst}
                                        <button className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '0.8em' }} onClick={() => setSelectedInst(null)}>تغيير المؤسسة</button>
                                    </h3>
                                    
                                    <div className="table-wrap" style={{ marginBottom: '20px' }}>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>مسار</th>
                                                    <th>الاسم والنسب</th>
                                                    <th>المستوى</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst).map((s, i) => (
                                                    <tr key={i}>
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

                                    <button className="btn btn-warning" style={{ width: '100%' }} onClick={() => {
                                        const students = allStudents.filter(isArriving).filter(s => s.originalInst === selectedInst);
                                        setModalContent(renderOfficialDoc(
                                            "طلب الوثائق المدرسية (طلب جماعي)",
                                            "يشرفني أن أطلب منكم موافاتي بالوثائق المدرسية للتلاميذ المدرجة أسماؤهم أدناه",
                                            students,
                                            selectedInst,
                                            students[0]?.originalDir || "",
                                            corrRef || "..../....",
                                            corrDate,
                                            "شواهد المغادرة الأصلية"
                                        ));
                                        setModalOpen(true);
                                        setShowPrintBtn(true);
                                    }}>
                                        📄 توليد المراسلة الجماعية لهذه المؤسسة
                                    </button>
                                </div>
                            )}
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
                                    {Array.from(new Set(allStudents.filter(isDeparting).filter(s => 
                                        s.receivingInst.toLowerCase().includes(searchInstTerm.toLowerCase())
                                    ).map(s => s.receivingInst))).map((inst, i) => (
                                        <div key={i} className="search-result-item" onClick={() => setSelectedInst(inst)}>
                                            <div className="stud-info">
                                                <span className="name">{inst}</span>
                                                <span className="massar">عدد التلاميذ: {allStudents.filter(isDeparting).filter(s => s.receivingInst === inst).length}</span>
                                            </div>
                                            <div className="select-badge">✓ اختيار</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedInst && (
                                <div className="selected-inst-view" style={{ background: '#f8fafc', padding: '20px', borderRadius: '15px' }}>
                                    <h3 style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        🏢 المؤسسة المختارة: {selectedInst}
                                        <button className="btn btn-primary" style={{ padding: '8px 15px', fontSize: '0.8em' }} onClick={() => setSelectedInst(null)}>تغيير المؤسسة</button>
                                    </h3>
                                    
                                    <div className="table-wrap" style={{ marginBottom: '20px' }}>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>مسار</th>
                                                    <th>الاسم والنسب</th>
                                                    <th>المستوى</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allStudents.filter(isDeparting).filter(s => s.receivingInst === selectedInst).map((s, i) => (
                                                    <tr key={i}>
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

                                    <button className="btn btn-warning" style={{ width: '100%' }} onClick={() => {
                                        const students = allStudents.filter(isDeparting).filter(s => s.receivingInst === selectedInst);
                                        setModalContent(renderOfficialDoc(
                                            "إرسال الوثائق المدرسية (إرسال جماعي)",
                                            "يشرفني أن أرسل إليكم الوثائق المدرسية للتلاميذ المدرجة أسماؤهم أدناه",
                                            students,
                                            selectedInst,
                                            students[0]?.originalDir || "",
                                            corrRef || "..../....",
                                            corrDate,
                                            "طلبكم"
                                        ));
                                        setModalOpen(true);
                                        setShowPrintBtn(true);
                                    }}>
                                        📄 توليد الإرسال الجماعي لهذه المؤسسة
                                    </button>
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
                                <div className="structure-box" style={{ marginBottom: '20px', background: '#fff9f0', borderRight: '5px solid #f2994a', padding: '15px', borderRadius: '10px' }}>
                                    <div style={{ fontWeight: 800, color: '#92400e', marginBottom: '10px' }}>📌 ملاحظات هامة حول ملف Excel:</div>
                                    <ul style={{ listStyle: 'none', paddingRight: '10px', fontSize: '0.95em' }}>
                                        <li>• يبدأ جلب المعطيات تلقائياً من <strong>السطر رقم 10</strong>.</li>
                                <li>• ترتيب الأعمدة: 1.رقم التلميذ | 2.النسب | 3.الإسم | 4.تاريخ التحويل | 5.نوع التحويل | 6.المؤسسة الأصلية | 7.مؤسسة الاستقبال | 8.المديرية الأصلية | 9.الأكاديمية الأصلية | 10.المستوى</li>
                                        <li>• اختر منطقة الاستيراد المناسبة لتصنيف التلاميذ تلقائياً (وافدون أو مغادرون).</li>
                                    </ul>
                                </div>

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

                            {/* Dual Search Sections */}
                            <div className="dual-search-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: '20px', marginBottom: '30px' }}>
                                {/* Request Section */}
                                <div className="card search-section no-print" style={{ borderRight: '5px solid #f2994a' }}>
                                    <h2 className="card-title">🔍 طلب ملف مدرسي (وافدون)</h2>
                                    <p style={{ fontSize: '0.85em', color: '#666', marginBottom: '10px' }}>البحث عن تلميذ وافد لتوليد طلب ملفه من مؤسسته الأصلية</p>
                                    <input 
                                        type="text" 
                                        className="search-input-lg" 
                                        placeholder="ابحث برقم مسار أو الاسم..."
                                        value={requestSearchTerm}
                                        onChange={(e) => setRequestSearchTerm(e.target.value)}
                                    />

                                    {requestSearchTerm && requestSearchResults.length > 0 && !selectedReqStudent && (
                                        <div className="search-results-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                            {requestSearchResults.map((s, i) => (
                                                <div key={i} className="search-result-item" onClick={() => handleRequestSelect(s)}>
                                                    <div className="stud-info">
                                                        <span className="name">{s.lastName} {s.firstName}</span>
                                                        <span className="massar">ماسار: {s.studentNum} | الأصل: {s.originalInst}</span>
                                                    </div>
                                                    <div className="select-badge">✓ اختر</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {requestSearchTerm && requestSearchResults.length === 0 && (
                                        <div className="empty-msg" style={{ padding: '10px', fontSize: '0.9em' }}>لا توجد نتائج لطلب الملف</div>
                                    )}

                                    {selectedReqStudent && (
                                        <div className="selected-student-info" style={{ border: '1px solid #f2994a', background: '#fff9f0', padding: '15px', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                               <h4 style={{ margin: 0 }}>✅ المختار: {selectedReqStudent.lastName} {selectedReqStudent.firstName}</h4>
                                               <button onClick={() => setSelectedReqStudent(null)} className="btn-select" style={{ color: '#666', fontSize: '0.8em' }}>تغيير</button>
                                            </div>
                                            <div className="form-grid" style={{ marginTop: '10px' }}>
                                                <div className="form-group">
                                                    <label>رقم المرجع</label>
                                                    <input type="text" placeholder="رقم المرجع" value={requestRef} onChange={(e) => setRequestRef(e.target.value)} />
                                                </div>
                                                <div className="form-group">
                                                    <label>تاريخ المراسلة</label>
                                                    <input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="form-grid" style={{ marginTop: '10px', padding: '10px', background: '#fff', borderRadius: '5px', border: '1px solid #ffedd5' }}>
                                                <div className="form-group" style={{ gridColumn: 'span 3', fontWeight: 'bold', fontSize: '0.8em', color: '#9a3412', marginBottom: '5px' }}>تنبيهات المراسلات السابقة (إن وجدت):</div>
                                                <div className="form-group">
                                                    <label>تاريخ 1</label>
                                                    <input type="date" value={requestDate1} onChange={(e) => setRequestDate1(e.target.value)} />
                                                </div>
                                                <div className="form-group">
                                                    <label>تاريخ 2</label>
                                                    <input type="date" value={requestDate2} onChange={(e) => setRequestDate2(e.target.value)} />
                                                </div>
                                                <div className="form-group">
                                                    <label>تاريخ 3</label>
                                                    <input type="date" value={requestDate3} onChange={(e) => setRequestDate3(e.target.value)} />
                                                </div>
                                            </div>
                                            <button className="btn btn-warning" style={{ width: '100%', marginTop: '15px' }} onClick={generateRequestFileCorr}>📋 توليد طلب الملف</button>
                                        </div>
                                    )}
                                </div>

                                {/* Send Section */}
                                <div className="card search-section no-print" style={{ borderRight: '5px solid #3b82f6' }}>
                                    <h2 className="card-title">📤 إرسال ملف مدرسي (مغادرون)</h2>
                                    <p style={{ fontSize: '0.85em', color: '#666', marginBottom: '10px' }}>البحث عن تلميذ مغادر لتوليد إرسالية ملفه للمؤسسة المستقبلة</p>
                                    <input 
                                        type="text" 
                                        className="search-input-lg" 
                                        placeholder="ابحث برقم مسار أو الاسم..."
                                        value={sendSearchTerm}
                                        onChange={(e) => setSendSearchTerm(e.target.value)}
                                    />

                                    {sendSearchTerm && sendSearchResults.length > 0 && !selectedSendStudent && (
                                        <div className="search-results-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                            {sendSearchResults.map((s, i) => (
                                                <div key={i} className="search-result-item" onClick={() => handleSendSelect(s)}>
                                                    <div className="stud-info">
                                                        <span className="name">{s.lastName} {s.firstName}</span>
                                                        <span className="massar">ماسار: {s.studentNum} | الاستقبال: {s.receivingInst}</span>
                                                    </div>
                                                    <div className="select-badge">✓ اختر</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {sendSearchTerm && sendSearchResults.length === 0 && (
                                        <div className="empty-msg" style={{ padding: '10px', fontSize: '0.9em' }}>لا توجد نتائج لإرسال الملف</div>
                                    )}

                                    {selectedSendStudent && (
                                        <div className="selected-student-info" style={{ border: '1px solid #3b82f6', background: '#eff6ff', padding: '15px', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                               <h4 style={{ margin: 0 }}>✅ المختار: {selectedSendStudent.lastName} {selectedSendStudent.firstName}</h4>
                                               <button onClick={() => setSelectedSendStudent(null)} className="btn-select" style={{ color: '#666', fontSize: '0.8em' }}>تغيير</button>
                                            </div>
                                            <div className="form-grid" style={{ marginTop: '10px' }}>
                                                <div className="form-group">
                                                    <label>رقم المرجع</label>
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
                                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '15px' }} onClick={generateSendFileCorr}>📤 توليد إرسال ملف</button>
                                        </div>
                                    )}
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
                                                        <th>تاريخ التحويل</th>
                                                        <th>نوع التحويل</th>
                                                        <th>المؤسسة الأصلية</th>
                                                        <th>مؤسسة الإستقبال</th>
                                                        <th>م. الإقليمية الأصلية</th>
                                                        <th>الأكاديمية الأصلية</th>
                                                        <th>إجراء</th>
                                                    </tr>
                                                ) : activeTab === 'departing' ? (
                                                    <tr>
                                                        <th>رقم التلميذ</th>
                                                        <th>النسب</th>
                                                        <th>الإسم</th>
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
                                                                <td>{s.transferDate}</td>
                                                                <td>{s.transferType}</td>
                                                                <td>{s.originalInst}</td>
                                                                <td>{s.receivingInst}</td>
                                                                <td>{s.originalDir}</td>
                                                                <td>{s.originalAcademy}</td>
                                                            </>
                                                        ) : activeTab === 'departing' ? (
                                                            <>
                                                                <td>{s.studentNum}</td>
                                                                <td>{s.lastName}</td>
                                                                <td>{s.firstName}</td>
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

            {/* Modal for Official Documents */}
            <div className="modal-overlay" style={{ display: modalOpen ? 'block' : 'none' }} onClick={() => setModalOpen(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <button className="modal-close no-print" onClick={() => setModalOpen(false)} style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 1100, padding: '10px 20px', borderRadius: '10px', background: '#eb3349', color: 'white', border: 'none', cursor: 'pointer' }}>إغلاق ✕</button>
                    {showPrintBtn && (
                        <button className="btn btn-success no-print" onClick={() => window.print()} style={{ position: 'fixed', top: '20px', left: '120px', zIndex: 1100 }}>🖨️ طباعة أو حفظ PDF</button>
                    )}
                    {modalContent}
                </div>
            </div>
        </div>
    );
}
