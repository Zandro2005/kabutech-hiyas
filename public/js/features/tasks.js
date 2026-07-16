function renderTasks() {
    const container = document.getElementById('tasks-container');
    container.innerHTML = '';

    if (state.tasks.length === 0) {
        container.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-6 gap-2 text-slate-400 dark:text-zinc-500">
                        <span class="material-symbols-outlined text-[36px]">task_alt</span>
                        <p class="text-[14px] font-semibold">No tasks assigned today.</p>
                    </div>`;
        return;
    }

    state.tasks.forEach(task => {
        let statusIcon = "radio_button_unchecked";
        let statusColor = "text-slate-300 dark:text-zinc-600 hover:text-primary";
        let cardAccent = "border-slate-100 dark:border-zinc-800";
        let titleClass = "text-[15px] font-semibold text-on-surface dark:text-white";

        if (task.status === 'In Progress') {
            statusIcon = "pending";
            statusColor = "text-warning-gold";
            cardAccent = "border-l-2 border-l-warning-gold border-t border-r border-b border-slate-100 dark:border-zinc-800";
            titleClass = "text-[15px] font-semibold text-on-surface dark:text-white";
        } else if (task.status === 'Completed') {
            statusIcon = "check_circle";
            statusColor = "text-success-green dark:text-emerald-500";
            cardAccent = "border-slate-100 dark:border-zinc-800 opacity-60";
            titleClass = "text-[15px] font-medium line-through text-slate-400 dark:text-zinc-500";
        }

        let priorityPill = "";
        if (task.priority === 'High') {
            priorityPill = `<span class="text-[11px] font-extrabold uppercase tracking-wide bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 px-2 py-0.5 rounded-full">High</span>`;
        } else if (task.priority === 'Normal') {
            priorityPill = `<span class="text-[11px] font-extrabold uppercase tracking-wide bg-surface-variant text-on-surface-variant dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 rounded-full">Normal</span>`;
        } else if (task.priority === 'Low') {
            priorityPill = `<span class="text-[11px] font-extrabold uppercase tracking-wide bg-surface-variant text-on-surface-variant dark:bg-zinc-800 dark:text-zinc-400 px-2 py-0.5 rounded-full">Low</span>`;
        }

        const isAdmin = state.currentUser && state.currentUser.role === 'admin';

        const item = document.createElement('div');
        item.className = `flex items-center gap-3 p-4 rounded-2xl border bg-white dark:bg-zinc-900 ${cardAccent} transition-all`;
        item.innerHTML = `
                    <button onclick="cycleTaskStatus(${task.id})" class="shrink-0 transition-colors ${statusColor}" title="Cycle status">
                        <span class="material-symbols-outlined text-[26px]" style="font-variation-settings:'FILL' 1">${statusIcon}</span>
                    </button>
                    <div class="flex-1 min-w-0">
                        <p class="${titleClass} truncate">${task.title}</p>
                        <div class="flex items-center gap-1.5 mt-1">
                            <span class="text-[12px] text-slate-400 dark:text-zinc-500 font-medium">${task.assignee}</span>
                            <span class="text-slate-300 dark:text-zinc-700">•</span>
                            ${priorityPill}
                        </div>
                    </div>
                    ${isAdmin ? `<button onclick="deleteTask(${task.id})" class="shrink-0 text-slate-200 dark:text-zinc-700 hover:text-error-red dark:hover:text-red-400 transition-colors p-1 rounded-full"><span class="material-symbols-outlined text-[20px]">delete</span></button>` : ''}
                `;
        container.appendChild(item);
    });
}

function cycleTaskStatus(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    if (task.status === 'Pending') {
        task.status = 'In Progress';
        showToast(`Task status: In Progress (${task.assignee})`, 'info');
        addLog(`Task "${task.title}" status updated to IN PROGRESS.`, 'info');
    } else if (task.status === 'In Progress') {
        task.status = 'Completed';
        showToast(`Task completed! Well done.`, 'success');
        addLog(`Task "${task.title}" completed by ${task.assignee}.`, 'success');
    } else {
        task.status = 'Pending';
        addLog(`Task "${task.title}" reverted to PENDING.`, 'warning');
    }
    saveTasks();
    renderTasks();
}

function deleteTask(id) {
    const isAdmin = state.currentUser && state.currentUser.role === 'admin';
    if (!isAdmin) {
        showToast('Only admins can delete tasks.', 'warning');
        return;
    }
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    showToast('Task removed from board.', 'info');
}

function openAddTaskModal() {
    document.getElementById('modal-add-task').classList.remove('hidden');
}

function closeAddTaskModal() {
    document.getElementById('modal-add-task').classList.add('hidden');
}

function submitAddTask(e) {
    e.preventDefault();
    const title = document.getElementById('task-title').value;
    const assignee = document.getElementById('task-assignee').value;
    const priority = document.getElementById('task-priority').value;
    const due = document.getElementById('task-due').value;
    const desc = document.getElementById('task-desc').value;

    const newTask = { id: Date.now(), title, assignee, priority, status: 'Pending', due: due || null, desc: desc || null };
    state.tasks.unshift(newTask);
    saveTasks();
    renderTasks();
    closeAddTaskModal();
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-due').value = '';
    addLog(`Assigned task: "${title}" to ${assignee}.`, 'success');
    showToast(`Task successfully assigned.`, 'success');
}

// --- TASK FILTER ---
let currentTaskFilter = 'all';
function filterTasks(filter) {
    currentTaskFilter = filter;
    const map = { all: 'task-filter-all', Pending: 'task-filter-pending', 'In Progress': 'task-filter-inprogress', Completed: 'task-filter-completed' };
    Object.values(map).forEach(id => {
        const b = document.getElementById(id);
        if (b) { b.className = 'flex-1 text-[10px] font-bold py-1 rounded-lg text-on-surface-variant dark:text-zinc-400 transition-all'; }
    });
    const active = document.getElementById(map[filter]);
    if (active) active.className = 'flex-1 text-[10px] font-bold py-1 rounded-lg bg-white dark:bg-zinc-700 text-primary dark:text-primary-fixed shadow-sm transition-all';
    renderTasks();
}

// Wrap renderTasks to support filter
const _baseRenderTasks = renderTasks;
renderTasks = function () {
    const container = document.getElementById('tasks-container');
    container.innerHTML = '';
    let tasks = currentTaskFilter === 'all' ? state.tasks : state.tasks.filter(t => t.status === currentTaskFilter);
    if (tasks.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-6 gap-2 text-slate-400 dark:text-zinc-500"><span class="material-symbols-outlined text-[36px]">task_alt</span><p class="text-[14px] font-semibold">No tasks here.</p></div>`;
        return;
    }
    const isAdmin = state.currentUser && state.currentUser.role === 'admin';
    tasks.forEach(task => {
        let statusIcon = "radio_button_unchecked", statusColor = "text-slate-300 dark:text-zinc-600 hover:text-primary", cardAccent = "border-slate-100 dark:border-zinc-800", titleClass = "text-[15px] font-semibold text-on-surface dark:text-white";
        if (task.status === 'In Progress') { statusIcon = "pending"; statusColor = "text-warning-gold"; cardAccent = "border-l-2 border-l-warning-gold border-t border-r border-b border-slate-100 dark:border-zinc-800"; }
        else if (task.status === 'Completed') { statusIcon = "check_circle"; statusColor = "text-success-green dark:text-emerald-500"; cardAccent = "border-slate-100 dark:border-zinc-800 opacity-60"; titleClass = "text-[15px] font-medium line-through text-slate-400 dark:text-zinc-500"; }
        const priority = task.priority || 'Normal';
        const pillColors = { High: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400', Normal: 'bg-surface-variant text-on-surface-variant dark:bg-zinc-800 dark:text-zinc-400', Low: 'bg-surface-variant text-on-surface-variant dark:bg-zinc-800 dark:text-zinc-400' };
        const priorityPill = `<span class="text-[11px] font-extrabold uppercase tracking-wide ${pillColors[priority] || pillColors.Normal} px-2 py-0.5 rounded-full">${priority}</span>`;
        const dueBadge = task.due ? `<span class="text-slate-300 dark:text-zinc-700">•</span><span class="text-[12px] text-on-surface-variant dark:text-zinc-500 font-medium">Due ${task.due}</span>` : '';
        const item = document.createElement('div');
        item.className = `flex items-center gap-3 p-4 rounded-2xl border bg-white dark:bg-zinc-900 ${cardAccent} transition-all`;
        item.innerHTML = `
                    <button onclick="cycleTaskStatus(${task.id})" class="shrink-0 transition-colors ${statusColor}"><span class="material-symbols-outlined text-[26px]" style="font-variation-settings:'FILL' 1">${statusIcon}</span></button>
                    <div class="flex-1 min-w-0">
                        <p class="${titleClass} truncate">${task.title}</p>
                        ${task.desc ? `<p class="text-[13px] text-on-surface-variant dark:text-zinc-500 mt-0.5 line-clamp-1">${task.desc}</p>` : ''}
                        <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span class="text-[12px] text-slate-400 dark:text-zinc-500 font-medium">${task.assignee}</span>
                            <span class="text-slate-300 dark:text-zinc-700">•</span>
                            ${priorityPill}${dueBadge}
                        </div>
                    </div>
                    ${isAdmin ? `<button onclick="deleteTask(${task.id})" class="shrink-0 text-slate-200 dark:text-zinc-700 hover:text-error-red dark:hover:text-red-400 transition-colors p-1 rounded-full"><span class="material-symbols-outlined text-[20px]">delete</span></button>` : ''}
                `;
        container.appendChild(item);
    });
};

