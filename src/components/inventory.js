import { Storage } from '../data/storage.js';

export const Inventory = {
    init(handlers) {
        this.container = document.getElementById('inventory-list');
        this.title = document.getElementById('inventory-title');
        this.btnBack = document.getElementById('btn-back');

        // Wrapper for buttons in actions arg
        this.actionsContainer = document.querySelector('.inventory-actions');

        // Quantity Modal elements
        this.modal = document.getElementById('quantity-modal');
        this.modalItemName = document.getElementById('modal-item-name');
        this.modalInput = document.getElementById('modal-quantity-input');
        this.btnModalDecrease = document.getElementById('btn-modal-decrease');
        this.btnModalIncrease = document.getElementById('btn-modal-increase');
        this.btnModalCancel = document.getElementById('btn-modal-cancel');
        this.btnModalConfirm = document.getElementById('btn-modal-confirm');

        // Delete Confirm Modal
        this.deleteModal = document.getElementById('delete-confirm-modal');
        this.btnDeleteCancel = document.getElementById('btn-delete-cancel');
        this.btnDeleteConfirm = document.getElementById('btn-delete-confirm');
        this.itemToDelete = null;

        this.onBack = handlers.onBack;
        this.currentDayId = null;
        this.pendingAction = null;

        // State
        this.isEditMode = false;
        this.btnToggle = null; // Initialize btnToggle here

        this.bindEvents();
    },

    bindEvents() {
        this.btnBack.addEventListener('click', () => {
            this.onBack();
        });

        // Inject Toggle Button into Actions if not exists
        if (!document.getElementById('btn-toggle-manage')) {
            const btnToggle = document.createElement('button');
            btnToggle.id = 'btn-toggle-manage';
            btnToggle.className = 'btn-toggle-manage';
            btnToggle.textContent = 'Gestionar Inventario';
            btnToggle.onclick = () => this.toggleEditMode();

            // Insert before Add Button
            const btnAdd = document.getElementById('btn-add-custom-item');
            this.actionsContainer.insertBefore(btnToggle, btnAdd);

            // Bind Add Button here too since we're re-initing mostly
            btnAdd.addEventListener('click', () => {
                const name = prompt('Nombre del nuevo ítem:');
                if (name && name.trim()) {
                    if (Storage.addCustomItemToMasterList(name.trim())) {
                        this.render(this.currentDayId);
                    } else {
                        alert('El ítem ya existe.');
                    }
                }
            });
            this.btnToggle = btnToggle;
        }

        // Modal Events
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

        // Delete Modal Events
        this.btnDeleteCancel.addEventListener('click', () => {
            this.deleteModal.close();
            this.itemToDelete = null;
        });

        this.btnDeleteConfirm.addEventListener('click', () => {
            if (this.itemToDelete) {
                Storage.deleteMasterItem(this.itemToDelete);
                this.deleteModal.close();
                this.itemToDelete = null;
                this.render(this.currentDayId);
            }
        });
    },

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        this.btnToggle.classList.toggle('active', this.isEditMode);
        this.btnToggle.textContent = this.isEditMode ? 'Terminar Edición' : 'Gestionar Inventario';
        this.render(this.currentDayId);
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
            
            <!-- Adjust Mode -->
            <div class="item-quantity">
                <button class="btn-qty btn-sub" aria-label="Restar">−</button>
                <span class="qty-value">${quantity}</span>
                <button class="btn-qty btn-add" aria-label="Sumar">+</button>
            </div>

            <!-- Manage Mode -->
            <div class="item-manage-controls">
                <button class="btn-edit-item">Editar</button>
                <button class="btn-delete-item">Borrar</button>
            </div>
        `;

        if (!this.isEditMode) {
            div.querySelector('.btn-sub').addEventListener('click', () => this.openModal(itemName, 'sub'));
            div.querySelector('.btn-add').addEventListener('click', () => this.openModal(itemName, 'add'));
        } else {
            div.querySelector('.btn-edit-item').addEventListener('click', () => {
                const newName = prompt('Editar nombre del ítem:', itemName);
                if (newName && newName.trim() !== itemName) {
                    if (Storage.updateMasterItem(itemName, newName.trim())) {
                        this.render(this.currentDayId);
                    } else {
                        alert('Nombre inválido o ya existe.');
                    }
                }
            });

            div.querySelector('.btn-delete-item').addEventListener('click', () => {
                this.itemToDelete = itemName;
                this.deleteModal.showModal();
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
