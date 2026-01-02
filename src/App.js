import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Save,
  RefreshCw,
  FileText,
  CheckCircle,
  AlertCircle,
  Settings,
  LogOut,
  Shield,
  CheckSquare,
  XSquare,
  PlusCircle,
  MinusCircle,
  DollarSign,
  ArrowRightCircle,
  Calculator,
  Users,
  Activity,
  AlertTriangle,
  Lock,
  Zap,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  X,
  AlertOctagon,
  Loader2,
  ClipboardCheck,
} from "lucide-react";

// --- 1. 基礎設定與工具函式 ---

const LEAVE_REASONS = ["補休", "事假", "病假", "其他 (自填)"];
const OVERTIME_REASONS = ["值班", "其他 (自填)"];

const safeLocalStorage = {
  getItem: (key) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.warn("LocalStorage access denied:", e);
    }
    return null;
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn("LocalStorage access denied:", e);
    }
  },
};

const getLocalTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTimestamp = (isoString) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const s = String(dateStr);
  if (s.includes("T") || s.includes("Z")) {
    const d = new Date(dateStr);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const cleanDateStr = s.substring(0, 10);
  const [y, m, d] = cleanDateStr.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return new Date();
  return new Date(y, m - 1, d);
};

const getCycleDates = (startDateStr) => {
  if (!startDateStr)
    return { start: new Date(), end: new Date(), nextStart: new Date() };
  const joinDate = parseLocalDate(startDateStr);
  const today = new Date();
  const currentYear = today.getFullYear();

  let cycleStart = new Date(
    currentYear,
    joinDate.getMonth(),
    joinDate.getDate()
  );

  if (today < cycleStart) {
    cycleStart.setFullYear(currentYear - 1);
  }

  const nextCycleStart = new Date(cycleStart);
  nextCycleStart.setFullYear(nextCycleStart.getFullYear() + 1);

  const cycleEnd = new Date(nextCycleStart);
  cycleEnd.setDate(cycleEnd.getDate() - 1);

  return { start: cycleStart, end: cycleEnd, nextStart: nextCycleStart };
};

const calculateEntitlement = (startDateStr) => {
  if (!startDateStr) return 0;
  const start = parseLocalDate(startDateStr);
  const now = new Date();
  const diffTime = Math.abs(now - start);
  const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

  if (diffYears < 0.5) return 0;
  if (diffYears < 1) return 3;
  if (diffYears < 2) return 7;
  if (diffYears < 3) return 10;
  if (diffYears < 5) return 14;
  if (diffYears < 10) return 15;
  const extraDays = Math.floor(diffYears - 10);
  return Math.min(30, 16 + extraDays);
};

// --- 2. 元件定義 ---

// 日曆元件
const CalendarView = ({ records, users, isAdmin, onAddRoster }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [rosterDate, setRosterDate] = useState(getLocalTodayString());
  const [rosterUserId, setRosterUserId] = useState("");
  const [rosterNote, setRosterNote] = useState("預定值班");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleAddRosterSubmit = (e) => {
    e.preventDefault();
    if (!rosterUserId) return alert("請選擇人員");
    onAddRoster({ date: rosterDate, userId: rosterUserId, note: rosterNote });
    setRosterUserId("");
  };

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="h-24 bg-slate-50 border-r border-b border-slate-100"
        ></div>
      );
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
        d
      ).padStart(2, "0")}`;
      const dayRecords = records.filter(
        (r) =>
          r.date === dateStr &&
          (r.status === "approved" || r.category === "roster")
      );
      days.push(
        <div
          key={d}
          className="min-h-[100px] bg-white border-r border-b border-slate-100 p-1 relative hover:bg-slate-50 transition-colors group"
        >
          <div className="text-xs font-bold text-slate-400 mb-1 ml-1">{d}</div>
          <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
            {dayRecords.map((r) => (
              <div
                key={r.id}
                className={`text-[10px] px-1.5 py-1 rounded-md truncate shadow-sm ${
                  r.category === "leave"
                    ? "bg-red-50 text-red-700 border border-red-100"
                    : r.category === "overtime"
                    ? "bg-green-50 text-green-700 border border-green-100"
                    : "bg-blue-50 text-blue-700 border border-blue-100"
                }`}
                title={`${r.userName}: ${r.reason}`}
              >
                {r.category === "roster" && (
                  <span className="font-bold mr-1">排</span>
                )}
                {r.category === "leave" && (
                  <span className="font-bold mr-1">休</span>
                )}
                {r.category === "overtime" && (
                  <span className="font-bold mr-1">實</span>
                )}
                {r.userName}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-slate-50 rounded-full text-slate-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-bold text-lg text-slate-800">
          {year}年 {month + 1}月
        </h2>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-slate-50 rounded-full text-slate-600 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 text-center text-xs font-bold text-slate-500 py-3 border-b border-slate-200">
          <div>日</div>
          <div>一</div>
          <div>二</div>
          <div>三</div>
          <div>四</div>
          <div>五</div>
          <div>六</div>
        </div>
        <div className="grid grid-cols-7">{renderDays()}</div>
      </div>
      <div className="flex items-center gap-4 text-xs text-slate-500 justify-center py-2">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div> 預排班表
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div> 實際加班
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div> 請假
        </div>
      </div>
      {isAdmin && (
        <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-xl shadow-sm">
          <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> 新增預排班表 (僅供查看)
          </h3>
          <form
            onSubmit={handleAddRosterSubmit}
            className="flex flex-col md:flex-row gap-3 items-end"
          >
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-blue-700 mb-1">
                日期
              </label>
              <input
                type="date"
                value={rosterDate}
                onChange={(e) => setRosterDate(e.target.value)}
                className="w-full p-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                required
              />
            </div>
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-blue-700 mb-1">
                人員
              </label>
              <select
                value={rosterUserId}
                onChange={(e) => setRosterUserId(e.target.value)}
                className="w-full p-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none bg-white"
                required
              >
                <option value="">請選擇...</option>
                {users
                  .filter((u) => u.role !== "admin")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex-[2] w-full">
              <label className="block text-xs font-medium text-blue-700 mb-1">
                班別/備註
              </label>
              <input
                type="text"
                value={rosterNote}
                onChange={(e) => setRosterNote(e.target.value)}
                className="w-full p-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                placeholder="例：早班、值班..."
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 shadow-md shadow-blue-200 whitespace-nowrap w-full md:w-auto transition-colors"
            >
              加入排班
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// 錯誤處理邊界
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full border border-slate-200">
            <div className="inline-flex p-3 bg-red-100 rounded-full mb-4">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              應用程式發生錯誤
            </h2>
            <div className="text-left bg-slate-100 p-4 rounded-lg overflow-auto text-xs font-mono text-red-600 border border-slate-200 max-h-48 mb-4">
              {this.state.error && this.state.error.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
            >
              重新整理頁面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- 3. 主系統內容 (LeaveAndOvertimeApp) ---
// [FIX] Rename this component back to LeaveAndOvertimeApp to match the export in App component
function LeaveAndOvertimeApp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [apiUrl, setApiUrl] = useState("");
  const [useDemo, setUseDemo] = useState(false);
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // Auth State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [pendingUser, setPendingUser] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Settlement Modal State
  const [settlementModal, setSettlementModal] = useState(null);
  const [adminActionPwd, setAdminActionPwd] = useState("");
  const [adminActionError, setAdminActionError] = useState("");

  // Form State
  const [category, setCategory] = useState("leave");
  const [deductionSource, setDeductionSource] = useState("annual");
  const [date, setDate] = useState(getLocalTodayString());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [amount, setAmount] = useState(8);
  const [reasonSelect, setReasonSelect] = useState(LEAVE_REASONS[0]);
  const [customReason, setCustomReason] = useState("");

  // --- 強制載入 Tailwind CSS ---
  useEffect(() => {
    const scriptId = "tailwind-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (category === "leave") setReasonSelect(LEAVE_REASONS[0]);
    else setReasonSelect(OVERTIME_REASONS[0]);
    setCustomReason("");
  }, [category]);

  useEffect(() => {
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      if (end > start) {
        const diffHrs = (end - start) / (1000 * 60 * 60);
        const finalHrs = diffHrs > 5 ? diffHrs - 1 : diffHrs;
        setAmount(Math.max(0, finalHrs));
      } else {
        setAmount(0);
      }
    }
  }, [startTime, endTime]);

  useEffect(() => {
    const savedUrl = safeLocalStorage.getItem("gas_api_url");
    if (savedUrl) {
      setApiUrl(savedUrl);
      setUseDemo(false);
      fetchData(savedUrl);
    }
  }, []);

  const verifyPasswordWithBackend = async (pwd) => {
    if (useDemo) return pwd === "admin888";
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        body: JSON.stringify({ action: "verifyAdmin", password: pwd }),
      });
      const result = await response.json();
      return result.status === "success";
    } catch (err) {
      console.error("Verification failed", err);
      return false;
    }
  };

  const calculateBalance = (user) => {
    if (!user)
      return {
        annualLeft: 0,
        compLeft: 0,
        annualTotal: 0,
        cycleStart: null,
        cycleEnd: null,
      };

    const annualTotalDays = calculateEntitlement(user.startDate);
    const annualTotalHours = annualTotalDays * 8;
    const cycle = getCycleDates(user.startDate);

    const userRecords = records.filter(
      (r) => r.userId === user.id && r.status === "approved"
    );
    const validRecords = userRecords.filter((r) => r.category !== "roster");

    const annualRecordsInCycle = validRecords.filter(
      (r) =>
        r.type === "annual" &&
        parseLocalDate(r.date) >= cycle.start &&
        parseLocalDate(r.date) <= cycle.end
    );

    let annualUsage = 0;
    let annualAdjustment = 0;

    annualRecordsInCycle.forEach((r) => {
      const amt = parseFloat(r.amount);
      if (r.category === "leave" || r.category === "settlement")
        annualUsage += Math.abs(amt);
      else if (r.category === "adjustment") annualAdjustment += amt;
    });

    const initialComp = parseFloat(user.compTotal || 0);
    let compBalance = initialComp;

    const compRecordsInCycle = validRecords.filter(
      (r) =>
        r.type === "comp" &&
        parseLocalDate(r.date) >= cycle.start &&
        parseLocalDate(r.date) <= cycle.end
    );

    compRecordsInCycle.forEach((r) => {
      const amt = parseFloat(r.amount);
      if (r.category === "overtime" || r.category === "adjustment")
        compBalance += amt;
      else if (r.category === "leave" || r.category === "settlement")
        compBalance -= Math.abs(amt);
    });

    return {
      annualLeft: annualTotalHours + annualAdjustment - annualUsage,
      compLeft: compBalance,
      annualTotal: annualTotalHours,
      cycleStart: cycle.start,
      cycleEnd: cycle.end,
    };
  };

  const balance = calculateBalance(currentUser);

  const fetchData = async (url = apiUrl) => {
    if (!url) return;
    setLoading(true);
    try {
      const response = await fetch(url + "?action=getData");
      const data = await response.json();
      if (data.status === "success") {
        setUsers(data.users);
        setRecords(data.records);
        if (currentUser) {
          const updated = data.users.find((u) => u.id === currentUser.id);
          if (updated) setCurrentUser(updated);
        }
      }
    } catch (err) {
      console.error(err);
      if (!users.length) setUseDemo(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFullDay = () => {
    setStartTime("08:30");
    setEndTime("17:30");
    setAmount(8);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);

    const finalReason =
      reasonSelect === "其他 (自填)" ? customReason : reasonSelect;
    let recordType = category === "overtime" ? "comp" : deductionSource;

    const newRecord = {
      id: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      category,
      type: recordType,
      amount: parseFloat(amount),
      date,
      startTime,
      endTime,
      reason: finalReason,
      status: "pending",
      timestamp: new Date().toISOString(),
    };
    await submitRecord(newRecord);

    setCustomReason("");
    setStartTime("");
    setEndTime("");
    if (category === "leave") setReasonSelect(LEAVE_REASONS[0]);
    else setReasonSelect(OVERTIME_REASONS[0]);
  };

  const handleAddRoster = async (rosterData) => {
    const targetUser = users.find((u) => u.id === rosterData.userId);
    if (!targetUser) return;
    setLoading(true);
    await submitRecord({
      id: Date.now(),
      userId: targetUser.id,
      userName: targetUser.name,
      category: "roster",
      type: "duty",
      amount: 0,
      date: rosterData.date,
      startTime: "",
      endTime: "",
      reason: rosterData.note,
      status: "approved",
      timestamp: new Date().toISOString(),
    });
  };

  const submitRecord = async (recordData) => {
    if (useDemo) {
      setTimeout(() => {
        setRecords([recordData, ...records]);
        setSuccessMsg("操作成功 (Demo)");
        setLoading(false);
      }, 500);
    } else {
      try {
        await fetch(apiUrl, {
          method: "POST",
          body: JSON.stringify({ action: "addRecord", data: recordData }),
        });
        setSuccessMsg("操作成功");
        fetchData();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleUpdateStatus = async (recordId, newStatus) => {
    setLoading(true);
    if (useDemo) {
      setRecords(
        records.map((r) =>
          r.id === recordId ? { ...r, status: newStatus } : r
        )
      );
      setLoading(false);
    } else {
      try {
        await fetch(apiUrl, {
          method: "POST",
          body: JSON.stringify({
            action: "updateStatus",
            recordId,
            status: newStatus,
          }),
        });
        fetchData();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const openSettlementModal = (
    targetUser,
    type,
    actionType,
    calcAmount,
    cycleData
  ) => {
    let cashValue = 0;
    const salary = parseFloat(targetUser.salary || 0);
    const hourlyRate = salary / 30 / 8;
    if (actionType === "cashout") {
      cashValue = Math.round(hourlyRate * calcAmount);
    }

    setSettlementModal({
      user: targetUser,
      type,
      actionType,
      amount: calcAmount,
      cycleData,
      cashValue,
    });
    setAdminActionPwd("");
    setAdminActionError("");
  };

  const executeSettlement = async () => {
    if (!settlementModal) return;
    const { user, type, actionType, amount, cycleData, cashValue } =
      settlementModal;

    if (actionType === "defer") {
      setVerifyLoading(true);
      const isValid = await verifyPasswordWithBackend(adminActionPwd);
      setVerifyLoading(false);

      if (!isValid) {
        setAdminActionError("密碼錯誤");
        return;
      }
    }

    setLoading(true);
    setSettlementModal(null);

    const nextYearCycleEnd = new Date(cycleData.end);
    nextYearCycleEnd.setFullYear(nextYearCycleEnd.getFullYear() + 1);
    const expiryDateStr = nextYearCycleEnd.toISOString().split("T")[0];

    const recordDate = cycleData.end.toISOString().split("T")[0];
    const category = actionType === "defer" ? "adjustment" : "settlement";
    const finalAmount =
      actionType === "defer" ? Math.abs(amount) : -Math.abs(amount);

    const memo =
      actionType === "defer"
        ? `上年度特休遞延 (有效期至 ${expiryDateStr})`
        : `年度未休結算 (折發 $${cashValue})`;

    const newRecord = {
      id: Date.now(),
      userId: user.id,
      userName: user.name,
      category,
      type,
      amount: finalAmount,
      date: recordDate,
      reason: memo,
      status: "approved",
      timestamp: new Date().toISOString(),
    };
    await submitRecord(newRecord);
  };

  const handleUserClick = (user) => {
    if (user.role === "admin") {
      setPendingUser(user);
      setShowLoginModal(true);
      setLoginPassword("");
      setLoginError("");
    } else {
      setCurrentUser(user);
      setActiveTab("dashboard");
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setVerifyLoading(true);
    const isValid = await verifyPasswordWithBackend(loginPassword);
    setVerifyLoading(false);

    if (isValid) {
      setCurrentUser(pendingUser);
      setShowLoginModal(false);
      setPendingUser(null);
      setActiveTab("dashboard");
    } else {
      setLoginError("密碼錯誤");
    }
  };

  const getAdminStats = () => {
    let totalPending = records.filter((r) => r.status === "pending").length;
    let totalCompLiability = 0;
    let totalAnnualLiability = 0;
    const todayStr = getLocalTodayString();
    const leaveToday = records
      .filter(
        (r) =>
          r.date === todayStr &&
          r.category === "leave" &&
          r.status === "approved"
      )
      .map((r) => r.userName);
    users.forEach((u) => {
      if (u.role === "admin") return;
      const bal = calculateBalance(u);
      totalCompLiability += bal.compLeft;
      totalAnnualLiability += bal.annualLeft;
    });
    return {
      totalPending,
      totalCompLiability,
      totalAnnualLiability,
      leaveToday,
    };
  };

  if (!currentUser && !isConfiguring) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full relative">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" /> 名根休假管理系統
            </h1>
            <p className="text-slate-500 mt-2">請選擇登入身分</p>
          </div>

          <div className="space-y-3">
            {users.length === 0 && !isConfiguring ? (
              <div className="text-center py-8 text-slate-400">
                <p className="mb-4">尚未載入資料</p>
                <div className="animate-pulse flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              </div>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-blue-50 transition-all group hover:shadow-sm bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        user.role === "admin" ? "bg-purple-100" : "bg-slate-200"
                      }`}
                    >
                      {user.role === "admin" ? (
                        <Lock className="w-5 h-5 text-purple-600" />
                      ) : (
                        <User className="w-5 h-5 text-slate-600" />
                      )}
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-lg block text-slate-700">
                        {user.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {user.role === "admin" ? "Admin" : "User"}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="mt-8 pt-6 border-t flex justify-center">
            <button
              onClick={() => setIsConfiguring(true)}
              className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 transition-colors"
            >
              <Settings className="w-4 h-4" /> 系統設定
            </button>
          </div>

          {showLoginModal && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center p-6 z-20">
              <div className="bg-white border border-slate-200 shadow-xl p-6 rounded-lg w-full max-w-sm animate-in fade-in zoom-in duration-200">
                <h3 className="font-bold text-lg mb-4 text-center text-slate-800">
                  請輸入管理員密碼
                </h3>
                <form onSubmit={handleAdminLogin}>
                  {/* [修正] 移除密碼提示 placeholder */}
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full p-3 border rounded-lg mb-2 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                    autoFocus
                  />
                  {loginError && (
                    <p className="text-red-500 text-sm mb-2">{loginError}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLoginModal(false);
                        setLoginError("");
                      }}
                      className="flex-1 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={verifyLoading}
                      className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex justify-center items-center shadow-md shadow-purple-200 transition-colors"
                    >
                      {verifyLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "登入"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isConfiguring) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full">
          <h2 className="text-xl font-bold mb-4 text-slate-800">連線設定</h2>
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="GAS Web App URL"
            className="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={() => {
              safeLocalStorage.setItem("gas_api_url", apiUrl);
              setIsConfiguring(false);
              setUseDemo(false);
              fetchData(apiUrl);
            }}
            className="w-full bg-blue-600 text-white py-2 rounded-lg mb-2 hover:bg-blue-700 shadow-md transition-colors"
          >
            儲存
          </button>
          <button
            onClick={() => setIsConfiguring(false)}
            className="w-full text-slate-500 py-2 hover:text-slate-700"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";
  const adminStats = isAdmin ? getAdminStats() : null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-10">
      {/* Settlement Modal */}
      {settlementModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {settlementModal.actionType === "defer" ? (
                  <ArrowRightCircle className="text-indigo-600" />
                ) : (
                  <DollarSign className="text-green-600" />
                )}
                {settlementModal.actionType === "defer"
                  ? "確認遞延"
                  : "確認結算"}
              </h3>
              <button
                onClick={() => setSettlementModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg mb-4 text-sm space-y-2 border border-slate-100">
              <div className="flex justify-between">
                <span>員工姓名:</span>{" "}
                <span className="font-bold">{settlementModal.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span>項目:</span>{" "}
                <span>
                  {settlementModal.type === "annual" ? "特休" : "補休"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>時數:</span>{" "}
                <span className="font-bold">{settlementModal.amount} 小時</span>
              </div>
              {settlementModal.actionType === "cashout" && (
                <div className="flex justify-between text-green-700 pt-2 border-t mt-2">
                  <span>預計折發:</span>{" "}
                  <span className="font-bold text-lg">
                    ${settlementModal.cashValue.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {settlementModal.actionType === "defer" && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  管理員密碼
                </label>
                <input
                  type="password"
                  value={adminActionPwd}
                  onChange={(e) => setAdminActionPwd(e.target.value)}
                  placeholder="請輸入密碼"
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  autoFocus
                />
                {adminActionError && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3" /> {adminActionError}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  * 遞延後，時數將移轉至下個年度週期，並自動加上一年有效期註記。
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setSettlementModal(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={executeSettlement}
                disabled={verifyLoading}
                className={`flex-1 py-2.5 text-white rounded-lg font-bold shadow-lg shadow-blue-100 transition-all flex justify-center items-center ${
                  settlementModal.actionType === "defer"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {verifyLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "確認執行"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield
              className={`w-6 h-6 ${
                isAdmin ? "text-purple-600" : "text-blue-600"
              }`}
            />
            <h1 className="font-bold text-lg hidden sm:block">
              {isAdmin ? "管理員控制台" : "名根休假管理系統"}
            </h1>
          </div>

          <div className="flex bg-slate-100 rounded-lg p-1 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3 py-1 text-sm rounded-md whitespace-nowrap flex items-center gap-1 transition-all ${
                activeTab === "dashboard"
                  ? "bg-white shadow text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <FileText className="w-4 h-4" /> {isAdmin ? "概況" : "申請"}
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-3 py-1 text-sm rounded-md whitespace-nowrap flex items-center gap-1 transition-all ${
                activeTab === "calendar"
                  ? "bg-white shadow text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CalendarIcon className="w-4 h-4" /> 行事曆
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab("approval")}
                  className={`px-3 py-1 text-sm rounded-md whitespace-nowrap flex items-center gap-1 transition-all ${
                    activeTab === "approval"
                      ? "bg-white shadow text-slate-800"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <ClipboardCheck className="w-4 h-4" /> 簽核{" "}
                  {records.filter((r) => r.status === "pending").length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full ml-1">
                      {records.filter((r) => r.status === "pending").length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("settlement")}
                  className={`px-3 py-1 text-sm rounded-md whitespace-nowrap flex items-center gap-1 transition-all ${
                    activeTab === "settlement"
                      ? "bg-white shadow text-slate-800"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Calculator className="w-4 h-4" /> 結算
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-800">
                {currentUser.name}
              </div>
              <div className="text-xs text-slate-500">
                {isAdmin ? "Admin" : "User"}
              </div>
            </div>
            <button
              onClick={() => setCurrentUser(null)}
              className="text-slate-400 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {(error || successMsg) && (
          <div
            className={`p-4 rounded-lg flex items-center gap-2 shadow-sm ${
              error
                ? "bg-red-50 text-red-700 border border-red-100"
                : "bg-green-50 text-green-700 border border-green-100"
            }`}
          >
            {error ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            <span>{error || successMsg}</span>
          </div>
        )}

        {/* --- CALENDAR TAB --- */}
        {activeTab === "calendar" && (
          <CalendarView
            records={records}
            users={users}
            isAdmin={isAdmin}
            onAddRoster={handleAddRoster}
          />
        )}

        {/* --- SETTLEMENT TAB (Admin Only) --- */}
        {activeTab === "settlement" && isAdmin && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
              <Calculator className="w-5 h-5 text-blue-600" /> 年度結算作業
            </h2>
            {/* [修正] 精簡說明 */}
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-6 border border-blue-100">
              <p className="font-bold mb-1">說明：</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>遞延：</strong>將剩餘時數移轉至下個年度週期
                  (需管理員密碼)。
                </li>
                <li>
                  <strong>結算：</strong>依時薪折發並扣除剩餘時數。
                </li>
              </ul>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="p-3 whitespace-nowrap">姓名</th>
                    <th className="p-3 whitespace-nowrap border-r border-slate-200">
                      結算日 (週期結束)
                    </th>
                    <th className="p-3 text-center whitespace-nowrap">
                      特休餘額
                    </th>
                    <th className="p-3 whitespace-nowrap">特休操作</th>
                    <th className="p-3 text-center border-l border-slate-200 whitespace-nowrap">
                      補休餘額
                    </th>
                    <th className="p-3 whitespace-nowrap">補休操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter((u) => u.role !== "admin")
                    .map((u) => {
                      const bal = calculateBalance(u);
                      const cycleData = getCycleDates(u.startDate);
                      return (
                        <tr
                          key={u.id}
                          className="border-b hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-3 font-medium align-middle text-slate-700">
                            {u.name}
                          </td>
                          <td className="p-3 text-slate-600 align-middle border-r border-slate-200">
                            {cycleData.end.toLocaleDateString()}
                          </td>
                          <td className="p-3 text-center align-middle">
                            <span
                              className={`font-bold text-lg ${
                                bal.annualLeft > 0
                                  ? "text-blue-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {bal.annualLeft}
                            </span>{" "}
                            <span className="text-xs text-slate-400">時</span>
                          </td>
                          <td className="p-3 align-middle">
                            <div className="flex flex-col gap-2">
                              <button
                                disabled={bal.annualLeft <= 0}
                                onClick={() =>
                                  openSettlementModal(
                                    u,
                                    "annual",
                                    "defer",
                                    bal.annualLeft,
                                    cycleData
                                  )
                                }
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md text-xs hover:bg-indigo-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 w-fit transition-colors"
                              >
                                <ArrowRightCircle className="w-3 h-3" /> 遞延
                              </button>
                              <button
                                disabled={bal.annualLeft <= 0}
                                onClick={() =>
                                  openSettlementModal(
                                    u,
                                    "annual",
                                    "cashout",
                                    bal.annualLeft,
                                    cycleData
                                  )
                                }
                                className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md text-xs hover:bg-green-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 w-fit transition-colors"
                              >
                                <DollarSign className="w-3 h-3" /> 結算
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-center border-l border-slate-200 align-middle">
                            <span
                              className={`font-bold text-lg ${
                                bal.compLeft > 0
                                  ? "text-teal-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {bal.compLeft}
                            </span>{" "}
                            <span className="text-xs text-slate-400">時</span>
                          </td>
                          <td className="p-3 align-middle">
                            <button
                              disabled={bal.compLeft <= 0}
                              onClick={() =>
                                openSettlementModal(
                                  u,
                                  "comp",
                                  "cashout",
                                  bal.compLeft,
                                  cycleData
                                )
                              }
                              className="px-3 py-1.5 bg-green-50 text-green-700 rounded-md text-xs hover:bg-green-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                            >
                              <DollarSign className="w-3 h-3" /> 結算
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- APPROVAL TAB --- */}
        {activeTab === "approval" && isAdmin && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
              <CheckSquare className="w-5 h-5 text-blue-600" /> 待核准項目
            </h2>
            {records.filter((r) => r.status === "pending").length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                目前沒有待核准的申請
              </div>
            ) : (
              <div className="space-y-3">
                {records
                  .filter((r) => r.status === "pending")
                  .map((record) => (
                    <div
                      key={record.id}
                      className="border rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg text-slate-800">
                            {record.userName}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              record.category === "overtime"
                                ? "bg-teal-100 text-teal-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {record.category === "overtime"
                              ? "回報加班"
                              : "申請休假"}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600">
                          {record.date}{" "}
                          {record.startTime && record.endTime
                            ? `(${record.startTime}~${record.endTime})`
                            : ""}{" "}
                          • {record.type === "annual" ? "扣特休" : "補休變動"}{" "}
                          <span className="font-bold mx-1 text-slate-900">
                            {record.amount}
                          </span>{" "}
                          小時
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          事由: {record.reason}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          申請時間: {formatTimestamp(record.timestamp)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleUpdateStatus(record.id, "rejected")
                          }
                          className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1 transition-colors"
                        >
                          <XSquare className="w-4 h-4" /> 駁回
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateStatus(record.id, "approved")
                          }
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 shadow-md shadow-blue-100 transition-colors"
                        >
                          <CheckSquare className="w-4 h-4" /> 核准
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* --- DASHBOARD TAB (Admin View) --- */}
        {activeTab === "dashboard" && isAdmin && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => setActiveTab("approval")}
                className={`p-6 rounded-xl shadow-sm border cursor-pointer transition-all hover:scale-105 hover:shadow-md ${
                  adminStats.totalPending > 0
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-slate-800 border-slate-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p
                      className={`text-sm font-medium ${
                        adminStats.totalPending > 0
                          ? "text-red-100"
                          : "text-slate-500"
                      }`}
                    >
                      待核准申請
                    </p>
                    <h3 className="text-3xl font-bold mt-1">
                      {adminStats.totalPending}
                    </h3>
                  </div>
                  <AlertTriangle
                    className={`w-8 h-8 ${
                      adminStats.totalPending > 0
                        ? "opacity-50"
                        : "text-slate-300"
                    }`}
                  />
                </div>
                {adminStats.totalPending > 0 && (
                  <p className="text-xs mt-2 text-red-100 bg-red-600/30 inline-block px-2 py-0.5 rounded">
                    點擊前往審核
                  </p>
                )}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-medium text-slate-500">今日休假</p>
                  <CalendarIcon className="w-6 h-6 text-blue-500" />
                </div>
                {adminStats.leaveToday.length > 0 ? (
                  <div className="space-y-1">
                    {adminStats.leaveToday.map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="font-bold text-slate-700">{name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 text-sm">今日全員到齊</div>
                )}
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      補修總負債
                    </p>
                    <h3 className="text-3xl font-bold mt-1 text-teal-600">
                      {adminStats.totalCompLiability}{" "}
                      <span className="text-sm text-slate-400 font-normal">
                        小時
                      </span>
                    </h3>
                  </div>
                  <Clock className="w-8 h-8 text-teal-100" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      特休總餘額
                    </p>
                    <h3 className="text-3xl font-bold mt-1 text-blue-600">
                      {adminStats.totalAnnualLiability}{" "}
                      <span className="text-sm text-slate-400 font-normal">
                        小時
                      </span>
                    </h3>
                  </div>
                  <FileText className="w-8 h-8 text-blue-100" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
                <Activity className="w-5 h-5 text-blue-600" /> 全公司近期異動
              </h3>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-3">時間</th>
                      <th className="p-3">姓名</th>
                      <th className="p-3">動作</th>
                      <th className="p-3">詳細內容</th>
                      <th className="p-3">狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 10).map((r) => (
                      <tr
                        key={r.id}
                        className="border-b hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-3 text-slate-500 text-xs whitespace-nowrap">
                          {formatTimestamp(r.timestamp)}
                        </td>
                        <td className="p-3 font-medium text-slate-700">
                          {r.userName}
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              r.category === "roster"
                                ? "bg-blue-50 text-blue-700"
                                : r.category === "overtime"
                                ? "bg-teal-50 text-teal-700"
                                : r.category === "settlement"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {r.category === "roster"
                              ? "排班值勤"
                              : r.category === "overtime"
                              ? "回報加班"
                              : r.category === "settlement"
                              ? "結算/遞延"
                              : "申請請假"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">
                          {r.category !== "roster" &&
                            `${Math.abs(r.amount)} 小時`}{" "}
                          <span className="text-slate-400 mx-1">|</span>{" "}
                          {r.date} ({r.reason})
                        </td>
                        <td className="p-3">
                          {r.status === "pending" ? (
                            <span className="text-yellow-600 font-bold">
                              待核准
                            </span>
                          ) : (
                            <span className="text-slate-400">已處理</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- DASHBOARD TAB (User View) --- */}
        {activeTab === "dashboard" && !isAdmin && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group">
                <FileText className="absolute right-0 top-0 opacity-10 w-32 h-32 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-blue-100 font-medium">特休假餘額</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-bold">
                    {balance.annualLeft}
                  </span>
                  <span className="text-lg opacity-80">小時</span>
                </div>
                <div className="text-xs text-blue-200 mt-2 bg-blue-700/30 inline-block px-2 py-1 rounded">
                  週期:{" "}
                  {balance.cycleStart
                    ? balance.cycleStart.toLocaleDateString()
                    : ""}{" "}
                  ~{" "}
                  {balance.cycleEnd
                    ? balance.cycleEnd.toLocaleDateString()
                    : ""}
                </div>
              </div>
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group">
                <Clock className="absolute right-0 top-0 opacity-10 w-32 h-32 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-teal-100 font-medium">補休餘額</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-bold">{balance.compLeft}</span>
                  <span className="text-lg opacity-80">小時</span>
                </div>
                {/* [修正] 修改補休說明文字為顯示週期 */}
                <div className="text-xs text-teal-200 mt-2 bg-teal-700/30 inline-block px-2 py-1 rounded">
                  週期:{" "}
                  {balance.cycleStart
                    ? balance.cycleStart.toLocaleDateString()
                    : ""}{" "}
                  ~{" "}
                  {balance.cycleEnd
                    ? balance.cycleEnd.toLocaleDateString()
                    : ""}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                <h2 className="font-bold text-lg mb-4 text-slate-800">
                  申請/回報
                </h2>
                <div className="flex grid-cols-2 gap-4 mb-6">
                  {" "}
                  {/* Change to Grid Layout */}
                  <button
                    onClick={() => {
                      setCategory("leave");
                      setDeductionSource("annual");
                    }}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 w-full ${
                      category === "leave"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <MinusCircle className="w-6 h-6" />{" "}
                    <span className="font-bold text-lg">請假</span>
                  </button>
                  <button
                    onClick={() => {
                      setCategory("overtime");
                    }}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 w-full ${
                      category === "overtime"
                        ? "border-teal-500 bg-teal-50 text-teal-700"
                        : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <PlusCircle className="w-6 h-6" />{" "}
                    <span className="font-bold text-lg">加班</span>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {category === "leave" && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        扣假來源
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {" "}
                        {/* Changed to grid for equal width */}
                        <label
                          className={`flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                            deductionSource === "annual"
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="deductionSource"
                            value="annual"
                            checked={deductionSource === "annual"}
                            onChange={() => setDeductionSource("annual")}
                            className="hidden"
                          />
                          <span className="text-sm font-medium">特休</span>
                        </label>
                        <label
                          className={`flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                            deductionSource === "comp"
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="deductionSource"
                            value="comp"
                            checked={deductionSource === "comp"}
                            onChange={() => setDeductionSource("comp")}
                            className="hidden"
                          />
                          <span className="text-sm font-medium">補休</span>
                        </label>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      日期
                    </label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        開始時間{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          (選填)
                        </span>
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        結束時間{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          (選填)
                        </span>
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        總計時數 (小時)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg outline-none bg-slate-50 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {/* [修正] 整天按鈕移除閃電圖示 */}
                    <button
                      type="button"
                      onClick={handleFullDay}
                      className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-200 text-sm h-[42px] whitespace-nowrap flex items-center gap-1 font-medium border border-slate-200 transition-colors"
                    >
                      整天
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      事由
                    </label>
                    <select
                      value={reasonSelect}
                      onChange={(e) => setReasonSelect(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none mb-2 focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {category === "leave"
                        ? LEAVE_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))
                        : OVERTIME_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                    </select>
                    {reasonSelect === "其他 (自填)" && (
                      <input
                        type="text"
                        required
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="請輸入事由..."
                        className="w-full p-2 border border-slate-300 rounded-lg outline-none animate-in fade-in slide-in-from-top-2 focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full text-white py-3 rounded-lg flex justify-center items-center gap-2 font-bold shadow-md transition-all active:scale-95 ${
                      category === "leave"
                        ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                        : "bg-teal-600 hover:bg-teal-700 shadow-teal-200"
                    }`}
                  >
                    {loading ? (
                      <RefreshCw className="animate-spin w-5 h-5" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}{" "}
                    送出申請
                  </button>
                </form>
              </div>
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[600px]">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-lg text-slate-800">我的紀錄</h2>
                  {!useDemo && (
                    <button
                      onClick={() => fetchData()}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="p-3 rounded-tl-lg">狀態</th>
                        <th className="p-3">類別</th>
                        <th className="p-3">內容</th>
                        <th className="p-3 text-right rounded-tr-lg">日期</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records
                        .filter(
                          (r) =>
                            r.userId === currentUser.id &&
                            r.category !== "roster"
                        )
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-0"
                          >
                            <td className="p-3">
                              <span
                                className={`text-[10px] px-2 py-1 rounded-full border font-medium ${
                                  r.status === "approved"
                                    ? "bg-green-50 text-green-600 border-green-200"
                                    : r.status === "rejected"
                                    ? "bg-red-50 text-red-600 border-red-200"
                                    : "bg-yellow-50 text-yellow-600 border-yellow-200"
                                }`}
                              >
                                {r.status === "approved"
                                  ? "已核准"
                                  : r.status === "rejected"
                                  ? "已駁回"
                                  : "審核中"}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`font-medium ${
                                  r.category === "overtime" ||
                                  r.category === "adjustment"
                                    ? "text-teal-600"
                                    : r.category === "settlement"
                                    ? "text-purple-600"
                                    : "text-red-500"
                                }`}
                              >
                                {r.category === "overtime"
                                  ? "+ 加班"
                                  : r.category === "adjustment"
                                  ? "+ 調整/遞延"
                                  : r.category === "settlement"
                                  ? "- 結算"
                                  : "- 請假"}
                              </span>
                              <br />
                              <span className="text-[10px] text-slate-400">
                                {r.type === "annual" ? "(扣特休)" : "(補休)"}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-700">
                                {Math.abs(r.amount)} 小時
                              </div>
                              {r.startTime && r.endTime && (
                                <div className="text-xs text-slate-500">
                                  {r.startTime}~{r.endTime}
                                </div>
                              )}
                              <div className="text-xs text-slate-500">
                                {r.reason}
                              </div>
                            </td>
                            <td className="p-3 text-right text-slate-500 font-mono">
                              {r.date}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Wrap the main app with ErrorBoundary for the final export
export default function App() {
  return (
    <ErrorBoundary>
      <LeaveAndOvertimeApp />
    </ErrorBoundary>
  );
}
