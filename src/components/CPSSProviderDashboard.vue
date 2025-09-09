<template>
  <div class="space-y-8">
    <!-- CPSS Header Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="bg-white rounded-lg p-6 shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">Active Patients</p>
            <p class="text-2xl font-bold text-blue-600">{{ cpssStats.activePatients }}</p>
            <p class="text-gray-400 text-xs">of {{ cpssStats.maxPatients }} max</p>
          </div>
          <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg p-6 shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">This Week's Groups</p>
            <p class="text-2xl font-bold text-green-600">{{ cpssStats.weeklyGroups }}</p>
            <p class="text-gray-400 text-xs">sessions scheduled</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg p-6 shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">Points Awarded</p>
            <p class="text-2xl font-bold text-purple-600">{{ cpssStats.pointsAwarded }}</p>
            <p class="text-gray-400 text-xs">this month</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg p-6 shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">Pending Claims</p>
            <p class="text-2xl font-bold text-orange-600">{{ cpssStats.pendingClaims }}</p>
            <p class="text-gray-400 text-xs">H0038 units</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Acute Care Quick Actions -->
    <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white mb-8">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold mb-2">🏥 Acute Care Patient Onboarding</h2>
          <p class="text-blue-100">Quick eligibility check and enrollment for ED/Inpatient patients</p>
        </div>
        <button 
          @click="showOnboarding = true"
          class="bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors duration-200 flex items-center space-x-2"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span>Start Patient Onboarding</span>
        </button>
      </div>
    </div>

    <!-- Full-Screen Onboarding Modal -->
    <div v-if="showOnboarding" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <div class="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">CPSS Patient Onboarding - Acute Care Setting</h2>
          <button @click="showOnboarding = false" class="text-gray-400 hover:text-gray-600">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="p-0">
          <CPSSPatientOnboarding @return-to-dashboard="showOnboarding = false" />
        </div>
      </div>
    </div>

    <!-- Action Tabs -->
    <div class="bg-white rounded-lg shadow-lg">
      <div class="border-b border-gray-200">
        <nav class="flex space-x-8 px-6">
          <button 
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200',
              activeTab === tab.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            ]"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <div class="p-6">
        <!-- Patient Management Tab -->
        <div v-if="activeTab === 'patients'">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">My Patients</h3>
            <div class="flex space-x-3">
              <button 
                @click="showOnboarding = true"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Bedside Onboarding</span>
              </button>
              <button 
                @click="showAddPatientModal = true"
                class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors duration-200"
              >
                Add Existing Patient
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              v-for="patient in patients" 
              :key="patient.id"
              class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
              @click="selectPatient(patient)"
            >
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-gray-900">{{ patient.name }}</h4>
                <span :class="getStatusBadgeClass(patient.status)">
                  {{ patient.status }}
                </span>
              </div>
              
              <div class="space-y-2 text-sm text-gray-600">
                <div class="flex justify-between">
                  <span>Points:</span>
                  <span class="font-medium">{{ patient.points }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Last Session:</span>
                  <span>{{ patient.lastSession }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Next UDS:</span>
                  <span>{{ patient.nextUDS }}</span>
                </div>
              </div>

              <div class="mt-3 flex space-x-2">
                <button 
                  @click.stop="checkPatientEligibility(patient)"
                  class="flex-1 bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-200"
                >
                  Check Eligibility
                </button>
                <button 
                  @click.stop="startChat(patient)"
                  class="flex-1 bg-green-100 text-green-700 px-3 py-1 rounded text-xs hover:bg-green-200"
                >
                  Message
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Session Management Tab -->
        <div v-if="activeTab === 'sessions'">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">Group Sessions</h3>
            <button 
              @click="showScheduleModal = true"
              class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors duration-200"
            >
              Schedule Session
            </button>
          </div>

          <div class="space-y-4">
            <div 
              v-for="session in upcomingSessions" 
              :key="session.id"
              class="bg-gray-50 rounded-lg p-6"
            >
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h4 class="font-semibold text-gray-900">{{ session.title }}</h4>
                  <p class="text-gray-600">{{ session.date }} at {{ session.time }}</p>
                </div>
                <div class="text-right">
                  <span class="text-sm text-gray-500">{{ session.participants }} participants</span>
                  <br>
                  <span class="text-lg font-semibold text-green-600">${{ session.estimatedRevenue }}</span>
                  <span class="text-sm text-gray-500"> revenue</span>
                </div>
              </div>
              
              <div class="flex flex-wrap gap-2 mb-4">
                <span 
                  v-for="participant in session.participantList" 
                  :key="participant"
                  class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs"
                >
                  {{ participant }}
                </span>
              </div>

              <div class="flex space-x-3">
                <button class="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600">
                  Start Session
                </button>
                <button class="bg-gray-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-600">
                  Edit
                </button>
                <button class="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Points & Tracking Tab -->
        <div v-if="activeTab === 'tracking'">
          <h3 class="text-lg font-semibold text-gray-900 mb-6">Patient Progress Tracking</h3>
          
          <div class="bg-gray-50 rounded-lg p-6">
            <h4 class="font-semibold text-gray-900 mb-4">Award Points</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Select Patient</label>
                <select 
                  v-model="pointsForm.patientId"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select a patient...</option>
                  <option v-for="patient in patients" :key="patient.id" :value="patient.id">
                    {{ patient.name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <select 
                  v-model="pointsForm.reason"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select reason...</option>
                  <option value="group_attendance">Group Session Attendance (+25 pts)</option>
                  <option value="negative_uds">Negative UDS Result (+50 pts)</option>
                  <option value="weekly_checkin">Weekly Check-in (+10 pts)</option>
                  <option value="bonus">Bonus Achievement (+15 pts)</option>
                </select>
              </div>
            </div>

            <div class="mt-4 flex space-x-3">
              <button 
                @click="awardPoints"
                :disabled="!pointsForm.patientId || !pointsForm.reason"
                class="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Award Points
              </button>
              <button 
                @click="resetPointsForm"
                class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import CPSSPatientOnboarding from './CPSSPatientOnboarding.vue'

export default {
  name: 'CPSSProviderDashboard',
  components: {
    CPSSPatientOnboarding
  },
  emits: ['check-eligibility', 'manage-sessions', 'track-patient'],
  setup(props, { emit }) {
    const activeTab = ref('patients')
    const showAddPatientModal = ref(false)
    const showScheduleModal = ref(false)
    const showOnboarding = ref(false)
    
    const tabs = [
      { id: 'patients', label: 'My Patients' },
      { id: 'sessions', label: 'Group Sessions' },
      { id: 'tracking', label: 'Points & Tracking' }
    ]
    
    const cpssStats = ref({
      activePatients: 28,
      maxPatients: 30,
      weeklyGroups: 12,
      pointsAwarded: 1850,
      pendingClaims: 45
    })
    
    const patients = ref([
      {
        id: 1,
        name: 'Jeremy M.',
        status: 'Active',
        points: 150,
        lastSession: '2 days ago',
        nextUDS: 'Sep 15'
      },
      {
        id: 2,
        name: 'Sarah K.',
        status: 'Active',
        points: 280,
        lastSession: 'Today',
        nextUDS: 'Sep 18'
      },
      {
        id: 3,
        name: 'Michael D.',
        status: 'At Risk',
        points: 45,
        lastSession: '1 week ago',
        nextUDS: 'Sep 12'
      },
      {
        id: 4,
        name: 'Lisa R.',
        status: 'New',
        points: 25,
        lastSession: 'Never',
        nextUDS: 'Sep 20'
      }
    ])
    
    const upcomingSessions = ref([
      {
        id: 1,
        title: 'Morning Recovery Group',
        date: 'September 10, 2025',
        time: '10:00 AM',
        participants: 8,
        estimatedRevenue: 169.28, // 8 participants * $21.16
        participantList: ['Jeremy M.', 'Sarah K.', 'Michael D.', 'Lisa R.', 'Tom H.', 'Amy S.', 'David L.', 'Maria G.']
      },
      {
        id: 2,
        title: 'Afternoon Support Group',
        date: 'September 10, 2025',
        time: '2:00 PM',
        participants: 6,
        estimatedRevenue: 126.96,
        participantList: ['Chris B.', 'Nicole P.', 'Robert J.', 'Emma W.', 'James T.', 'Sophia M.']
      }
    ])
    
    const pointsForm = ref({
      patientId: '',
      reason: ''
    })
    
    const getStatusBadgeClass = (status) => {
      const classes = {
        'Active': 'bg-green-100 text-green-800',
        'At Risk': 'bg-red-100 text-red-800',
        'New': 'bg-blue-100 text-blue-800',
        'Inactive': 'bg-gray-100 text-gray-800'
      }
      return `px-2 py-1 rounded-full text-xs font-medium ${classes[status] || classes.Inactive}`
    }
    
    const selectPatient = (patient) => {
      console.log('Selected patient:', patient)
      emit('track-patient', patient)
    }
    
    const checkPatientEligibility = async (patient) => {
      // Mock eligibility check - would call actual API
      console.log('Checking eligibility for:', patient.name)
      emit('check-eligibility', patient)
    }
    
    const startChat = (patient) => {
      console.log('Starting chat with:', patient.name)
      // Open chat interface
    }
    
    const awardPoints = () => {
      if (!pointsForm.value.patientId || !pointsForm.value.reason) return
      
      const pointsMap = {
        'group_attendance': 25,
        'negative_uds': 50,
        'weekly_checkin': 10,
        'bonus': 15
      }
      
      const points = pointsMap[pointsForm.value.reason] || 0
      const patient = patients.value.find(p => p.id == pointsForm.value.patientId)
      
      if (patient) {
        patient.points += points
        console.log(`Awarded ${points} points to ${patient.name}`)
        emit('track-patient', { patient, points, reason: pointsForm.value.reason })
        resetPointsForm()
      }
    }
    
    const resetPointsForm = () => {
      pointsForm.value = {
        patientId: '',
        reason: ''
      }
    }
    
    return {
      activeTab,
      tabs,
      cpssStats,
      patients,
      upcomingSessions,
      pointsForm,
      showAddPatientModal,
      showScheduleModal,
      showOnboarding,
      getStatusBadgeClass,
      selectPatient,
      checkPatientEligibility,
      startChat,
      awardPoints,
      resetPointsForm
    }
  }
}
</script>

<style scoped>
/* Smooth transitions for tab switching */
.tab-content {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Hover effects for patient cards */
.patient-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>