<template>
  <div class="session-timer bg-white rounded-lg shadow-lg overflow-hidden">
    <!-- Timer Header -->
    <div class="px-6 py-4" :class="{
      'bg-gradient-to-r from-green-500 to-green-600': isRunning && !isPaused,
      'bg-gradient-to-r from-yellow-500 to-yellow-600': isPaused,
      'bg-gradient-to-r from-gray-500 to-gray-600': !isRunning && !isPaused,
      'bg-gradient-to-r from-red-500 to-red-600': isRunning && currentUnits === 0
    }">
      <div class="flex justify-between items-center text-white">
        <div>
          <h3 class="text-xl font-bold">Session Timer</h3>
          <p class="text-sm opacity-90">{{ sessionType }} Session</p>
        </div>
        <div class="text-right">
          <div class="text-3xl font-mono font-bold">{{ formattedTime }}</div>
          <div class="text-sm opacity-90">{{ currentUnits }} H0038 Units</div>
        </div>
      </div>
    </div>

    <!-- Session Configuration -->
    <div v-if="!isRunning" class="p-6 bg-gray-50">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
          <select 
            v-model="sessionType" 
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Individual">Individual Session</option>
            <option value="Group">Group Session</option>
            <option value="Case Management">Case Management</option>
            <option value="Crisis Intervention">Crisis Intervention</option>
          </select>
        </div>
        
        <div v-if="sessionType === 'Group'">
          <label class="block text-sm font-medium text-gray-700 mb-2">Group Size</label>
          <input 
            v-model.number="groupSize" 
            type="number" 
            min="1" 
            max="8"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Max 8 participants"
          >
          <p v-if="groupSize > 8" class="text-red-500 text-xs mt-1">⚠️ Group exceeds 1:8 ratio limit</p>
        </div>
      </div>

      <!-- Patient Selection for Session -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          {{ sessionType === 'Group' ? 'Group Participants' : 'Select Patient' }}
        </label>
        <div class="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
          <div 
            v-for="patient in availablePatients" 
            :key="patient.id"
            class="flex items-center p-2 border border-gray-200 rounded-md hover:bg-gray-50"
          >
            <input 
              :id="`patient-${patient.id}`"
              v-if="sessionType === 'Group'"
              v-model="selectedPatients" 
              :value="patient.id"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              :disabled="selectedPatients.length >= 8 && !selectedPatients.includes(patient.id)"
            >
            <input 
              :id="`patient-${patient.id}`"
              v-else
              v-model="selectedPatientId" 
              :value="patient.id"
              type="radio"
              name="selectedPatient"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            >
            <label :for="`patient-${patient.id}`" class="ml-3 flex-1">
              <div class="font-medium text-gray-900">{{ patient.name }}</div>
              <div class="text-sm text-gray-500">{{ patient.totalPoints }} pts • {{ patient.streak }} streak</div>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Session Controls -->
    <div class="p-6">
      <div v-if="!isRunning" class="space-y-4">
        <!-- Start Session Button -->
        <button 
          @click="startSession"
          :disabled="normalizedSelectedPatients.length === 0 || (sessionType === 'Group' && groupSize > 8)"
          class="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg shadow-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          🎬 Start {{ sessionType }} Session
          <span v-if="normalizedSelectedPatients.length > 0" class="text-sm opacity-90">
            ({{ normalizedSelectedPatients.length }} patient{{ normalizedSelectedPatients.length !== 1 ? 's' : '' }})
          </span>
        </button>
      </div>
      
      <div v-else class="space-y-4">
        <!-- Pause/Resume and Stop Controls -->
        <div class="grid grid-cols-2 gap-4">
          <button 
            @click="togglePause"
            :class="{
              'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700': !isPaused,
              'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700': isPaused
            }"
            class="px-4 py-3 text-white font-bold rounded-lg shadow-lg transition-all duration-200"
          >
            {{ isPaused ? '▶️ Resume' : '⏸️ Pause' }}
          </button>
          
          <button 
            @click="stopSession"
            class="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-lg shadow-lg hover:from-red-600 hover:to-red-700 transition-all duration-200"
          >
            ⏹️ End Session
          </button>
        </div>

        <!-- Session Progress -->
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-gray-700">Session Progress</span>
            <span class="text-sm text-gray-500">{{ Math.floor(elapsedSeconds / 60) }}m {{ elapsedSeconds % 60 }}s</span>
          </div>
          
          <!-- Progress Bar with Unit Markers -->
          <div class="relative">
            <div class="w-full bg-gray-200 rounded-full h-4">
              <div 
                class="bg-gradient-to-r from-blue-400 to-blue-600 h-4 rounded-full transition-all duration-1000"
                :style="{ width: `${Math.min((elapsedSeconds / 3600) * 100, 100)}%` }"
              ></div>
            </div>
            
            <!-- Unit Markers -->
            <div class="flex justify-between mt-2 text-xs text-gray-500">
              <span class="flex flex-col items-center">
                <div class="w-1 h-3" :class="elapsedSeconds >= 480 ? 'bg-green-500' : 'bg-gray-300'"></div>
                8m (Min)
              </span>
              <span class="flex flex-col items-center">
                <div class="w-1 h-3" :class="elapsedSeconds >= 900 ? 'bg-green-500' : 'bg-gray-300'"></div>
                15m (1 unit)
              </span>
              <span class="flex flex-col items-center">
                <div class="w-1 h-3" :class="elapsedSeconds >= 1800 ? 'bg-green-500' : 'bg-gray-300'"></div>
                30m (2 units)
              </span>
              <span class="flex flex-col items-center">
                <div class="w-1 h-3" :class="elapsedSeconds >= 2700 ? 'bg-green-500' : 'bg-gray-300'"></div>
                45m (3 units)
              </span>
              <span class="flex flex-col items-center">
                <div class="w-1 h-3" :class="elapsedSeconds >= 3600 ? 'bg-green-500' : 'bg-gray-300'"></div>
                60m (4 units)
              </span>
            </div>
          </div>
        </div>

        <!-- Real-time Billing Calculation -->
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 class="font-semibold text-blue-900 mb-2">💰 Billing Information</h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-blue-700">H0038 Units: <span class="font-bold">{{ currentUnits }}</span></p>
              <p class="text-blue-700">Rate: <span class="font-bold">$21.16</span> per unit</p>
            </div>
            <div>
              <p class="text-blue-700">Estimated Revenue: <span class="font-bold">${{ (currentUnits * 21.16).toFixed(2) }}</span></p>
              <p class="text-blue-700">Per Patient: <span class="font-bold">${{ ((currentUnits * 21.16) / Math.max(selectedPatients.length, 1)).toFixed(2) }}</span></p>
            </div>
          </div>
          
          <div v-if="sessionType === 'Group' && selectedPatients.length > 1" class="mt-2 text-xs text-blue-600">
            ℹ️ Group session revenue is divided among {{ selectedPatients.length }} participants
          </div>
        </div>
      </div>
    </div>

    <!-- Session History (if any completed sessions) -->
    <div v-if="completedSessions.length > 0" class="border-t border-gray-200 p-6">
      <h4 class="font-semibold text-gray-900 mb-3">📋 Today's Completed Sessions</h4>
      <div class="space-y-2">
        <div 
          v-for="session in completedSessions.slice(0, 3)" 
          :key="session.id"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
        >
          <div>
            <p class="font-medium text-gray-900">{{ session.type }} Session</p>
            <p class="text-gray-500">{{ session.duration }} • {{ session.patients.length }} patient(s)</p>
          </div>
          <div class="text-right">
            <p class="font-semibold text-green-600">{{ session.units }} units</p>
            <p class="text-gray-500">${{ session.revenue.toFixed(2) }}</p>
          </div>
        </div>
      </div>
      
      <!-- Same-day Aggregation Analysis -->
      <div v-if="sameDayAggregation.possible" class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h5 class="font-medium text-yellow-800 mb-2">💡 Same-Day Billing Optimization</h5>
        <p class="text-sm text-yellow-700">
          Combining today's sessions could increase billing:
          <span class="font-bold">{{ sameDayAggregation.individualUnits }} → {{ sameDayAggregation.aggregatedUnits }} units</span>
          (+${{ sameDayAggregation.additionalRevenue.toFixed(2) }})
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SessionTimer',
  emits: ['session-completed'],
  data() {
    return {
      // Timer state
      isRunning: false,
      isPaused: false,
      elapsedSeconds: 0,
      startTime: null,
      pausedTime: 0,
      timerInterval: null,
      
      // Session configuration
      sessionType: 'Individual',
      groupSize: 1,
      selectedPatients: [], // For group sessions (array)
      selectedPatientId: null, // For individual sessions (single value)
      
      // Mock patient data (would come from props/API)
      availablePatients: [
        { id: 1, name: 'David Kim', totalPoints: 75, streak: 3 },
        { id: 2, name: 'Jessica Martinez', totalPoints: 120, streak: 7 },
        { id: 3, name: 'Michael Chen', totalPoints: 50, streak: 2 },
        { id: 4, name: 'Sarah Johnson', totalPoints: 90, streak: 5 },
        { id: 5, name: 'Emma Rodriguez', totalPoints: 45, streak: 1 },
      ],
      
      // Session history
      completedSessions: []
    }
  },
  computed: {
    // Normalize selected patients for both individual and group sessions
    normalizedSelectedPatients() {
      if (this.sessionType === 'Group') {
        return this.selectedPatients;
      } else {
        return this.selectedPatientId ? [this.selectedPatientId] : [];
      }
    },
    
    formattedTime() {
      const hours = Math.floor(this.elapsedSeconds / 3600);
      const minutes = Math.floor((this.elapsedSeconds % 3600) / 60);
      const seconds = this.elapsedSeconds % 60;
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    
    currentUnits() {
      // H0038 billing rules: 8-minute minimum, 15-minute increments
      if (this.elapsedSeconds < 480) return 0; // Less than 8 minutes = 0 units
      
      const minutes = Math.ceil(this.elapsedSeconds / 60);
      const roundedMinutes = Math.round(minutes / 15) * 15;
      return Math.floor(roundedMinutes / 15);
    },
    
    sameDayAggregation() {
      if (this.completedSessions.length === 0) return { possible: false };
      
      const totalIndividualUnits = this.completedSessions.reduce((sum, session) => sum + session.units, 0);
      const totalMinutes = this.completedSessions.reduce((sum, session) => {
        const [mins, secs] = session.duration.split(':').map(Number);
        return sum + mins + (secs / 60);
      }, 0);
      
      const aggregatedUnits = Math.floor(Math.round(totalMinutes / 15) * 15 / 15);
      const additionalRevenue = (aggregatedUnits - totalIndividualUnits) * 21.16;
      
      return {
        possible: aggregatedUnits > totalIndividualUnits,
        individualUnits: totalIndividualUnits,
        aggregatedUnits,
        additionalRevenue: Math.max(additionalRevenue, 0)
      };
    }
  },
  watch: {
    // Reset patient selection when session type changes
    sessionType() {
      this.selectedPatients = [];
      this.selectedPatientId = null;
    }
  },
  
  methods: {
    startSession() {
      if (this.normalizedSelectedPatients.length === 0) return;
      
      this.isRunning = true;
      this.isPaused = false;
      this.startTime = Date.now();
      this.elapsedSeconds = 0;
      this.pausedTime = 0;
      
      // Start the timer interval
      this.timerInterval = setInterval(() => {
        if (!this.isPaused) {
          this.elapsedSeconds = Math.floor((Date.now() - this.startTime - this.pausedTime) / 1000);
        }
      }, 1000);
      
      // Play start sound (optional)
      this.playSound('start');
    },
    
    togglePause() {
      if (this.isPaused) {
        // Resume
        this.pausedTime += Date.now() - this.pauseStartTime;
        this.isPaused = false;
      } else {
        // Pause
        this.pauseStartTime = Date.now();
        this.isPaused = true;
      }
      
      this.playSound('pause');
    },
    
    async stopSession() {
      if (!this.isRunning) return;
      
      // Clear the timer
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      
      // Calculate final session data
      const sessionData = {
        id: Date.now(),
        type: this.sessionType,
        duration: this.formattedTime,
        startTime: this.startTime,
        endTime: Date.now(),
        elapsedSeconds: this.elapsedSeconds,
        units: this.currentUnits,
        revenue: this.currentUnits * 21.16,
        patients: [...this.normalizedSelectedPatients],
        patientCount: this.normalizedSelectedPatients.length
      };
      
      // Add to completed sessions
      this.completedSessions.unshift(sessionData);
      
      // Reset timer state
      this.isRunning = false;
      this.isPaused = false;
      this.elapsedSeconds = 0;
      this.selectedPatients = [];
      this.selectedPatientId = null;
      
      // Award points to patients for session attendance
      await this.awardSessionPoints(sessionData);
      
      // Emit completion event
      this.$emit('session-completed', sessionData);
      
      // Play completion sound
      this.playSound('complete');
      
      // Show completion notification
      this.showCompletionNotification(sessionData);
    },
    
    async awardSessionPoints(sessionData) {
      const basePoints = this.getSessionBasePoints(sessionData.type);
      const bonusPoints = sessionData.units >= 2 ? 10 : 0; // Bonus for longer sessions
      const totalPoints = basePoints + bonusPoints;
      
      for (const patientId of sessionData.patients) {
        try {
          // In real implementation, this would call the canonical API
          console.log(`Awarding ${totalPoints} points to patient ${patientId} for ${sessionData.type} session`);
          
          // Mock API call:
          // await fetch('/api/cm/award', {
          //   method: 'POST',
          //   headers: { 'Content-Type': 'application/json' },
          //   body: JSON.stringify({
          //     canonicalPatientId: patientId,
          //     points: totalPoints,
          //     reason: `${sessionData.type} session attendance (${sessionData.duration})`,
          //     reasonCode: 'session_attendance'
          //   })
          // });
        } catch (error) {
          console.error('Error awarding session points:', error);
        }
      }
    },
    
    getSessionBasePoints(sessionType) {
      const pointsMap = {
        'Individual': 25,
        'Group': 20,
        'Case Management': 15,
        'Crisis Intervention': 35
      };
      return pointsMap[sessionType] || 20;
    },
    
    showCompletionNotification(sessionData) {
      const message = sessionData.units > 0 
        ? `✅ Session completed!\n${sessionData.units} H0038 units earned ($${sessionData.revenue.toFixed(2)})\nPoints awarded to ${sessionData.patientCount} patient(s)`
        : `⚠️ Session completed but was under 8 minutes\nNo billing units earned. Consider same-day aggregation.`;
      
      alert(message);
    },
    
    playSound(type) {
      // Optional: Play audio feedback
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const frequencies = {
        start: 440,   // A4
        pause: 330,   // E4
        complete: 523 // C5
      };
      
      oscillator.frequency.value = frequencies[type] || 440;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  },
  
  beforeUnmount() {
    // Clean up timer if component is destroyed
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}
</script>

<style scoped>
/* Timer animation effects */
.session-timer {
  transition: all 0.3s ease-in-out;
}

/* Pulsing effect for active timer */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.bg-gradient-to-r.from-green-500 {
  animation: pulse 2s infinite;
}

/* Progress bar smooth transitions */
.transition-all {
  transition: all 0.3s ease-in-out;
}

/* Button hover effects */
.hover\:from-green-600:hover {
  background-image: linear-gradient(to right, #059669, #047857);
}

/* Font styling for timer display */
.font-mono {
  font-family: 'Courier New', Courier, monospace;
}

/* Custom scrollbar for patient list */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>