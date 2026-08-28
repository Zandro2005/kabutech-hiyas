// --- 1. CORE APPLICATION STATE ---
let state = {
    currentUser: null,  // { email, role }
    currentTab: 'home',
    isPhoneFrame: true,
    theme: 'light', // light or dark

    // Environment States
    tempSetpoint: 23.5,
    humiditySetpoint: 75.0,
    lightSetpoint: 500,
    co2Setpoint: 600,
    systemMode: 'auto', // auto or manual

    currentTemp: 18.0,
    currentHumidity: 55.0,
    currentCO2: 400,
    currentLight: 300,

    deviceStates: {
        fans: true,
        misters: false,
        lights: false
    },
    deviceUptimeStart: { fans: Date.now(), misters: null, lights: null },

    // Alerts
    alerts: [],
    staffReports: [], // { id, severity, title, desc, time, acknowledged: bool }
    activeBannerAlert: null,

    // Simulation flags
    anomalies: {
        co2Spike: false,
        misterJammed: false,
        overheat: false
    },

    // Grow Batches
    growBatches: [], // { id, rack, slots, substrate, setupDate, bags: [{id,status,harvestLog:[{date,grams}]}] }

    // Tasks
    tasks: [], // { id, title, assignee, priority, status }

    // Logs
    eventLogs: [], // { timestamp, msg, type: info/success/warning/error }

    // Yield Target (admin-configurable)
    yieldTarget: 2.20 // kg
};

// Static initial databases if localStorage is empty
function makeBags(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        status: 'Empty', // Active | Replaced | Contaminated | Empty
        harvestLog: []
    }));
}
const defaultBatches = [
    { id: 400, rack: 'Rack A', slots: 20, substrate: 'Sawdust + Bran', setupDate: '2026-05-10', bags: makeBags(20) },
    { id: 401, rack: 'Rack B', slots: 15, substrate: 'Straw Mix', setupDate: '2026-05-18', bags: makeBags(15) },
    { id: 402, rack: 'Rack C', slots: 12, substrate: 'Sawdust + Bran', setupDate: '2026-06-01', bags: makeBags(12) }
];

const defaultTasks = [
    { id: 1, title: 'Inoculate Batch #403 (White Button)', assignee: 'Sarah', priority: 'High', status: 'Pending' },
    { id: 2, title: 'Check Sector B grow bags for mold', assignee: 'Jojo', priority: 'Normal', status: 'In Progress' },
    { id: 3, title: 'Harvest ready fruiting bodies in Sector A', assignee: 'Renz', priority: 'High', status: 'Completed' }
];

const defaultLogs = [
    { timestamp: new Date(Date.now() - 3600000 * 3).toLocaleTimeString(), msg: 'Environmental auto-mode active.', type: 'success' },
    { timestamp: new Date(Date.now() - 3600000 * 2).toLocaleTimeString(), msg: 'Batch #402 transitioned to Spawn Run.', type: 'info' },
    { timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(), msg: 'System check complete. All sensors healthy.', type: 'info' }
];

// --- 3. LOCALSTORAGE STATE LOGIC ---
function loadStateFromStorage() {
    // Wait for Firebase to load data. No default placeholders.
    // Scheduled configuration (default config until Firebase loads)
    loadScheduleConfig();

    // Render views
    renderBatches();
    renderTasks();
    renderLogs();
    renderAlertsList();
    renderStaffReports();
    syncControlsUI();
    renderActivityFeed();
    updateEnvironmentOverview();
}

function saveBatches() { if(window.fbDB) fbDB.ref('kabutech/batches').set(state.growBatches); }
function saveTasks() { if(window.fbDB) fbDB.ref('kabutech/tasks').set(state.tasks); }
function saveLogs() { if(window.fbDB) fbDB.ref('kabutech/logs').set(state.eventLogs); }
function saveAlerts() { if(window.fbDB) fbDB.ref('kabutech/alerts').set(state.alerts); }
function saveStaffReports() { if(window.fbDB) fbDB.ref('kabutech/staffReports').set(state.staffReports); }
function saveYieldTarget() { if(window.fbDB) fbDB.ref('kabutech/settings/yieldTarget').set(state.yieldTarget); }

function saveSetpoints() {
    if(window.fbDB) fbDB.ref('kabutech/settings/setpoints').set({
        temperature: state.tempSetpoint,
        humidity: state.humiditySetpoint,
        light: state.lightSetpoint,
        co2: state.co2Setpoint,
        mode: state.systemMode,
        devices: state.deviceStates
    });
}

function addLog(msg, type = 'info') {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    state.eventLogs.unshift({ timestamp: time, msg, type });
    if (state.eventLogs.length > 100) state.eventLogs.pop(); // keep last 100
    saveLogs();
    renderActivityFeed();
    // Only re-render if the logs container is currently visible (user already loaded them)
    const container = document.getElementById('logs-container');
    if (container && !container.classList.contains('hidden')) {
        renderLogs();
    }
}

