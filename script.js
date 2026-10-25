/**
 * ==========================================================================
 * CENTRAL GAME STATION - PORTAL ENGINE
 * Features: Real-time Cloud Database Sync, Auto-refresh Polling,
 *           Excel (.xlsx) & CSV Exports, 17-Goal Detail Inspector Modal,
 *           Single Entry Deletion, Bulk Clear, and KPI Analytics.
 * ==========================================================================
 */

// Storage keys & default configuration
const CONFIG_KEY = "sdg_central_station_db_url";
const LOCAL_STORAGE_KEY = "sdg_central_game_station_records";

// Default Cloud Database URL (Matches Website 1)
const DEFAULT_FIREBASE_URL = "https://sdg-tracker-56e77-default-rtdb.asia-southeast1.firebasedatabase.app";

// DOM Elements
const tableBody = document.getElementById("records-table-body");
const emptyState = document.getElementById("table-empty-state");
const searchInput = document.getElementById("station-search-input");
const classFilter = document.getElementById("station-class-filter");
const sortFilter = document.getElementById("station-sort-filter");
const btnRefresh = document.getElementById("btn-refresh");
const btnClearAll = document.getElementById("btn-clear-all");
const btnExportExcel = document.getElementById("btn-export-excel");
const btnExportCsv = document.getElementById("btn-export-csv");
const btnConfigDb = document.getElementById("btn-config-db");
const btnQuickConfig = document.getElementById("btn-quick-config");

// KPI Elements
const kpiTotal = document.getElementById("kpi-total-participants");
const kpiAvgScore = document.getElementById("kpi-avg-score");
const kpiAvgAccuracy = document.getElementById("kpi-avg-accuracy");
const kpiTopScorers = document.getElementById("kpi-top-scorers");
const kpiAvgTime = document.getElementById("kpi-avg-time");

// DB Status Bar
const dbStatusIndicator = document.getElementById("db-status-indicator");
const dbStatusText = document.getElementById("db-status-text");

// View Details Modal Elements
const viewModal = document.getElementById("view-details-modal");
const btnCloseDetails = document.getElementById("btn-close-details");
const detailStudentName = document.getElementById("detail-student-name");
const detailStudentRoll = document.getElementById("detail-student-roll");
const detailStudentClass = document.getElementById("detail-student-class");
const detailStudentSection = document.getElementById("detail-student-section");
const detailStudentDate = document.getElementById("detail-student-date");
const detailScore = document.getElementById("detail-score");
const detailAccuracy = document.getElementById("detail-accuracy");
const detailTime = document.getElementById("detail-time");
const detailGoalsBreakdown = document.getElementById("detail-goals-breakdown");

// Config Modal Elements
const configModal = document.getElementById("config-db-modal");
const btnCloseConfig = document.getElementById("btn-close-config");
const inputDbUrl = document.getElementById("input-db-url");
const btnSaveDbConfig = document.getElementById("btn-save-db-config");
const toastNotice = document.getElementById("toast-notice");

// In-memory records
let cachedRecords = [];

// Get active Firebase URL
function getDbUrl() {
    const custom = localStorage.getItem(CONFIG_KEY);
    return custom ? custom.trim().replace(/\/$/, "") : DEFAULT_FIREBASE_URL;
}

// Fetch all participants (Cloud DB with localStorage fallback)
async function fetchRecords(isAutoPoll = false) {
    const dbUrl = getDbUrl();
    let cloudSuccess = false;

    if (!dbUrl) {
        dbStatusIndicator.className = "status-indicator";
        dbStatusText.innerHTML = "⚠️ <strong>Cloud Database not connected yet:</strong> Click <a href='javascript:void(0)' onclick='openDbConfig()' style='color:var(--text-accent); text-decoration:underline;'>here</a> to paste your free Firebase Database URL.";
    } else {
        try {
            const resp = await fetch(`${dbUrl}/participants.json`, { cache: "no-store" });
            if (resp.ok) {
                const data = await resp.json();
                cloudSuccess = true;

                // Firebase returns an object of objects with unique keys
                if (data && typeof data === "object") {
                    cachedRecords = Object.entries(data).map(([firebaseKey, item]) => ({
                        ...item,
                        _firebaseKey: firebaseKey
                    }));
                } else {
                    cachedRecords = [];
                }

                // Update connection status
                dbStatusIndicator.className = "status-indicator connected";
                dbStatusText.textContent = `🟢 Connected to Cloud Database (${cachedRecords.length} records synced)`;
            } else {
                throw new Error("HTTP " + resp.status);
            }
        } catch (err) {
            console.warn("Cloud DB fetch notice:", err);
            dbStatusIndicator.className = "status-indicator error";
            dbStatusText.innerHTML = "❌ <strong>Database connection error:</strong> Please check your Firebase Database URL or permissions. Click <a href='javascript:void(0)' onclick='openDbConfig()' style='color:var(--text-accent); text-decoration:underline;'>Settings</a>.";
        }
    }

    // Fallback to local storage if cloud is unreachable or empty
    if (!cloudSuccess) {
        try {
            const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
            cachedRecords = raw ? JSON.parse(raw) : [];
        } catch (e) {
            cachedRecords = [];
        }
    }

    populateClassDropdown();
    renderDashboard();

    if (!isAutoPoll) {
        showToast("🔄 Records refreshed.");
    }
}

// Save records back to storage
function populateClassDropdown() {
    const currentSelected = classFilter.value;
    const uniqueClasses = new Set();
    cachedRecords.forEach(r => {
        if (r.className && r.className !== "-") uniqueClasses.add(r.className);
    });

    classFilter.innerHTML = '<option value="ALL">All Classes & Grades</option>';
    uniqueClasses.forEach(cls => {
        const opt = document.createElement("option");
        opt.value = cls;
        opt.textContent = "Class: " + cls;
        classFilter.appendChild(opt);
    });

    if (uniqueClasses.has(currentSelected)) {
        classFilter.value = currentSelected;
    } else {
        classFilter.value = "ALL";
    }
}

// Render KPI statistics & table
function renderDashboard() {
    const total = cachedRecords.length;
    kpiTotal.textContent = total;

    if (total === 0) {
        kpiAvgScore.innerHTML = `0 <span style="font-size: 1rem; color: var(--text-muted);">/ 34</span>`;
        kpiAvgAccuracy.textContent = "0% avg accuracy";
        kpiTopScorers.textContent = "0";
        kpiAvgTime.textContent = "00:00";
    } else {
        const sumScore = cachedRecords.reduce((acc, r) => acc + (Number(r.score) || 0), 0);
        const avgScore = (sumScore / total).toFixed(1);
        const sumAccuracy = cachedRecords.reduce((acc, r) => acc + (Number(r.accuracy) || 0), 0);
        const avgAccuracy = Math.round(sumAccuracy / total);
        const champions = cachedRecords.filter(r => Number(r.score) === 34).length;
        const sumSeconds = cachedRecords.reduce((acc, r) => acc + (Number(r.timeSeconds) || 0), 0);
        const avgSecs = Math.round(sumSeconds / total);

        kpiAvgScore.innerHTML = `${avgScore} <span style="font-size: 1rem; color: var(--text-muted);">/ 34</span>`;
        kpiAvgAccuracy.textContent = `${avgAccuracy}% avg accuracy`;
        kpiTopScorers.textContent = champions;
        kpiAvgTime.textContent = formatSeconds(avgSecs);
    }

    // Filter & Sort
    let filtered = [...cachedRecords];

    const searchVal = searchInput.value.trim().toLowerCase();
    if (searchVal) {
        filtered = filtered.filter(r => 
            (r.name && r.name.toLowerCase().includes(searchVal)) ||
            (r.rollNumber && r.rollNumber.toLowerCase().includes(searchVal)) ||
            (r.className && r.className.toLowerCase().includes(searchVal)) ||
            (r.section && r.section.toLowerCase().includes(searchVal))
        );
    }

    const classVal = classFilter.value;
    if (classVal !== "ALL") {
        filtered = filtered.filter(r => r.className === classVal);
    }

    const sortVal = sortFilter.value;
    if (sortVal === "SCORE_HIGH") {
        filtered.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    } else if (sortVal === "SCORE_LOW") {
        filtered.sort((a, b) => (Number(a.score) || 0) - (Number(b.score) || 0));
    } else if (sortVal === "NAME_AZ") {
        filtered.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortVal === "TIME_FAST") {
        filtered.sort((a, b) => (Number(a.timeSeconds) || 999999) - (Number(b.timeSeconds) || 999999));
    } else {
        filtered.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    }

    // Render Table Rows
    tableBody.innerHTML = "";
    if (filtered.length === 0) {
        emptyState.style.display = "block";
    } else {
        emptyState.style.display = "none";
        filtered.forEach((r, idx) => {
            const tr = document.createElement("tr");

            let scoreClass = "low";
            const scoreNum = Number(r.score) || 0;
            if (scoreNum === 34) scoreClass = "champion";
            else if (scoreNum >= 26) scoreClass = "high";
            else if (scoreNum >= 18) scoreClass = "mid";

            tr.innerHTML = `
                <td style="color: var(--text-muted); font-weight: 700;">${idx + 1}</td>
                <td><strong>${escapeHtml(r.rollNumber || "-")}</strong></td>
                <td class="student-name-cell">${escapeHtml(r.name || "Anonymous")}</td>
                <td><span class="class-badge">${escapeHtml(r.className || "-")}</span></td>
                <td><span class="class-badge">${escapeHtml(r.section || "-")}</span></td>
                <td>
                    <span class="score-pill ${scoreClass}">
                        ${scoreNum} / 34
                    </span>
                </td>
                <td><strong>${r.accuracy || 0}%</strong></td>
                <td>${escapeHtml(r.timeTaken || "-")}</td>
                <td style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(r.date || "")} ${escapeHtml(r.time || "")}</td>
                <td style="text-align: center;">
                    <div class="row-actions">
                        <button class="action-icon-btn btn-view" title="View Full 17-Goal Details" data-id="${r.id}">
                            👁️
                        </button>
                        <button class="action-icon-btn btn-del" title="Delete Entry" data-id="${r.id}" data-fkey="${r._firebaseKey || ''}">
                            🗑️
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    }
}

// Format seconds into MM:SS
function formatSeconds(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// HTML safety helper
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Open View Details Modal
function openDetails(recordId) {
    const rec = cachedRecords.find(r => r.id === recordId);
    if (!rec) return;

    detailStudentName.textContent = rec.name || "Student";
    detailStudentRoll.textContent = rec.rollNumber || "-";
    detailStudentClass.textContent = rec.className || "-";
    detailStudentSection.textContent = rec.section || "-";
    detailStudentDate.textContent = `${rec.date || ""} ${rec.time || ""}`;
    detailScore.textContent = `${rec.score} / 34 Marks`;
    detailAccuracy.textContent = `${rec.accuracy}%`;
    detailTime.textContent = rec.timeTaken || "00:00";

    detailGoalsBreakdown.innerHTML = "";
    const detailsList = rec.details || [];

    if (detailsList.length === 0) {
        detailGoalsBreakdown.innerHTML = "<p style='color: var(--text-muted);'>No detailed goal breakdown recorded for this entry.</p>";
    } else {
        detailsList.forEach(item => {
            const slotDiv = document.createElement("div");
            slotDiv.className = `detail-slot-item ${item.isCorrect ? "correct" : "wrong"}`;

            slotDiv.innerHTML = `
                <div class="slot-badge-bar">
                    <span class="slot-pill-num">Slot #${item.slotNumber}</span>
                    <span class="slot-pill-status">${item.isCorrect ? "✅ +2 Marks" : "❌ 0 Marks"}</span>
                </div>
                <div class="detail-slot-title">
                    <span>${escapeHtml(item.placedEmoji || "🎯")}</span>
                    <span>${escapeHtml(item.placedGoalTitle || "Empty")}</span>
                </div>
                <div class="detail-expected">
                    Expected: <strong>Goal ${item.expectedGoalId}. ${escapeHtml(item.expectedGoalTitle || "")}</strong>
                </div>
            `;
            detailGoalsBreakdown.appendChild(slotDiv);
        });
    }

    viewModal.classList.add("is-visible");
    viewModal.setAttribute("aria-hidden", "false");
}

// Close details modal
btnCloseDetails.addEventListener("click", () => {
    viewModal.classList.remove("is-visible");
    viewModal.setAttribute("aria-hidden", "true");
});

viewModal.addEventListener("click", (e) => {
    if (e.target === viewModal) {
        viewModal.classList.remove("is-visible");
        viewModal.setAttribute("aria-hidden", "true");
    }
});

// Delete single entry (from Cloud DB and Local cache)
async function deleteEntry(recordId, firebaseKey) {
    const rec = cachedRecords.find(r => r.id === recordId);
    const studentName = rec ? rec.name : "this student";

    if (!confirm(`Are you sure you want to delete the entry for "${studentName}"?`)) {
        return;
    }

    const dbUrl = getDbUrl();
    if (firebaseKey && dbUrl) {
        try {
            await fetch(`${dbUrl}/participants/${firebaseKey}.json`, { method: "DELETE" });
        } catch (e) {
            console.error("Cloud delete error:", e);
        }
    }

    // Also remove from local storage
    try {
        const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
        const updatedLocal = local.filter(r => r.id !== recordId);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLocal));
    } catch (e) {}

    cachedRecords = cachedRecords.filter(r => r.id !== recordId);
    renderDashboard();
    showToast("🗑️ Entry deleted successfully.");
}

// Clear all entries
btnClearAll.addEventListener("click", async () => {
    if (cachedRecords.length === 0) {
        alert("No records to clear.");
        return;
    }

    if (!confirm(`CAUTION: Are you sure you want to clear all ${cachedRecords.length} student entries? This cannot be undone.`)) {
        return;
    }

    const dbUrl = getDbUrl();
    if (dbUrl) {
        try {
            await fetch(`${dbUrl}/participants.json`, { method: "DELETE" });
        } catch (e) {
            console.error("Cloud bulk clear error:", e);
        }
    }

    localStorage.removeItem(LOCAL_STORAGE_KEY);
    cachedRecords = [];
    renderDashboard();
    showToast("🧹 All participant records have been cleared.");
});

// Table Action Delegation
tableBody.addEventListener("click", (e) => {
    const viewBtn = e.target.closest(".btn-view");
    if (viewBtn) {
        const id = viewBtn.getAttribute("data-id");
        openDetails(id);
        return;
    }

    const delBtn = e.target.closest(".btn-del");
    if (delBtn) {
        const id = delBtn.getAttribute("data-id");
        const fkey = delBtn.getAttribute("data-fkey");
        deleteEntry(id, fkey);
        return;
    }
});

// Export to Microsoft Excel (.xlsx) using SheetJS
btnExportExcel.addEventListener("click", () => {
    if (cachedRecords.length === 0) {
        alert("No participant records available to export!");
        return;
    }

    try {
        const excelData = cachedRecords.map((r, idx) => ({
            "S.No": idx + 1,
            "Roll Number": r.rollNumber || "-",
            "Student Name": r.name || "Anonymous",
            "Class": r.className || "-",
            "Section": r.section || "-",
            "Marks Scored": r.score,
            "Max Marks": 34,
            "Accuracy Rate": (r.accuracy || 0) + "%",
            "Time Taken": r.timeTaken || "-",
            "Date": r.date || "-",
            "Time": r.time || "-"
        }));

        if (typeof XLSX !== "undefined") {
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            worksheet["!cols"] = [
                { wch: 6 },
                { wch: 15 },
                { wch: 25 },
                { wch: 12 },
                { wch: 10 },
                { wch: 14 },
                { wch: 12 },
                { wch: 15 },
                { wch: 14 },
                { wch: 14 },
                { wch: 14 }
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "SDG Results");

            const fileName = `SDG_Challenge_Results_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            showToast("📥 Excel sheet downloaded successfully!");
        } else {
            downloadCsvFallback();
        }
    } catch (err) {
        console.error("Excel generation error:", err);
        downloadCsvFallback();
    }
});

// Export to CSV
btnExportCsv.addEventListener("click", () => {
    if (cachedRecords.length === 0) {
        alert("No participant records available to export!");
        return;
    }
    downloadCsvFallback();
});

// CSV Generator
function downloadCsvFallback() {
    const headers = ["S.No", "Roll Number", "Student Name", "Class", "Section", "Marks Scored", "Max Marks", "Accuracy", "Time Taken", "Date", "Time"];
    const rows = cachedRecords.map((r, idx) => [
        idx + 1,
        `"${(r.rollNumber || "").replace(/"/g, '""')}"`,
        `"${(r.name || "").replace(/"/g, '""')}"`,
        `"${(r.className || "").replace(/"/g, '""')}"`,
        `"${(r.section || "").replace(/"/g, '""')}"`,
        r.score,
        34,
        `"${r.accuracy || 0}%"`,
        `"${r.timeTaken || ""}"`,
        `"${r.date || ""}"`,
        `"${r.time || ""}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SDG_Challenge_Results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("📄 CSV report downloaded successfully!");
}

// Cloud DB Config Modal
function openDbConfig() {
    inputDbUrl.value = getDbUrl();
    configModal.classList.add("is-visible");
    configModal.setAttribute("aria-hidden", "false");
}

function closeDbConfig() {
    configModal.classList.remove("is-visible");
    configModal.setAttribute("aria-hidden", "true");
}

btnConfigDb.addEventListener("click", openDbConfig);
btnQuickConfig.addEventListener("click", openDbConfig);
btnCloseConfig.addEventListener("click", closeDbConfig);

btnSaveDbConfig.addEventListener("click", () => {
    const val = inputDbUrl.value.trim().replace(/\/$/, "");
    if (val) {
        localStorage.setItem(CONFIG_KEY, val);
        showToast("💾 Database URL saved!");
        closeDbConfig();
        fetchRecords();
    } else {
        alert("Please enter a valid Firebase Realtime Database URL.");
    }
});

// Show Toast
function showToast(msg) {
    toastNotice.textContent = msg;
    toastNotice.classList.add("show");
    setTimeout(() => {
        toastNotice.classList.remove("show");
    }, 3200);
}

// Search, Filter & Refresh events
searchInput.addEventListener("input", renderDashboard);
classFilter.addEventListener("change", renderDashboard);
sortFilter.addEventListener("change", renderDashboard);
btnRefresh.addEventListener("click", () => fetchRecords(false));

// Auto-poll for new submissions every 10 seconds
setInterval(() => {
    fetchRecords(true);
}, 10000);

// Initialize on Load
window.addEventListener("DOMContentLoaded", () => {
    fetchRecords(false);
});
