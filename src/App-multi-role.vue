<template>
  <div class="min-h-screen bg-gradient-to-br from-stone-50 via-orange-50/30 to-stone-100">
    <!-- Multi-Role Selection Header -->
    <header class="bg-white border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-orange-400 rounded-full"></div>
              <div class="w-2 h-2 bg-orange-300 rounded-full"></div>
            </div>
            <div>
              <h1 class="text-lg font-medium text-gray-900">moonlit</h1>
              <p class="text-xs text-gray-500 uppercase tracking-wide">CONTINGENCY MANAGEMENT</p>
            </div>
          </div>
          
          <!-- Role Selector -->
          <div class="flex items-center space-x-4">
            <div class="flex bg-gray-100 rounded-lg p-1">
              <button 
                v-for="role in roles" 
                :key="role.id"
                @click="currentRole = role.id"
                :class="[
                  'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200',
                  currentRole === role.id
                    ? 'bg-[#BF9C73] text-white shadow-sm'
                    : 'text-gray-700 hover:text-gray-900'
                ]"
              >
                {{ role.label }}
              </button>
            </div>
            <div class="text-xs text-green-600 font-medium">✓ Office Ally Integration</div>
          </div>
        </div>
      </div>
    </header>

    <!-- Dynamic Role-Based Interface -->
    <div class="max-w-6xl mx-auto px-6 py-8">
      <!-- CM Patient Interface -->
      <div v-if="currentRole === 'patient'">
        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold text-slate-800 mb-4 font-['Newsreader']">
            Contingency Management Program
          </h2>
          <p class="text-xl text-slate-600">
            Earn points for healthy behaviors and connect with your care team
          </p>
        </div>

        <CMPatientDashboard 
          @check-eligibility="handlePatientResult" 
          @chat-with-cpss="handleChatRequest"
        />
      </div>

      <!-- CPSS Provider Portal -->
      <div v-else-if="currentRole === 'cpss'">
        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold text-slate-800 mb-4 font-['Newsreader']">
            CPSS Provider Portal
          </h2>
          <p class="text-xl text-slate-600">
            Manage your CM patients and track their progress
          </p>
        </div>

        <CPSSProviderDashboard />
      </div>

      <!-- CM Admin Interface -->
      <div v-else-if="currentRole === 'admin'">
        <div class="text-center mb-12">
          <h2 class="text-4xl font-bold text-slate-800 mb-4 font-['Newsreader']">
            CM Admin Dashboard
          </h2>
          <p class="text-xl text-slate-600">
            Manage CPSS assignments, patient enrollment, and claims processing
          </p>
        </div>

        <CMAdminDashboard 
          @verify-patient="handlePatientVerification"
          @manage-cpss="handleCPSSManagement"
          @process-claims="handleClaimsProcessing"
        />
      </div>
    </div>

    <!-- Floating Action Button for Quick Actions -->
    <div class="fixed bottom-6 right-6">
      <button 
        @click="showQuickActions = !showQuickActions"
        class="w-14 h-14 bg-[#BF9C73] hover:bg-[#A8875F] text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300"
      >
        <svg v-if="!showQuickActions" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <!-- Quick Actions Menu -->
      <div v-if="showQuickActions" class="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border p-4 w-64">
        <h3 class="font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div class="space-y-2">
          <button @click="quickEligibilityCheck" class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm">
            🔍 Quick CM Eligibility Check
          </button>
          <button @click="openPointsTracker" class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm">
            🎯 Points Tracker
          </button>
          <button @click="openChatWithCPSS" class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm">
            💬 Chat with CPSS
          </button>
          <button @click="viewCMReports" class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm">
            📊 CM Program Reports
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import CMPatientDashboard from './components/CMPatientDashboard.vue'
import CPSSProviderDashboard from './components/CPSSPortal.vue'
import CMAdminDashboard from './components/AdminDashboard.vue'

export default {
  name: 'MultiRoleEligibilitySystem',
  components: {
    CMPatientDashboard,
    CPSSProviderDashboard,
    CMAdminDashboard
  },
  setup() {
    const currentRole = ref('patient')
    const showQuickActions = ref(false)
    
    const roles = [
      { id: 'patient', label: 'Patient Portal' },
      { id: 'cpss', label: 'CPSS Provider' },
      { id: 'admin', label: 'Admin' }
    ]

    // Event handlers for CM-specific actions
    const handlePatientResult = (result) => {
      console.log('Patient CM eligibility result:', result)
      // Handle patient CM enrollment eligibility
    }

    const handleChatRequest = (chatData) => {
      console.log('Patient chat request:', chatData)
      // Open chat interface with CPSS
    }

    const handleEligibilityCheck = (patientData) => {
      console.log('CPSS eligibility check:', patientData)
      // Handle CPSS patient eligibility verification
    }

    const handleSessionManagement = (sessionData) => {
      console.log('CPSS session management:', sessionData)
      // Handle group session scheduling and management
    }

    const handlePatientTracking = (trackingData) => {
      console.log('CPSS patient tracking:', trackingData)
      // Handle patient progress tracking and points management
    }

    const handlePatientVerification = (patientData) => {
      console.log('Admin patient verification:', patientData)
      // Handle admin patient enrollment verification
    }

    const handleCPSSManagement = (cpssData) => {
      console.log('Admin CPSS management:', cpssData)
      // Handle CPSS assignment and pod management
    }

    const handleClaimsProcessing = (claimsData) => {
      console.log('Admin claims processing:', claimsData)
      // Handle H0038 and RTM claims generation and submission
    }

    // CM Quick actions
    const quickEligibilityCheck = () => {
      showQuickActions.value = false
      // Open CM eligibility modal - check mental health FFS coverage
    }

    const openPointsTracker = () => {
      showQuickActions.value = false
      // Open points tracking interface
    }

    const openChatWithCPSS = () => {
      showQuickActions.value = false
      // Open chat interface with assigned CPSS
    }

    const viewCMReports = () => {
      showQuickActions.value = false
      // Navigate to CM program reports view
    }

    return {
      currentRole,
      roles,
      showQuickActions,
      handlePatientResult,
      handleChatRequest,
      handleEligibilityCheck,
      handleSessionManagement,
      handlePatientTracking,
      handlePatientVerification,
      handleCPSSManagement,
      handleClaimsProcessing,
      quickEligibilityCheck,
      openPointsTracker,
      openChatWithCPSS,
      viewCMReports
    }
  }
}
</script>

<style scoped>
/* Import Newsreader font for elegant typography */
@import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap');

/* Smooth transitions */
* {
  transition: all 0.2s ease-in-out;
}

/* Gradient animations */
.bg-gradient-to-br {
  background-size: 400% 400%;
  animation: gradientShift 8s ease infinite;
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>