<template>
  <div class="roulette-container bg-white rounded-lg shadow-lg p-6">
    <div class="text-center mb-6">
      <h3 class="text-xl font-bold text-gray-900 mb-2">🎯 Points Roulette</h3>
      <p class="text-gray-600 text-sm">Spin the wheel to claim your earned points!</p>
    </div>

    <!-- Roulette Wheel -->
    <div class="flex justify-center mb-6">
      <div class="relative">
        <!-- Wheel Container -->
        <div 
          class="w-64 h-64 rounded-full border-8 border-gray-300 relative overflow-hidden shadow-2xl transition-transform duration-3000 ease-out"
          :style="{ transform: `rotate(${wheelRotation}deg)` }"
          ref="wheel"
        >
          <!-- Wheel Sections -->
          <div 
            v-for="(section, index) in wheelSections" 
            :key="index"
            class="absolute w-full h-full"
            :style="getSectionStyle(index)"
          >
            <div class="absolute inset-0 flex items-center justify-center">
              <div 
                class="text-white font-bold text-sm transform"
                :style="{ 
                  transform: `rotate(${(index * (360 / wheelSections.length)) + (360 / wheelSections.length / 2)}deg)`,
                  transformOrigin: 'center'
                }"
              >
                <div class="transform -rotate-90">
                  {{ section.label }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Wheel Pointer -->
        <div class="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
          <div class="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-red-500"></div>
        </div>
        
        <!-- Center Circle -->
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full border-4 border-gray-400 z-10"></div>
      </div>
    </div>

    <!-- Points Available -->
    <div class="text-center mb-6">
      <div class="inline-flex items-center px-4 py-2 bg-purple-100 rounded-lg">
        <svg class="w-5 h-5 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span class="font-semibold text-purple-900">{{ availablePoints }} Points Ready to Spin</span>
      </div>
    </div>

    <!-- Spin Button -->
    <div class="text-center mb-6">
      <button 
        @click="spinWheel"
        :disabled="spinning || availablePoints === 0"
        class="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <span v-if="spinning" class="flex items-center justify-center">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Spinning...
        </span>
        <span v-else-if="availablePoints > 0">🎲 SPIN THE WHEEL!</span>
        <span v-else>🎯 Complete Activities to Spin</span>
      </button>
    </div>

    <!-- Last Spin Result -->
    <div v-if="lastSpinResult" class="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
      <div class="mb-2">
        <span class="text-2xl">🎉</span>
      </div>
      <p class="text-green-800 font-semibold text-lg">
        {{ lastSpinResult.message }}
      </p>
      <p class="text-green-600 text-sm mt-1">
        You earned {{ lastSpinResult.points }} points!
      </p>
      <div class="mt-3">
        <div class="inline-flex items-center px-3 py-1 bg-green-100 rounded-full">
          <span class="text-green-800 font-medium">Total Points: {{ totalPoints }}</span>
        </div>
      </div>
    </div>

    <!-- Recent Spins History -->
    <div v-if="spinHistory.length > 0" class="mt-6">
      <h4 class="text-sm font-semibold text-gray-700 mb-3">Recent Spins</h4>
      <div class="space-y-2">
        <div 
          v-for="spin in spinHistory.slice(0, 3)" 
          :key="spin.id"
          class="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
        >
          <span class="text-gray-600">{{ spin.time }}</span>
          <span class="font-medium text-purple-600">+{{ spin.points }} pts</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PointsRouletteWheel',
  props: {
    availablePoints: {
      type: Number,
      default: 0
    },
    totalPoints: {
      type: Number,
      default: 0
    }
  },
  emits: ['points-awarded'],
  data() {
    return {
      wheelRotation: 0,
      spinning: false,
      lastSpinResult: null,
      spinHistory: [],
      wheelSections: [
        { label: '+5', color: '#ef4444', points: 5 },     // Red
        { label: '+10', color: '#f97316', points: 10 },    // Orange
        { label: '+15', color: '#eab308', points: 15 },    // Yellow
        { label: '+20', color: '#22c55e', points: 20 },    // Green
        { label: '+25', color: '#06b6d4', points: 25 },    // Cyan
        { label: '+30', color: '#3b82f6', points: 30 },    // Blue
        { label: '+35', color: '#8b5cf6', points: 35 },    // Purple
        { label: 'BONUS!', color: '#ec4899', points: 50 }  // Pink
      ]
    }
  },
  methods: {
    getSectionStyle(index) {
      const sectionAngle = 360 / this.wheelSections.length;
      const startAngle = index * sectionAngle;
      
      return {
        background: `conic-gradient(from ${startAngle}deg, ${this.wheelSections[index].color} 0deg, ${this.wheelSections[index].color} ${sectionAngle}deg, transparent ${sectionAngle}deg)`,
        clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos(((startAngle + sectionAngle) - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin(((startAngle + sectionAngle) - 90) * Math.PI / 180)}%)`
      };
    },

    async spinWheel() {
      if (this.spinning || this.availablePoints === 0) return;
      
      this.spinning = true;
      this.lastSpinResult = null;
      
      // Generate random rotation (4-6 full rotations + random final position)
      const minRotations = 4;
      const maxRotations = 6;
      const rotations = minRotations + Math.random() * (maxRotations - minRotations);
      const finalPosition = Math.random() * 360;
      const totalRotation = this.wheelRotation + (rotations * 360) + finalPosition;
      
      this.wheelRotation = totalRotation;
      
      // Calculate which section was landed on
      const normalizedRotation = (360 - (totalRotation % 360)) % 360;
      const sectionSize = 360 / this.wheelSections.length;
      const sectionIndex = Math.floor(normalizedRotation / sectionSize);
      const landedSection = this.wheelSections[sectionIndex];
      
      // Wait for animation to complete
      setTimeout(() => {
        this.spinning = false;
        
        // Determine bonus multiplier based on points spun
        let pointsMultiplier = 1;
        if (this.availablePoints >= 50) {
          pointsMultiplier = 2; // Double points for high earners
        }
        
        const finalPoints = landedSection.points * pointsMultiplier;
        
        this.lastSpinResult = {
          message: landedSection.label === 'BONUS!' 
            ? `Bonus Points${pointsMultiplier > 1 ? ' x' + pointsMultiplier : ''}!` 
            : `You landed on ${landedSection.label}${pointsMultiplier > 1 ? ' (x' + pointsMultiplier + ' bonus!)' : ''}`,
          points: finalPoints,
          section: landedSection.label
        };
        
        // Add to spin history
        this.spinHistory.unshift({
          id: Date.now(),
          time: new Date().toLocaleTimeString(),
          points: finalPoints,
          section: landedSection.label
        });
        
        // Keep only last 10 spins
        if (this.spinHistory.length > 10) {
          this.spinHistory = this.spinHistory.slice(0, 10);
        }
        
        // Emit points awarded event
        this.$emit('points-awarded', {
          points: finalPoints,
          reason: `Roulette spin: ${landedSection.label}`,
          multiplier: pointsMultiplier
        });
        
      }, 3000); // 3 second animation
    }
  }
}
</script>

<style scoped>
.duration-3000 {
  transition-duration: 3000ms;
}

.roulette-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background: white;
  border: 2px solid #f3f4f6;
}

/* Wheel spin animation */
.transition-transform {
  transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1);
}

/* Pulsing effect for spin button */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Hover effects */
.hover\:scale-105:hover {
  transform: scale(1.05);
}

.active\:scale-95:active {
  transform: scale(0.95);
}

/* Section styling improvements */
.w-64.h-64 {
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.1), 
    0 10px 10px -5px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
</style>