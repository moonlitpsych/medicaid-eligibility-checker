<template>
  <div class="space-y-8">
    <!-- Admin Overview Stats -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-6">
      <div class="bg-white rounded-lg p-6 shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">Total Patients</p>
            <p class="text-2xl font-bold text-blue-600">{{ adminStats.totalPatients }}</p>
            <p class="text-gray-400 text-xs">enrolled in CM</p>
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
            <p class="text-gray-500 text-sm">Active CPSS</p>
            <p class="text-2xl font-bold text-green-600">{{ adminStats.activeCPSS }}</p>
            <p class="text-gray-400 text-xs">providers</p>
          </div>
          <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg p-6 shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">Monthly Revenue</p>
            <p class="text-2xl font-bold text-purple-600">${{ adminStats.monthlyRevenue.toLocaleString() }}</p>
            <p class="text-gray-400 text-xs">from H0038 claims</p>
          </div>
          <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg p-6 shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">Claims Submitted</p>
            <p class="text-2xl font-bold text-orange-600">{{ adminStats.claimsSubmitted }}</p>
            <p class="text-gray-400 text-xs">this month</p>
          </div>
          <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 5a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 3a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg p-6 shadow-lg">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">Success Rate</p>
            <p class="text-2xl font-bold text-teal-600">{{ adminStats.successRate }}%</p>
            <p class="text-gray-400 text-xs">patient retention</p>
          </div>
          <div class="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Admin Tabs -->
    <div class="bg-white rounded-lg shadow-lg">
      <div class="border-b border-gray-200">
        <nav class="flex space-x-8 px-6">
          <button 
            v-for="tab in adminTabs"
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
        <!-- Patient Enrollment Tab -->
        <div v-if="activeTab === 'enrollment'">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">Patient Enrollment</h3>
            <button 
              @click="showEnrollmentModal = true"
              class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors duration-200"
            >
              Enroll New Patient
            </button>
          </div>

          <div class="bg-gray-50 rounded-lg p-6 mb-6">
            <h4 class="font-semibold text-gray-900 mb-4">Quick Eligibility Check</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input 
                  v-model="eligibilityForm.firstName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Patient's first name"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input 
                  v-model="eligibilityForm.lastName"
                  type="text"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Patient's last name"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input 
                  v-model="eligibilityForm.dob"
                  type="date"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
            
            <div class="mt-4 flex space-x-3">
              <button 
                @click="checkEligibility"
                :disabled="isCheckingEligibility"
                class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <span v-if="isCheckingEligibility">Checking...</span>
                <span v-else>Check CM Eligibility</span>
              </button>
              <button 
                @click="resetEligibilityForm"
                class="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
              >
                Reset
              </button>
            </div>

            <div v-if="eligibilityResult" class="mt-4 p-4 rounded-lg" :class="eligibilityResult.eligible ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
              <div class="flex items-center space-x-2">
                <svg v-if="eligibilityResult.eligible" class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <svg v-else class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                </svg>
                <span :class="eligibilityResult.eligible ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'">
                  {{ eligibilityResult.eligible ? 'CM ELIGIBLE' : 'NOT CM ELIGIBLE' }}
                </span>
              </div>
              <p class="mt-2" :class="eligibilityResult.eligible ? 'text-green-700' : 'text-red-700'">
                {{ eligibilityResult.message }}
              </p>
            </div>
          </div>
        </div>

        <!-- CPSS Management Tab -->
        <div v-if="activeTab === 'cpss'">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">CPSS Management</h3>
            <button 
              @click="showAddCPSSModal = true"
              class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors duration-200"
            >
              Add CPSS Provider
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div 
              v-for="cpss in cpssProviders" 
              :key="cpss.id"
              class="bg-gray-50 rounded-lg p-6"
            >
              <div class="flex items-center justify-between mb-4">
                <h4 class="font-semibold text-gray-900">{{ cpss.name }}</h4>
                <span :class="getCPSSStatusBadge(cpss.status)">
                  {{ cpss.status }}
                </span>
              </div>
              
              <div class="space-y-2 text-sm text-gray-600 mb-4">
                <div class="flex justify-between">
                  <span>Patients:</span>
                  <span class="font-medium">{{ cpss.currentPatients }}/{{ cpss.maxPatients }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Pods:</span>
                  <span class="font-medium">{{ cpss.pods.length }}</span>
                </div>
                <div class="flex justify-between">
                  <span>This Month:</span>
                  <span class="font-medium">${{ cpss.monthlyRevenue.toLocaleString() }}</span>
                </div>
              </div>

              <div class="flex space-x-2">
                <button 
                  @click="manageCPSSPods(cpss)"
                  class="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-200"
                >
                  Manage Pods
                </button>
                <button 
                  @click="viewCPSSDetails(cpss)"
                  class="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Claims Processing Tab -->
        <div v-if="activeTab === 'claims'">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-gray-900">Claims Processing</h3>
            <div class="flex space-x-3">
              <button 
                @click="generateClaims"
                class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200"
              >
                Generate Claims
              </button>
              <button 
                @click="submitToOfficeAlly"
                class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors duration-200"
              >
                Submit to Office Ally
              </button>
            </div>
          </div>

          <div class="bg-gray-50 rounded-lg p-6 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <p class="text-2xl font-bold text-blue-600">{{ claimsStats.pendingUnits }}</p>
                <p class="text-sm text-gray-600">Pending H0038 Units</p>
                <p class="text-xs text-gray-500">${{ (claimsStats.pendingUnits * 21.16).toFixed(2) }}</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-green-600">{{ claimsStats.submittedThisWeek }}</p>
                <p class="text-sm text-gray-600">Submitted This Week</p>
                <p class="text-xs text-gray-500">${{ (claimsStats.submittedThisWeek * 21.16).toFixed(2) }}</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-purple-600">{{ claimsStats.rtmUnits }}</p>
                <p class="text-sm text-gray-600">RTM Units (98980)</p>
                <p class="text-xs text-gray-500">Remote Monitoring</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-orange-600">{{ claimsStats.groupSessions }}</p>
                <p class="text-sm text-gray-600">Group Sessions</p>
                <p class="text-xs text-gray-500">This Week</p>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <h4 class="font-semibold text-gray-900">Recent Claims Activity</h4>
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Code</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="claim in recentClaims" :key="claim.id">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ claim.date }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ claim.provider }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ claim.serviceCode }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ claim.units }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${{ claim.amount }}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span :class="getClaimStatusBadge(claim.status)">
                        {{ claim.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'CMAdminDashboard',
  emits: ['verify-patient', 'manage-cpss', 'process-claims'],
  setup(props, { emit }) {
    const activeTab = ref('enrollment')
    const showEnrollmentModal = ref(false)
    const showAddCPSSModal = ref(false)
    const isCheckingEligibility = ref(false)
    const eligibilityResult = ref(null)
    
    const adminTabs = [
      { id: 'enrollment', label: 'Patient Enrollment' },
      { id: 'cpss', label: 'CPSS Management' },
      { id: 'claims', label: 'Claims Processing' }
    ]
    
    const adminStats = ref({
      totalPatients: 147,
      activeCPSS: 8,
      monthlyRevenue: 31150,
      claimsSubmitted: 89,
      successRate: 87
    })
    
    const eligibilityForm = ref({
      firstName: '',
      lastName: '',
      dob: ''
    })
    
    const cpssProviders = ref([
      {
        id: 1,
        name: 'Sarah Johnson, CPSS',
        status: 'Active',
        currentPatients: 28,
        maxPatients: 30,
        pods: ['Morning Group', 'Evening Support'],
        monthlyRevenue: 5890
      },
      {
        id: 2,
        name: 'Michael Rodriguez, CPSS',
        status: 'Active',
        currentPatients: 25,
        maxPatients: 30,
        pods: ['Recovery Circle', 'Weekend Warriors'],
        monthlyRevenue: 5240
      },
      {
        id: 3,
        name: 'Emily Chen, CPSS',
        status: 'Training',
        currentPatients: 15,
        maxPatients: 30,
        pods: ['New Beginnings'],
        monthlyRevenue: 3150
      }
    ])
    
    const claimsStats = ref({
      pendingUnits: 124,
      submittedThisWeek: 78,
      rtmUnits: 45,
      groupSessions: 23
    })
    
    const recentClaims = ref([
      {
        id: 1,
        date: '2025-09-09',
        provider: 'Sarah J.',
        serviceCode: 'H0038',
        units: 8,
        amount: '169.28',
        status: 'Submitted'
      },
      {
        id: 2,
        date: '2025-09-09',
        provider: 'Michael R.',
        serviceCode: 'H0038-HQ',
        units: 6,
        amount: '126.96',
        status: 'Pending'
      },
      {
        id: 3,
        date: '2025-09-08',
        provider: 'Emily C.',
        serviceCode: '98980',
        units: 1,
        amount: '62.50',
        status: 'Approved'
      }
    ])
    
    const checkEligibility = async () => {
      if (!eligibilityForm.value.firstName || !eligibilityForm.value.lastName || !eligibilityForm.value.dob) {
        return
      }
      
      isCheckingEligibility.value = true
      eligibilityResult.value = null
      
      try {
        const response = await fetch('/api/medicaid/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first: eligibilityForm.value.firstName,
            last: eligibilityForm.value.lastName,
            dob: eligibilityForm.value.dob
          })
        })
        
        const result = await response.json()
        
        if (result.enrolled && result.coverage) {
          const hasMentalHealthFFS = result.coverage.some(cov => 
            cov.planDescription.includes('MENTAL HEALTH') && cov.planCode === 'MC'
          )
          
          eligibilityResult.value = {
            eligible: hasMentalHealthFFS,
            message: hasMentalHealthFFS 
              ? `${eligibilityForm.value.firstName} ${eligibilityForm.value.lastName} is eligible for CM program - Mental Health services in Traditional FFS`
              : `Patient has Medicaid but mental health services are managed by ACO/managed care - not eligible for CM program`
          }
        } else {
          eligibilityResult.value = {
            eligible: false,
            message: 'Patient does not have active Medicaid coverage'
          }
        }
        
        emit('verify-patient', result)
      } catch (error) {
        eligibilityResult.value = {
          eligible: false,
          message: 'Unable to verify eligibility - please try again'
        }
      } finally {
        isCheckingEligibility.value = false
      }
    }
    
    const resetEligibilityForm = () => {
      eligibilityForm.value = { firstName: '', lastName: '', dob: '' }
      eligibilityResult.value = null
    }
    
    const getCPSSStatusBadge = (status) => {
      const classes = {
        'Active': 'bg-green-100 text-green-800',
        'Training': 'bg-yellow-100 text-yellow-800',
        'Inactive': 'bg-gray-100 text-gray-800'
      }
      return `px-2 py-1 rounded-full text-xs font-medium ${classes[status] || classes.Inactive}`
    }
    
    const getClaimStatusBadge = (status) => {
      const classes = {
        'Approved': 'bg-green-100 text-green-800',
        'Submitted': 'bg-blue-100 text-blue-800',
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Rejected': 'bg-red-100 text-red-800'
      }
      return `px-2 py-1 rounded-full text-xs font-medium ${classes[status] || classes.Pending}`
    }
    
    const manageCPSSPods = (cpss) => {
      console.log('Managing pods for:', cpss.name)
      emit('manage-cpss', cpss)
    }
    
    const viewCPSSDetails = (cpss) => {
      console.log('Viewing details for:', cpss.name)
    }
    
    const generateClaims = () => {
      console.log('Generating claims for submission')
      emit('process-claims', { action: 'generate' })
    }
    
    const submitToOfficeAlly = () => {
      console.log('Submitting claims to Office Ally SFTP')
      emit('process-claims', { action: 'submit' })
    }
    
    return {
      activeTab,
      adminTabs,
      adminStats,
      eligibilityForm,
      eligibilityResult,
      isCheckingEligibility,
      cpssProviders,
      claimsStats,
      recentClaims,
      showEnrollmentModal,
      showAddCPSSModal,
      checkEligibility,
      resetEligibilityForm,
      getCPSSStatusBadge,
      getClaimStatusBadge,
      manageCPSSPods,
      viewCPSSDetails,
      generateClaims,
      submitToOfficeAlly
    }
  }
}
</script>

<style scoped>
/* Table styling enhancements */
.table-container {
  overflow-x: auto;
}

/* Enhanced hover effects */
.cpss-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

/* Stats card animations */
.stats-card {
  animation: slideUp 0.6s ease-out forwards;
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(30px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}
</style>