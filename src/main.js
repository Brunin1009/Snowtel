/* Storage Logic */
const KEYS = {
    DAYS: 'snowtel_days',
    MASTER_LIST: 'snowtel_master_list'
};

const INITIAL_ITEMS = [
    'Flat Sheets King', 'Flat Sheets Queen', 'Pillow Cases King', 'Bath Towel',
    'Bathmat', 'Hand Towel', 'Washcloth', 'Robe',
    'Encasement King', 'Encasement Queen', 'Mattress Pad King', 'Mattress Pad Queen',
    'Duvet King', 'Duvet Queen', 'Insert Duvet King', 'Insert Duvet Queen',
    'Pool Towels', 'Microfibras', 'Bathroom Curtain', 'Pillow KING',
    'Pillow Queen', 'Blanket', 'Toallas Iberostar', 'MAPOS AZULES'
];

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const Storage = {
    init() {
        try {
            if (!localStorage.getItem(KEYS.MASTER_LIST)) {
                localStorage.setItem(KEYS.MASTER_LIST, JSON.stringify(INITIAL_ITEMS));
            }
            if (!localStorage.getItem(KEYS.DAYS)) {
                localStorage.setItem(KEYS.DAYS, JSON.stringify([]));
            }
        } catch (e) {
            console.error('Storage Init Failed:', e);
        }
    },

    getMasterList() {
        return JSON.parse(localStorage.getItem(KEYS.MASTER_LIST) || '[]');
    },

    addCustomItemToMasterList(itemName) {
        const list = this.getMasterList();
        if (!list.includes(itemName)) {
            list.push(itemName);
            localStorage.setItem(KEYS.MASTER_LIST, JSON.stringify(list));
            return true;
        }
        return false;
    },

    getDays() {
        return JSON.parse(localStorage.getItem(KEYS.DAYS) || '[]');
    },

    getDay(id) {
        const days = this.getDays();
        return days.find(d => d.id === id);
    },

    createDay() {
        const days = this.getDays();
        const maxNum = days.reduce((max, d) => Math.max(max, d.number || 0), 0);
        const nextNum = maxNum + 1;

        const now = new Date();

        const newDay = {
            id: uuidv4(),
            number: nextNum,
            date: now.toISOString(),
            inventory: {}
        };

        days.unshift(newDay);
        localStorage.setItem(KEYS.DAYS, JSON.stringify(days));

        return newDay;
    },

    updateDay(id, updates) {
        const days = this.getDays();
        const index = days.findIndex(d => d.id === id);
        if (index !== -1) {
            days[index] = { ...days[index], ...updates };
            localStorage.setItem(KEYS.DAYS, JSON.stringify(days));
            return days[index];
        }
        return null;
    },

    updateInventoryItem(dayId, itemName, quantity) {
        const day = this.getDay(dayId);
        if (day) {
            day.inventory[itemName] = quantity;
            this.updateDay(dayId, { inventory: day.inventory });
        }
    },

    updateMasterItem(oldName, newName) {
        const list = this.getMasterList();
        const index = list.indexOf(oldName);
        if (index !== -1 && !list.includes(newName)) {
            list[index] = newName;
            localStorage.setItem(KEYS.MASTER_LIST, JSON.stringify(list));

            const days = this.getDays();
            let hasChanges = false;

            days.forEach(day => {
                if (day.inventory && day.inventory[oldName] !== undefined) {
                    day.inventory[newName] = day.inventory[oldName];
                    delete day.inventory[oldName];
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                localStorage.setItem(KEYS.DAYS, JSON.stringify(days));
            }
            return true;
        }
        return false;
    },

    deleteMasterItem(itemName) {
        let list = this.getMasterList();
        list = list.filter(item => item !== itemName);
        localStorage.setItem(KEYS.MASTER_LIST, JSON.stringify(list));
        return true;
    },

    deleteDay(id) {
        let days = this.getDays();
        days = days.filter(d => d.id !== id);
        localStorage.setItem(KEYS.DAYS, JSON.stringify(days));
    }
};

/* Inventory Component */
const Inventory = {
    init(handlers) {
        this.container = document.getElementById('inventory-list');
        this.title = document.getElementById('inventory-title');
        this.btnBack = document.getElementById('btn-back');
        this.actionsContainer = document.querySelector('.inventory-actions');

        this.modal = document.getElementById('quantity-modal');
        this.modalItemName = document.getElementById('modal-item-name');
        this.modalInput = document.getElementById('modal-quantity-input');
        this.btnModalDecrease = document.getElementById('btn-modal-decrease');
        this.btnModalIncrease = document.getElementById('btn-modal-increase');
        this.btnModalCancel = document.getElementById('btn-modal-cancel');
        this.btnModalConfirm = document.getElementById('btn-modal-confirm');

        this.deleteModal = document.getElementById('delete-confirm-modal');
        this.btnDeleteCancel = document.getElementById('btn-delete-cancel');
        this.btnDeleteConfirm = document.getElementById('btn-delete-confirm');
        this.deleteText = document.getElementById('delete-confirm-text');
        this.currentDeleteContext = null;

        // New Item Modal
        this.newItemModal = document.getElementById('new-item-modal');
        this.newItemInput = document.getElementById('new-item-input');
        this.btnNewItemCancel = document.getElementById('btn-new-item-cancel');
        this.newItemForm = document.getElementById('new-item-form');

        // Edit Item Modal
        this.editItemModal = document.getElementById('edit-item-modal');
        this.editItemInput = document.getElementById('edit-item-input');
        this.editItemOriginal = document.getElementById('edit-item-original-name');
        this.btnEditItemCancel = document.getElementById('btn-edit-item-cancel');
        this.editItemForm = document.getElementById('edit-item-form');

        this.onBack = handlers.onBack;
        this.currentDayId = null;
        this.pendingAction = null;

        this.isEditMode = false;
        this.btnToggle = null;

        this.bindEvents();
    },

    bindEvents() {
        this.btnBack.addEventListener('click', () => {
            if (this.isEditMode) this.toggleEditMode();
            this.onBack();
        });

        // Initialize Manage Button
        if (!document.getElementById('btn-toggle-manage')) {
            const btnToggle = document.createElement('button');
            btnToggle.id = 'btn-toggle-manage';
            btnToggle.className = 'btn-toggle-manage';
            btnToggle.textContent = 'Gestionar';
            btnToggle.onclick = () => this.toggleEditMode();

            this.actionsContainer.insertBefore(btnToggle, this.actionsContainer.firstChild);
            this.btnToggle = btnToggle;

            const btnAdd = document.getElementById('btn-add-custom-item');
            btnAdd.onclick = () => {
                this.newItemInput.value = '';
                this.newItemModal.showModal();
                setTimeout(() => this.newItemInput.focus(), 100);
            };
        }

        /* New Item Logic */
        this.btnNewItemCancel.addEventListener('click', () => this.newItemModal.close());
        this.newItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = this.newItemInput.value;
            if (name && name.trim()) {
                if (Storage.addCustomItemToMasterList(name.trim())) {
                    this.render(this.currentDayId);
                    this.newItemModal.close();
                } else {
                    alert('El ítem ya existe.');
                }
            }
        });

        /* Edit Item Logic */
        this.btnEditItemCancel.addEventListener('click', () => this.editItemModal.close());
        this.editItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const originalName = this.editItemOriginal.value;
            const newName = this.editItemInput.value;

            if (newName && newName.trim() && newName !== originalName) {
                if (Storage.updateMasterItem(originalName, newName.trim())) {
                    this.render(this.currentDayId);
                    this.editItemModal.close();
                } else {
                    alert('Nombre inválido o ya existe.');
                }
            } else {
                this.editItemModal.close();
            }
        });

        this.btnModalCancel.addEventListener('click', () => this.closeModal());

        this.btnModalIncrease.addEventListener('click', () => {
            this.modalInput.value = parseInt(this.modalInput.value || 0) + 1;
        });

        this.btnModalDecrease.addEventListener('click', () => {
            const val = parseInt(this.modalInput.value || 0);
            if (val > 0) this.modalInput.value = val - 1;
        });

        this.btnModalConfirm.addEventListener('click', () => {
            const qty = parseInt(this.modalInput.value);
            if (!isNaN(qty) && qty > 0) {
                this.executePendingAction(qty);
            }
            this.closeModal();
        });

        this.btnDeleteCancel.addEventListener('click', () => {
            this.deleteModal.close();
        });

        this.btnDeleteConfirm.addEventListener('click', () => {
            if (!this.currentDeleteContext) return;

            if (this.currentDeleteContext.type === 'item') {
                Storage.deleteMasterItem(this.currentDeleteContext.id);
                this.render(this.currentDayId);
            } else if (this.currentDeleteContext.type === 'day') {
                Storage.deleteDay(this.currentDeleteContext.id);
                Dashboard.render();
            }

            this.deleteModal.close();
            this.currentDeleteContext = null;
        });
    },

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        this.btnToggle.classList.toggle('active', this.isEditMode);
        this.btnToggle.textContent = this.isEditMode ? 'Terminar Edición' : 'Gestionar';
        this.render(this.currentDayId);
    },

    confirmDelete(type, id, displayName) {
        this.currentDeleteContext = { type, id };
        if (this.deleteText) {
            this.deleteText.innerHTML = `¿Estás seguro de eliminar <b>${displayName}</b>?<br>Esta acción no se puede deshacer.`;
        }
        this.deleteModal.showModal();
    },

    openEditModalForItem(itemName) {
        this.editItemInput.value = itemName;
        this.editItemOriginal.value = itemName;
        this.editItemModal.showModal();
        setTimeout(() => this.editItemInput.select(), 100);
    },

    openModal(itemName, type) {
        this.pendingAction = { itemName, type };
        this.modalItemName.textContent = `${type === 'add' ? 'Añadir a' : 'Restar de'} ${itemName}`;
        this.modalInput.value = 1;
        this.modal.showModal();
        setTimeout(() => this.modalInput.select(), 100);
    },

    closeModal() {
        this.modal.close();
        this.pendingAction = null;
    },

    executePendingAction(changeAmount) {
        if (!this.currentDayId || !this.pendingAction) return;

        const { itemName, type } = this.pendingAction;
        const day = Storage.getDay(this.currentDayId);
        const currentQty = day.inventory[itemName] || 0;

        let newQty = currentQty;
        if (type === 'add') {
            newQty += changeAmount;
        } else {
            newQty = Math.max(0, currentQty - changeAmount);
        }

        Storage.updateInventoryItem(this.currentDayId, itemName, newQty);
        this.renderRow(itemName, newQty);
    },

    render(dayId) {
        this.currentDayId = dayId;
        const day = Storage.getDay(dayId);
        if (!day) return;

        this.title.textContent = `Día ${day.number}`;

        const masterList = Storage.getMasterList();
        this.container.innerHTML = '';

        masterList.forEach(item => {
            const qty = day.inventory[item] || 0;
            const row = this.createRow(item, qty);
            this.container.appendChild(row);
        });

        document.getElementById('app').scrollTo(0, 0);
    },

    createRow(itemName, quantity) {
        const div = document.createElement('div');
        div.className = `inventory-item ${this.isEditMode ? 'edit-mode' : ''}`;
        div.id = `row-${itemName.replace(/\s+/g, '-')}`;

        div.innerHTML = `
            <div class="item-name">${itemName}</div>
            <div class="item-quantity">
                <button class="btn-qty btn-sub" aria-label="Restar">−</button>
                <span class="qty-value">${quantity}</span>
                <button class="btn-qty btn-add" aria-label="Sumar">+</button>
            </div>
            <div class="item-manage-controls">
                <button class="btn-icon-action btn-edit-item" title="Editar">✎</button>
                <button class="btn-icon-action btn-delete-item" title="Borrar">🗑</button>
            </div>
        `;

        if (!this.isEditMode) {
            div.querySelector('.btn-sub').addEventListener('click', () => this.openModal(itemName, 'sub'));
            div.querySelector('.btn-add').addEventListener('click', () => this.openModal(itemName, 'add'));
        } else {
            div.querySelector('.btn-edit-item').addEventListener('click', () => {
                this.openEditModalForItem(itemName);
            });

            div.querySelector('.btn-delete-item').addEventListener('click', () => {
                this.confirmDelete('item', itemName, itemName);
            });
        }

        return div;
    },

    renderRow(itemName, newQty) {
        const id = `row-${itemName.replace(/\s+/g, '-')}`;
        const row = document.getElementById(id);
        if (row) {
            const qtyVal = row.querySelector('.qty-value');
            if (qtyVal) qtyVal.textContent = newQty;
            row.style.backgroundColor = '#f0f8ff';
            setTimeout(() => row.style.backgroundColor = 'transparent', 300);
        }
    }
};

/* Dashboard Component */
const Dashboard = {
    init(handlers) {
        this.container = document.getElementById('days-list-container');
        this.searchInput = document.getElementById('search-input');
        this.fab = document.getElementById('fab-add-day');

        this.dayModal = document.getElementById('day-modal');
        this.dayParams = null;
        this.dayDateInput = document.getElementById('day-date-input');
        this.dayNumberInput = document.getElementById('day-number-input');
        this.btnDayCancel = document.getElementById('btn-day-cancel');
        this.dayForm = document.getElementById('day-form');

        this.onDayClick = handlers.onDayClick;

        this.bindEvents();
        this.render();
    },

    bindEvents() {
        this.searchInput.addEventListener('input', (e) => {
            this.render(e.target.value);
        });

        this.fab.addEventListener('click', () => {
            const newDay = Storage.createDay();
            const monthKey = this.getMonthKey(newDay.date);
            // Pass the Month Key to force it open
            this.render('', monthKey);
        });

        this.btnDayCancel.addEventListener('click', () => this.dayModal.close());
        this.dayForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDayEdit();
        });
    },

    openEditModal(day) {
        this.dayParams = { id: day.id };
        const dateObj = new Date(day.date);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');

        this.dayDateInput.value = `${yyyy}-${mm}-${dd}`;
        this.dayNumberInput.value = day.number;

        this.dayModal.showModal();
    },

    saveDayEdit() {
        if (!this.dayParams) return;

        const newNum = parseInt(this.dayNumberInput.value);
        const newDateVal = this.dayDateInput.value;
        const newDate = new Date(newDateVal + 'T12:00:00');

        const updated = Storage.updateDay(this.dayParams.id, {
            number: newNum,
            date: newDate.toISOString()
        });

        this.dayModal.close();
        if (updated) {
            const key = this.getMonthKey(updated.date);
            this.render('', key);
        } else {
            this.render();
        }
    },

    formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('es-ES', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    },

    getMonthKey(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    },

    render(filterText = '', forceOpenMonth = null) {
        const days = Storage.getDays();
        this.container.innerHTML = '';

        if (days.length === 0) {
            this.container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <p>No hay registros.</p>
                    <p>Toca el botón + para empezar.</p>
                </div>
            `;
            return;
        }

        const filtered = days.filter(d => {
            const search = filterText.toLowerCase();
            const dateStr = this.formatDate(d.date).toLowerCase();
            const numStr = `día ${d.number}`;
            return dateStr.includes(search) || numStr.includes(search);
        });

        const groups = {};
        filtered.forEach(day => {
            const key = this.getMonthKey(day.date);
            if (!groups[key]) groups[key] = [];
            groups[key].push(day);
        });

        const sortedMonthKeys = Object.keys(groups).sort((a, b) => {
            const dateA = new Date(groups[a][0].date);
            const dateB = new Date(groups[b][0].date);
            return dateB - dateA;
        });

        sortedMonthKeys.forEach(monthName => {
            const groupEl = document.createElement('div');
            // If this is the forced month or we are searching (maybe?), we open it.
            // Requirement was: "al crear un dia no se abran todos, pero que NO se cierre el del dia nuevo"
            const isOpen = (forceOpenMonth && monthName === forceOpenMonth) || (filterText.length > 0);

            groupEl.className = isOpen ? 'month-group' : 'month-group collapsed';

            const header = document.createElement('div');
            header.className = 'month-header';
            header.textContent = monthName.toUpperCase();

            header.addEventListener('click', () => {
                groupEl.classList.toggle('collapsed');
            });

            groupEl.appendChild(header);

            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'month-content-wrapper';

            const contentEl = document.createElement('div');
            contentEl.className = 'month-content';

            groups[monthName].forEach(day => {
                const card = document.createElement('div');
                card.className = 'day-card';
                card.innerHTML = `
                    <div class="day-info" style="flex: 1;">
                        <h3>Día ${day.number}</h3>
                        <p>${this.formatDate(day.date)}</p>
                    </div>
                    <div class="card-actions" style="display: flex; gap: 10px; align-items: center;">
                        <button class="btn-icon-small btn-edit" title="Editar">✎</button>
                        <button class="btn-icon-small btn-delete" title="Borrar" style="color: #ff4444;">🗑</button>
                        <div style="font-size: 1.2rem; color: #ccc; margin-left: 5px;">›</div>
                    </div>
                `;

                card.addEventListener('click', () => {
                    this.onDayClick(day.id);
                });

                const btnEdit = card.querySelector('.btn-edit');
                btnEdit.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openEditModal(day);
                });

                const btnDelete = card.querySelector('.btn-delete');
                btnDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Inventory.confirmDelete('day', day.id, `Día ${day.number}`);
                });

                contentEl.appendChild(card);
            });

            contentWrapper.appendChild(contentEl);
            groupEl.appendChild(contentWrapper);
            this.container.appendChild(groupEl);
        });
    }
};

/* Main App Logic */
const App = {
    init() {
        try {
            Storage.init();

            this.dashboardView = document.getElementById('dashboard-view');
            this.inventoryView = document.getElementById('inventory-view');
            this.splashScreen = document.getElementById('splash-screen');

            Dashboard.init({
                onDayClick: (dayId) => this.navigateToInventory(dayId)
            });

            Inventory.init({
                onBack: () => this.navigateToDashboard()
            });

            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('sw.js')
                    .then(() => console.log('SW Registered'))
                    .catch(err => console.log('SW Fail', err));
            }

            // Ensure Splash Removal
            setTimeout(() => {
                if (this.splashScreen) {
                    this.splashScreen.classList.add('fade-out');
                    setTimeout(() => {
                        this.splashScreen.style.display = 'none';
                    }, 500);
                }
            }, 1500); // 1.5s delay

        } catch (err) {
            console.error('App Init Failed:', err);
            if (document.getElementById('splash-screen')) {
                document.getElementById('splash-screen').style.display = 'none';
            }
        }
    },

    navigateToInventory(dayId) {
        Inventory.render(dayId);
        this.dashboardView.classList.add('hidden');
        this.dashboardView.classList.remove('active');

        this.inventoryView.classList.remove('hidden');
        this.inventoryView.classList.add('active');
    },

    navigateToDashboard() {
        Dashboard.render();
        this.inventoryView.classList.add('hidden');
        this.inventoryView.classList.remove('active');

        this.dashboardView.classList.remove('hidden');
        this.dashboardView.classList.add('active');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
