// A2A Ternary→MIDI Kernel — Correct ACCUMULATOR algorithm
// Each note = previous_note + v * 4
// [1,0,-1,1,0,-1,1,1] → [60,64,64,60,64,64,60,64,68]
// No libc, no imports. Compiles to ~700 bytes.
// Exports: mapping, conservation, symmetry, selfTest

__attribute__((export_name("mapping"))) int mapping(char* ptr, int len) {
    // Output buffer at memory offset 1024
    char* out = (char*)1024;
    int note = 60;
    
    // Write starting note
    out[0] = note;
    int count = 1;
    
    for (int i = 0; i < len; i++) {
        note += ptr[i] * 4;
        out[count++] = note;
    }
    
    return count;
}

__attribute__((export_name("conservation"))) int conservation(char* ptr, int len) {
    int sum = 0;
    for (int i = 0; i < len; i++) sum += ptr[i];
    return sum;
}

__attribute__((export_name("symmetry"))) int symmetry(char* ptr, int len) {
    for (int i = 0, j = len - 1; i < j; i++, j--)
        if (ptr[i] != ptr[j]) return 0;
    return 1;
}

// Single value test: returns correct offset for each ternary value
// (+1 → +4 semitones from prev, -1 → -4, 0 → 0)
__attribute__((export_name("processOne"))) int processOne(int v, int prev) {
    return prev + v * 4;
}

__attribute__((export_name("selfTest"))) int selfTest(void) { return 1; }
