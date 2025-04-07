#include <Arduino.h>

// Define constants
const int numPMs = 9; // Number of modules (PMs)
int assignments[numPMs]; // Array to track assignments of PMs to guns

void setup() {
    // Initialize GPIO pins for relays
    for (int pin = 2; pin < 2 + numPMs; pin++) {
        pinMode(pin, OUTPUT);
        digitalWrite(pin, LOW); // Ensure all relays are off initially
    }

    // Initialize assignments array
    for (int i = 0; i < numPMs; i++) {
        assignments[i] = -1; // No PM is assigned to any gun
    }
}

void activateRelays(int modules[], int moduleCount, int gunNumber) {
    int gunIdx = gunNumber - 1;

    // First, deactivate all relays connected to this gun
    for (int pmIdx = 0; pmIdx < numPMs; pmIdx++) {
        if (assignments[pmIdx] == gunIdx) {
            digitalWrite(2 + pmIdx, LOW); // Turn off the relay
            assignments[pmIdx] = -1; // Reset assignment
        }
    }

    // Then activate new connections
    for (int i = 0; i < moduleCount; i++) {
        int moduleNum = modules[i];
        int pmIdx = moduleNum - 1;

        // If this module is assigned to a different gun, deactivate that connection first
        if (assignments[pmIdx] != -1) {
            digitalWrite(2 + pmIdx, LOW); // Turn off the relay
            assignments[pmIdx] = -1; // Reset assignment
        }

        // Activate the new connection
        digitalWrite(2 + pmIdx, HIGH); // Turn on the relay
        assignments[pmIdx] = gunIdx; // Update assignment
    }
}

void loop() {
    // Example usage (replace with actual logic)
    int exampleModules[] = {1, 3, 5};
    activateRelays(exampleModules, 3, 1);
    delay(5000); // Wait for 5 seconds
}
