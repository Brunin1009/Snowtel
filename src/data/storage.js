const KEYS = {
    DAYS: 'snowtel_days',
    MASTER_LIST: 'snowtel_master_list',
    NEXT_DAY_NUM: 'snowtel_next_day_num'
};

const INITIAL_ITEMS = [
    'Flat Sheets King', 'Flat Sheets Queen', 'Pillow Cases King', 'Bath Towel',
    'Bathmat', 'Hand Towel', 'Washcloth', 'Robe',
    'Encasement King', 'Encasement Queen', 'Mattress Pad King', 'Mattress Pad Queen',
    'Duvet King', 'Duvet Queen', 'Insert Duvet King', 'Insert Duvet Queen',
    'Pool Towels', 'Microfibras', 'Bathroom Curtain', 'Pillow KING',
    'Pillow Queen', 'Blanket', 'Toallas Iberostar', 'MAPOS AZULES'
];

// Helper to simulate UUID
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export const Storage = {
    init() {
        if (!localStorage.getItem(KEYS.MASTER_LIST)) {
            localStorage.setItem(KEYS.MASTER_LIST, JSON.stringify(INITIAL_ITEMS));
        }
        if (!localStorage.getItem(KEYS.DAYS)) {
            localStorage.setItem(KEYS.DAYS, JSON.stringify([]));
        }
        if (!localStorage.getItem(KEYS.NEXT_DAY_NUM)) {
            localStorage.setItem(KEYS.NEXT_DAY_NUM, '1');
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
        const nextNum = parseInt(localStorage.getItem(KEYS.NEXT_DAY_NUM) || '1');
        const now = new Date();

        const newDay = {
            id: uuidv4(),
            number: nextNum,
            date: now.toISOString(), // Standard format
            inventory: {} // Map: "Item Name": Quantity
        };

        days.unshift(newDay); // Add to beginning (newest first)
        localStorage.setItem(KEYS.DAYS, JSON.stringify(days));
        localStorage.setItem(KEYS.NEXT_DAY_NUM, (nextNum + 1).toString());

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
            // Update Master List
            list[index] = newName;
            localStorage.setItem(KEYS.MASTER_LIST, JSON.stringify(list));

            // Migrate Data in all days
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
        // Remove from Master List
        let list = this.getMasterList();
        list = list.filter(item => item !== itemName);
        localStorage.setItem(KEYS.MASTER_LIST, JSON.stringify(list));

        // Optional: We do NOT remove the item from historical days data 
        // to preserve integrity of past reports, but it won't show in the UI 
        // since the UI iterates over the MASTER_LIST.
        // If the user wants to "clean" old data, that would be a separate feature.
        return true;
    },

    deleteDay(id) {
        let days = this.getDays();
        days = days.filter(d => d.id !== id);
        localStorage.setItem(KEYS.DAYS, JSON.stringify(days));
    }
};
