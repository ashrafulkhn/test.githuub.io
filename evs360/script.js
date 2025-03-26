const numPMs = 9;
const numGuns = 6;
const assignments = Array(numPMs).fill(-1);

function handleFormSubmit(event) {
    event.preventDefault();
    
    // Clear previous error messages
    document.getElementById('moduleError').textContent = '';
    document.getElementById('gunError').textContent = '';
    
    // Get form values
    const moduleInput = document.getElementById('moduleList').value;
    const gunNumber = parseInt(document.getElementById('gunNumber').value);
    
    // Validate gun number
    if (gunNumber < 1 || gunNumber > 6) {
        document.getElementById('gunError').textContent = 'Gun number must be between 1 and 6';
        return false;
    }
    
    // Parse and validate module numbers
    const modules = moduleInput.split(',').map(num => parseInt(num.trim()));
    
    // Validate module numbers
    const invalidModules = modules.filter(num => num < 1 || num > 9);
    if (invalidModules.length > 0) {
        document.getElementById('moduleError').textContent = 'All module numbers must be between 1 and 9';
        return false;
    }
    
    // Activate relays
    activateRelays(modules, gunNumber);
    
    return false;
}

function activateRelays(modules, gunNumber) {
    const gunIdx = gunNumber - 1;
    
    // First, deactivate all relays connected to this gun
    for (let pmIdx = 0; pmIdx < numPMs; pmIdx++) {
        if (assignments[pmIdx] === gunIdx) {
            const existingRelay = document.querySelector(`.relay[data-pm="${pmIdx}"][data-gun="${gunIdx}"]`);
            if (existingRelay) {
                existingRelay.classList.remove('on');
                assignments[pmIdx] = -1;
            }
        }
    }
    
    // Then activate new connections
    modules.forEach(moduleNum => {
        const pmIdx = moduleNum - 1;
        
        // If this module is assigned to a different gun, deactivate that connection first
        if (assignments[pmIdx] !== -1) {
            const oldRelay = document.querySelector(`.relay[data-pm="${pmIdx}"].on`);
            if (oldRelay) {
                oldRelay.classList.remove('on');
                assignments[pmIdx] = -1;
            }
        }
        
        // Activate the new connection
        const relay = document.querySelector(`.relay[data-pm="${pmIdx}"][data-gun="${gunIdx}"]`);
        if (relay) {
            relay.classList.add('on');
            assignments[pmIdx] = gunIdx;
        }
    });
    
    // Update assignments display
    updateAssignments();
}

function createMatrix() {
    const container = document.getElementById('matrix');
    
    // Create header row with guns
    const headerRow = document.createElement('div');
    headerRow.className = 'pm-row';
    headerRow.innerHTML = '<div style="width:60px"></div>';
    for (let gun = 1; gun <= numGuns; gun++) {
        const gunElement = document.createElement('div');
        gunElement.className = 'gun';
        gunElement.textContent = `Gun${gun}`;
        headerRow.appendChild(gunElement);
    }
    container.appendChild(headerRow);
    
    // Create PM rows with relays
    for (let pm = 1; pm <= numPMs; pm++) {
        const row = document.createElement('div');
        row.className = 'pm-row';
        
        const pmElement = document.createElement('div');
        pmElement.className = 'pm';
        pmElement.textContent = `PM${pm}`;
        row.appendChild(pmElement);
        
        for (let gun = 1; gun <= numGuns; gun++) {
            const relay = document.createElement('div');
            relay.className = 'relay';
            relay.textContent = `R${pm}_G${gun}`;
            relay.dataset.pm = pm-1;
            relay.dataset.gun = gun-1;
            
            relay.addEventListener('click', function() {
                const pmIdx = parseInt(this.dataset.pm);
                const gunIdx = parseInt(this.dataset.gun);
                
                // If already assigned to this gun, turn off
                if (assignments[pmIdx] === gunIdx) {
                    assignments[pmIdx] = -1;
                    this.classList.remove('on');
                } 
                // If unassigned or assigned to different gun
                else if (assignments[pmIdx] === -1 || confirm(`PM${pmIdx+1} is already assigned to Gun${assignments[pmIdx]+1}. Override?`)) {
                    // Turn off previous assignment
                    const prevRelay = document.querySelector(`.relay[data-pm="${pmIdx}"].on`);
                    if (prevRelay) prevRelay.classList.remove('on');
                    
                    // Assign to new gun
                    assignments[pmIdx] = gunIdx;
                    this.classList.add('on');
                }
                
                updateAssignments();
            });
            
            row.appendChild(relay);
        }
        
        container.appendChild(row);
    }
}

function updateAssignments() {
    const assignmentText = assignments.map((gunIdx, pmIdx) => 
        gunIdx !== -1 ? `PM${pmIdx+1}→Gun${gunIdx+1}` : ''
    ).filter(x => x).join(', ');
    
    document.getElementById('assignments').textContent = 
        assignmentText || 'No active assignments';
}

// Initialize the matrix when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    createMatrix();
    updateAssignments();
}); 