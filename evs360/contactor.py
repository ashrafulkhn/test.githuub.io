def activate_relays(modules, gun_number, assignments, num_pms):
    gun_idx = gun_number - 1

    # First, deactivate all relays connected to this gun
    for pm_idx in range(num_pms):
        if assignments[pm_idx] == gun_idx:
            # Simulate deactivating the relay
            print(f"Deactivating relay for PM{pm_idx + 1} and Gun{gun_idx + 1}")
            assignments[pm_idx] = -1

    # Then activate new connections
    for module_num in modules:
        pm_idx = module_num - 1

        # If this module is assigned to a different gun, deactivate that connection first
        if assignments[pm_idx] != -1:
            print(f"Deactivating relay for PM{pm_idx + 1} from Gun{assignments[pm_idx] + 1}")
            assignments[pm_idx] = -1

        # Activate the new connection
        print(f"Activating relay for PM{pm_idx + 1} and Gun{gun_idx + 1}")
        assignments[pm_idx] = gun_idx

    # Update assignments display
    update_assignments(assignments)

def update_assignments(assignments):
    active_assignments = [
        f"PM{pm_idx + 1}→Gun{gun_idx + 1}" 
        for pm_idx, gun_idx in enumerate(assignments) 
        if gun_idx != -1
    ]
    if active_assignments:
        print("Active Assignments:", ", ".join(active_assignments))
    else:
        print("No active assignments")
