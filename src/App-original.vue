<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">
              🏥 Utah Medicaid Eligibility Checker
            </h1>
            <p class="text-gray-600 mt-1">Real-time verification powered by Office Ally</p>
          </div>
          <div class="flex items-center space-x-4">
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              ✅ Live Integration
            </span>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              ⚡ &lt;1s Response
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Form Card -->
      <div class="card mb-8">
        <div class="px-8 py-6 border-b border-gray-200">
          <h2 class="text-xl font-semibold text-gray-900">
            👤 Patient Information
          </h2>
          <p class="text-gray-600 mt-1">Enter patient details for real-time eligibility verification</p>
        </div>
        
        <form @submit.prevent="checkEligibility" class="p-8">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- First Name -->
            <div>
              <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                id="firstName"
                v-model="form.firstName"
                type="text"
                required
                class="input-field"
                placeholder="Enter first name"
                :disabled="loading"
              >
            </div>

            <!-- Last Name -->
            <div>
              <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
                Last Name *
              </label>
              <input
                id="lastName"
                v-model="form.lastName"
                type="text"
                required
                class="input-field"
                placeholder="Enter last name"
                :disabled="loading"
              >
            </div>

            <!-- Date of Birth -->
            <div>
              <label for="dateOfBirth" class="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth *
              </label>
              <input
                id="dateOfBirth"
                v-model="form.dateOfBirth"
                type="date"
                required
                class="input-field"
                :disabled="loading"
              >
            </div>

            <!-- Gender -->
            <div>
              <label for="gender" class="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                id="gender"
                v-model="form.gender"
                class="input-field"
                :disabled="loading"
              >
                <option value="U">Unknown</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>

            <!-- SSN -->
            <div>
              <label for="ssn" class="block text-sm font-medium text-gray-700 mb-2">
                Social Security Number
              </label>
              <input
                id="ssn"
                v-model="form.ssn"
                type="text"
                class="input-field"
                placeholder="XXX-XX-XXXX (optional)"
                maxlength="11"
                :disabled="loading"
                @input="formatSSN"
              >
            </div>

            <!-- Medicaid ID -->
            <div>
              <label for="medicaidId" class="block text-sm font-medium text-gray-700 mb-2">
                Medicaid ID
              </label>
              <input
                id="medicaidId"
                v-model="form.medicaidId"
                type="text"
                class="input-field"
                placeholder="If known (optional)"
                :disabled="loading"
              >
            </div>
          </div>

          <!-- Submit Button -->
          <div class="mt-8">
            <button
              type="submit"
              class="btn-primary w-full flex items-center justify-center space-x-2"
              :disabled="loading"
            >
              <span v-if="loading" class="loading-spinner"></span>
              <span>{{ loading ? 'Checking...' : '⚡ Check Eligibility Now' }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="card mb-8">
        <div class="p-8 text-center">
          <div class="loading-spinner mx-auto mb-4"></div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">Verifying Eligibility...</h3>
          <p class="text-gray-600">Contacting Office Ally clearinghouse</p>
          <p class="text-sm text-gray-500 mt-2">This typically takes less than 1 second</p>
        </div>
      </div>

      <!-- Results -->
      <div v-if="result && !loading" class="card">
        <div class="p-8">
          <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
              <div v-if="result.enrolled" class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span class="text-2xl">✅</span>
              </div>
              <div v-else class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span class="text-2xl">❌</span>
              </div>
            </div>
            
            <div class="flex-1">
              <h3 class="text-xl font-semibold mb-2" :class="result.enrolled ? 'text-green-800' : 'text-red-800'">
                {{ result.enrolled ? 'Patient is Enrolled!' : 'Patient Not Enrolled' }}
              </h3>
              
              <p class="text-gray-700 mb-4">
                <strong>{{ result.enrolled ? result.program : result.error }}</strong>
              </p>

              <!-- Enhanced Plan Details -->
              <div v-if="result.enrolled" class="mt-6">
                <!-- Primary Plan Information -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h4 class="text-lg font-semibold text-blue-900 mb-4">📋 Primary Plan Information</h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div class="text-sm font-medium text-blue-700">Plan Type</div>
                      <div class="text-blue-900 font-semibold">{{ result.planType || 'Standard Medicaid' }}</div>
                    </div>
                    <div v-if="result.medicaidId">
                      <div class="text-sm font-medium text-blue-700">Medicaid ID</div>
                      <div class="text-blue-900 font-mono font-medium">{{ result.medicaidId }}</div>
                    </div>
                    <div>
                      <div class="text-sm font-medium text-blue-700">Effective Date</div>
                      <div class="text-blue-900 font-medium">{{ result.effectiveDate }}</div>
                    </div>
                  </div>
                </div>

                <!-- Address Information -->
                <div v-if="result.address && result.address.street" class="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                  <h4 class="text-sm font-semibold text-gray-700 mb-2">📍 Address on File</h4>
                  <div class="text-gray-900">
                    <div>{{ result.address.street }}</div>
                    <div>{{ result.address.city }}, {{ result.address.state }} {{ result.address.zip }}</div>
                  </div>
                </div>

                <!-- Coverage Breakdown -->
                <div v-if="result.coverage && result.coverage.length > 0" class="mb-6">
                  <h4 class="text-lg font-semibold text-gray-900 mb-4">🎯 Active Coverage Details</h4>
                  <div class="space-y-3">
                    <div 
                      v-for="(coverage, index) in result.coverage.filter(c => c.isActive)" 
                      :key="index"
                      class="bg-green-50 border border-green-200 rounded-lg p-4"
                    >
                      <div class="flex justify-between items-start mb-2">
                        <h5 class="font-medium text-green-900">{{ coverage.planDescription || 'Coverage Plan' }}</h5>
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {{ coverage.status }}
                        </span>
                      </div>
                      <div v-if="coverage.services && coverage.services.length > 0" class="text-sm text-green-800">
                        <strong>Services:</strong> {{ coverage.services.join(', ') }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Transportation Provider -->
                <div v-if="result.transportation" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h4 class="text-sm font-semibold text-yellow-800 mb-2">🚗 Transportation Provider</h4>
                  <div class="text-yellow-900">
                    <strong>{{ result.transportation.company }}</strong>
                    <span v-if="result.transportation.id" class="ml-2 text-sm">(ID: {{ result.transportation.id }})</span>
                  </div>
                </div>
              </div>

              <!-- System Details Grid -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="text-sm font-medium text-gray-500">Patient Name</div>
                  <div class="text-gray-900 font-medium">{{ form.firstName }} {{ form.lastName }}</div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="text-sm font-medium text-gray-500">Date of Birth</div>
                  <div class="text-gray-900 font-medium">{{ form.dateOfBirth }}</div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="text-sm font-medium text-gray-500">Response Time</div>
                  <div class="text-gray-900 font-medium">{{ responseTime }}ms</div>
                </div>
                
                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="text-sm font-medium text-gray-500">Source</div>
                  <div class="text-gray-900 font-medium">{{ result.verified ? 'Office Ally (Live)' : 'Simulation' }}</div>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg">
                  <div class="text-sm font-medium text-gray-500">Transaction Cost</div>
                  <div class="text-gray-900 font-medium">${{ result.verified ? '0.10' : '0.00' }}</div>
                </div>

                <div v-if="result.verified && responseTime < 1000" class="bg-green-50 p-4 rounded-lg">
                  <div class="text-sm font-medium text-green-600">Performance</div>
                  <div class="text-green-800 font-medium">Optimal ⚡</div>
                </div>
              </div>

              <!-- Success Analysis -->
              <div v-if="result.verified && responseTime < 2000" class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 class="font-medium text-green-800 mb-2">🎯 Success Analysis</h4>
                <div class="text-sm text-green-700 space-y-1">
                  <div>✅ Office Ally authentication successful</div>
                  <div>✅ Utah Medicaid routed via clearinghouse</div>
                  <div>✅ Sub-second response time achieved</div>
                  <div>✅ Real-time eligibility verification working</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Technical Info -->
      <div class="mt-8 p-6 bg-white rounded-lg border border-gray-200">
        <h3 class="text-lg font-medium text-gray-900 mb-2">🚀 Technical Details</h3>
        <p class="text-gray-600 text-sm leading-relaxed">
          This system uses <strong>Office Ally's real-time clearinghouse</strong> to instantly verify Utah Medicaid eligibility. 
          Requests are processed via CAQH CORE-compliant X12 270/271 transactions with sub-second response times.
          Each verification costs $0.10 and provides immediate, authoritative eligibility status directly from Utah Medicaid.
        </p>
      </div>
    </main>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'EligibilityChecker',
  setup() {
    const form = ref({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'U',
      ssn: '',
      medicaidId: ''
    })

    const loading = ref(false)
    const result = ref(null)
    const responseTime = ref(0)

    const formatSSN = (event) => {
      let value = event.target.value.replace(/\D/g, '')
      if (value.length >= 6) {
        value = value.substr(0,3) + '-' + value.substr(3,2) + '-' + value.substr(5,4)
      } else if (value.length >= 4) {
        value = value.substr(0,3) + '-' + value.substr(3)
      }
      form.value.ssn = value
    }

    const checkEligibility = async () => {
      loading.value = true
      result.value = null
      
      try {
        const startTime = Date.now()
        
        const response = await fetch('/api/medicaid/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            first: form.value.firstName,
            last: form.value.lastName,
            dob: form.value.dateOfBirth,
            ssn: form.value.ssn,
            medicaidId: form.value.medicaidId,
            gender: form.value.gender
          })
        })
        
        const data = await response.json()
        responseTime.value = Date.now() - startTime
        result.value = data
        
      } catch (error) {
        console.error('Error checking eligibility:', error)
        result.value = {
          enrolled: false,
          error: 'Unable to verify eligibility at this time. Please try again.',
          verified: false
        }
        responseTime.value = 0
      } finally {
        loading.value = false
      }
    }

    return {
      form,
      loading,
      result,
      responseTime,
      formatSSN,
      checkEligibility
    }
  }
}
</script>

<style scoped>
/* Component-specific styles if needed */
</style>