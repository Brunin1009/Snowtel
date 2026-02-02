import { Storage } from '../data/storage.js';

export const Dashboard = {
    init(handlers) {
        this.container = document.getElementById('days-list-container');
        this.searchInput = document.getElementById('search-input');
        this.fab = document.getElementById('fab-add-day');

        // Day Modal
        this.dayModal = document.getElementById('day-modal');
        this.dayParams = null; // { id }
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
            this.render();
        });

        // Modal Events
        this.btnDayCancel.addEventListener('click', () => this.dayModal.close());
        this.dayForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDayEdit();
        });
    },

    openEditModal(day) {
        this.dayParams = { id: day.id };
        // Format date for input type=date (YYYY-MM-DD)
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
        const newDateVal = this.dayDateInput.value; // YYYY-MM-DD
        // Create date at noon to avoid timezone rolling
        const newDate = new Date(newDateVal + 'T12:00:00');

        Storage.updateDay(this.dayParams.id, {
            number: newNum,
            date: newDate.toISOString()
        });

        this.dayModal.close();
        this.render();
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

    render(filterText = '') {
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

        // Filter
        const filtered = days.filter(d => {
            const search = filterText.toLowerCase();
            const dateStr = this.formatDate(d.date).toLowerCase();
            const numStr = `día ${d.number}`;
            return dateStr.includes(search) || numStr.includes(search);
        });

        // Group by Month
        const groups = {};
        filtered.forEach(day => {
            const key = this.getMonthKey(day.date);
            if (!groups[key]) groups[key] = [];
            groups[key].push(day);
        });

        // Render Groups
        Object.keys(groups).forEach(monthName => {
            const groupEl = document.createElement('div');
            groupEl.className = 'month-group'; // Expanded by default

            const header = document.createElement('div');
            header.className = 'month-header';
            header.textContent = monthName.toUpperCase();

            // Accordion Toggle
            header.addEventListener('click', () => {
                groupEl.classList.toggle('collapsed');
            });

            groupEl.appendChild(header);

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
                        <button class="btn-icon-small btn-edit" title="Editar" style="border:none; background:none; cursor:pointer; font-size:1.2rem;">✎</button>
                        <button class="btn-icon-small btn-delete" title="Borrar" style="color: #ff4444; border:none; background:none; cursor:pointer; font-size:1.2rem;">🗑</button>
                        <div style="font-size: 1.2rem; color: #ccc; margin-left: 5px;">›</div>
                    </div>
                `;

                // Card click (using arrow or empty space)
                card.addEventListener('click', () => {
                    this.onDayClick(day.id);
                });

                // Edit Button
                const btnEdit = card.querySelector('.btn-edit');
                btnEdit.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openEditModal(day);
                });

                // Delete Button
                const btnDelete = card.querySelector('.btn-delete');
                btnDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`¿Borrar Día ${day.number}?`)) {
                        Storage.deleteDay(day.id);
                        this.render();
                    }
                });

                contentEl.appendChild(card);
            });

            groupEl.appendChild(contentEl);
            this.container.appendChild(groupEl);
        });
    }
};
