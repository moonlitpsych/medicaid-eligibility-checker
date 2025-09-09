<template>
  <div class="space-y-8">
    <!-- Patient Auth Section -->
    <div v-if="!isAuthenticated" class="max-w-md mx-auto">
      <div class="bg-white rounded-xl shadow-lg p-8">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Patient Login</h3>
          <p class="text-gray-600">Enter your information to access your CM program</p>
        </div>

        <form @submit.prevent="handlePatientLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input 
              v-model="loginForm.firstName"
              type="text" 
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter your first name"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input 
              v-model="loginForm.lastName"
              type="text" 
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter your last name"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input 
              v-model="loginForm.dob"
              type="date" 
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <button 
            type="submit" 
            :disabled="isLoading"
            class="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200 disabled:opacity-50"
          >
            <span v-if="isLoading">Verifying Eligibility...</span>
            <span v-else>Check CM Program Eligibility</span>
          </button>
        </form>

        <div v-if="loginError" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-red-700 text-sm">{{ loginError }}</p>
        </div>
      </div>
    </div>

    <!-- Patient Dashboard -->
    <div v-else class="space-y-6">
      <!-- Welcome Header -->
      <div class="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl text-white p-6">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-bold mb-2">Welcome back, {{ patientData.firstName }}!</h2>
            <p class="text-orange-100">Your CM Program Progress</p>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold">{{ patientData.totalPoints || 0 }}</div>
            <div class="text-orange-100 text-sm">Total Points</div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white rounded-lg p-6 shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-sm">Current Streak</p>
              <p class="text-2xl font-bold text-green-600">{{ patientData.currentStreak || 0 }}</p>
              <p class="text-gray-400 text-xs">days</p>
            </div>
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg p-6 shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-sm">Groups Attended</p>
              <p class="text-2xl font-bold text-blue-600">{{ patientData.groupsAttended || 0 }}</p>
              <p class="text-gray-400 text-xs">this month</p>
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-lg p-6 shadow-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-sm">Next Reward</p>
              <p class="text-2xl font-bold text-purple-600">{{ pointsToNextReward }}</p>
              <p class="text-gray-400 text-xs">points needed</p>
            </div>
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Points Roulette Wheel -->
      <PointsRouletteWheel 
        :available-points="pendingPoints"
        :total-points="patientData.totalPoints || 0"
        @points-awarded="handlePointsAwarded"
      />

      <!-- Action Buttons -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          @click="$emit('chat-with-cpss')"
          class="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-200 text-left"
        >
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Chat with your CPSS</h3>
              <p class="text-gray-500 text-sm">Get support from your care team</p>
            </div>
          </div>
        </button>

        <button 
          @click="checkEligibility"
          class="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-200 text-left"
        >
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">Check Program Status</h3>
              <p class="text-gray-500 text-sm">Verify your CM program eligibility</p>
            </div>
          </div>
        </button>
      </div>

      <!-- Recent Activity -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div class="space-y-4">
          <div v-if="recentActivity.length === 0" class="text-center py-8 text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
            </svg>
            <p>No recent activity yet</p>
            <p class="text-sm">Start attending groups to see your progress here!</p>
          </div>
          
          <div v-for="activity in recentActivity" :key="activity.id" class="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ activity.description }}</p>
              <p class="text-sm text-gray-500">{{ activity.date }}</p>
            </div>
            <div class="text-green-600 font-semibold">+{{ activity.points }} pts</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import PointsRouletteWheel from './PointsRouletteWheel.vue'

export default {
  name: 'CMPatientDashboard',
  components: {
    PointsRouletteWheel
  },
  emits: ['check-eligibility', 'chat-with-cpss'],
  setup(props, { emit }) {
    const isAuthenticated = ref(false)
    const isLoading = ref(false)
    const loginError = ref('')
    
    const loginForm = ref({
      firstName: '',
      lastName: '',
      dob: ''
    })
    
    const patientData = ref({
      firstName: '',
      lastName: '',
      totalPoints: 0,
      currentStreak: 0,
      groupsAttended: 0
    })
    
    const recentActivity = ref([])
    const pendingPoints = ref(75) // Points available for spinning
    
    const pointsToNextReward = computed(() => {
      const currentPoints = patientData.value.totalPoints || 0
      const nextRewardThreshold = Math.ceil(currentPoints / 100) * 100 + 100
      return nextRewardThreshold - currentPoints
    })
    
    const handlePatientLogin = async () => {
      isLoading.value = true
      loginError.value = ''
      
      try {
        // Call eligibility API to verify CM program qualification
        const response = await fetch('/api/medicaid/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            first: loginForm.value.firstName,
            last: loginForm.value.lastName,
            dob: loginForm.value.dob
          })
        })
        
        const result = await response.json()
        
        if (result.enrolled && result.coverage) {
          // Check for mental health FFS coverage (key requirement for CM)
          const hasMentalHealthFFS = result.coverage.some(cov => 
            cov.planDescription.includes('MENTAL HEALTH') && cov.planCode === 'MC'
          )
          
          if (hasMentalHealthFFS) {
            // Patient is eligible for CM program
            patientData.value = {
              firstName: loginForm.value.firstName,
              lastName: loginForm.value.lastName,
              totalPoints: 150, // Mock data
              currentStreak: 7,
              groupsAttended: 12
            }
            
            // Mock recent activity
            recentActivity.value = [
              {
                id: 1,
                description: 'Attended group session',
                date: 'Today, 2:00 PM',
                points: 25
              },
              {
                id: 2,
                description: 'Negative UDS result',
                date: 'Yesterday',
                points: 50
              },
              {
                id: 3,
                description: 'Completed weekly check-in',
                date: 'Sep 7, 2025',
                points: 10
              }
            ]
            
            isAuthenticated.value = true
            emit('check-eligibility', result)
          } else {
            loginError.value = 'You are not currently eligible for the CM program. Your mental health services are managed by an ACO/managed care plan.'
          }
        } else {
          loginError.value = 'Unable to verify Medicaid coverage. Please contact your CPSS for assistance.'
        }
      } catch (error) {
        console.error('Login error:', error)
        loginError.value = 'Unable to verify eligibility. Please try again or contact support.'
      } finally {
        isLoading.value = false
      }
    }
    
    const checkEligibility = () => {
      emit('check-eligibility', patientData.value)
    }
    
    const handlePointsAwarded = async (awardData) => {
      // Add points to patient total
      patientData.value.totalPoints = (patientData.value.totalPoints || 0) + awardData.points
      
      // Reset pending points after spin
      pendingPoints.value = 0
      
      // Add to recent activity
      recentActivity.value.unshift({
        id: Date.now(),
        description: `Points roulette spin - ${awardData.reason}`,
        date: 'Just now',
        points: awardData.points
      })
      
      // Keep only last 5 activities
      if (recentActivity.value.length > 5) {
        recentActivity.value = recentActivity.value.slice(0, 5)
      }
      
      // TODO: Call API to award points officially
      try {
        // await fetch('/api/cm/award', { ... })
        console.log('Points awarded via roulette:', awardData)
      } catch (error) {
        console.error('Error awarding points:', error)
      }
    }
    
    return {
      isAuthenticated,
      isLoading,
      loginError,
      loginForm,
      patientData,
      recentActivity,
      pendingPoints,
      pointsToNextReward,
      handlePatientLogin,
      checkEligibility,
      handlePointsAwarded
    }
  }
}
</script>

<style scoped>
/* Custom animations for dashboard elements */
@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

.bg-gradient-to-r {
  animation: slideUp 0.6s ease-out;
}

.grid > div {
  animation: slideUp 0.6s ease-out;
}

.grid > div:nth-child(1) { animation-delay: 0.1s; }
.grid > div:nth-child(2) { animation-delay: 0.2s; }
.grid > div:nth-child(3) { animation-delay: 0.3s; }
</style>