// --- 14. OPERATIONAL ISSUE REPORT SYSTEM ---
function openReportModal() {
    document.getElementById('modal-report-issue').classList.remove('hidden');
}

function closeReportModal() {
    document.getElementById('modal-report-issue').classList.add('hidden');
}

// Role-based navigation restriction for Staff users

function confirmDeleteReport(id) {
    showConfirm({
        title: 'Delete Report?',
        body: 'This resolved report will be permanently removed from the inbox. This cannot be undone.',
        icon: 'delete_forever',
        iconBg: 'bg-red-100 dark:bg-red-950/40',
        iconColor: 'text-error-red',
        okLabel: 'Delete',
        okIcon: 'delete',
        okBg: 'bg-error-red hover:bg-red-700',
        onConfirm: () => {
            state.staffReports = state.staffReports.filter(r => r.id !== id);
            saveStaffReports();
            renderStaffReports();
            showToast('Report deleted.', 'info');
        }
    });
}

function dismissAdminNote(id) {
    const r = state.staffReports.find(r => r.id === id);
    if (r) { r.noteRead = true; saveStaffReports(); renderStaffReports(); }
}

function markReportRead(id) {
    const r = state.staffReports.find(r => r.id === id);
    if (r) { r.read = true; saveStaffReports(); renderStaffReports(); }
}

function updateReportStatus(id, status) {
    const r = state.staffReports.find(r => r.id === id);
    if (!r) return;
    r.status = status;
    r.read = true;
    saveStaffReports();
    renderStaffReports();
    showToast(`Report marked as "${status}".`, 'success');
}

let _adminNoteReportId = null;
function promptAdminNote(id) {
    const r = state.staffReports.find(r => r.id === id);
    if (!r) return;
    _adminNoteReportId = id;
    document.getElementById('admin-note-input').value = r.adminNote || '';
    positionModalOverApp('modal-admin-note');
}

function closeAdminNoteModal() {
    document.getElementById('modal-admin-note').style.display = 'none';
    _adminNoteReportId = null;
}

function saveAdminNote() {
    const r = state.staffReports.find(r => r.id === _adminNoteReportId);
    if (!r) { closeAdminNoteModal(); return; }
    r.adminNote = document.getElementById('admin-note-input').value.trim();
    r.read = true;
    r.noteRead = false;
    saveStaffReports();
    renderStaffReports();
    closeAdminNoteModal();
    showToast('Admin note saved.', 'success');
}

function submitIssueReport(e) {
    e.preventDefault();
    const title = document.getElementById('report-title').value;
    const category = document.getElementById('report-category').value;
    const severity = document.getElementById('report-severity').value;
    const sector = document.getElementById('report-sector').value;
    const bag = document.getElementById('report-bag').value;
    const desc = document.getElementById('report-desc').value;
    const reporter = state.currentUser ? state.currentUser.name || state.currentUser.username || state.currentUser.role : 'Staff';
    const now = new Date();
    const timestamp = now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const report = { id: Date.now(), title, category, severity, sector, bag: bag || null, desc, reporter, timestamp, read: false, status: 'Open', adminNote: '' };
    state.staffReports.unshift(report);
    saveStaffReports();
    renderStaffReports();
    updateShiftSummary();

    addLog(`[STAFF REPORT] ${title} by ${reporter} (${category} | ${severity} | ${sector}): ${desc}`, severity === 'Critical' || severity === 'High' ? 'error' : 'warning');
    closeReportModal();
    showToast('Report sent to Administrator inbox.', 'success');
    document.getElementById('report-title').value = '';
    document.getElementById('report-bag').value = '';
    document.getElementById('report-desc').value = '';
}
