<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-100">
      <div class="max-w-6xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <!-- Moonlit brand dots -->
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-orange-400 rounded-full"></div>
              <div class="w-2 h-2 bg-orange-300 rounded-full"></div>
            </div>
            <div>
              <h1 class="text-lg font-medium text-gray-900">moonlit</h1>
              <p class="text-xs text-gray-500 uppercase tracking-wide">MEDICAID VERIFICATION</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
            <span class="text-xs text-green-600 font-medium">✓ Live Integration</span>
            <button class="px-4 py-2 bg-stone-400 text-white text-sm font-medium rounded-lg hover:bg-stone-500 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-4xl mx-auto px-6 py-12">
      <!-- Title Section -->
      <div class="text-center mb-12">
        <h2 class="text-4xl font-medium text-gray-900 mb-4">
          What Medicaid coverage do you have?
        </h2>
        <p class="text-lg text-gray-600">
          Enter patient information for real-time eligibility verification
        </p>
      </div>

      <!-- Form Card -->
      <div class="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
        <form @submit.prevent="checkEligibility">
          <div class="space-y-6">
            <!-- Name Fields -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  v-model="form.firstName"
                  type="text"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
                  placeholder="Enter first name"
                  :disabled="loading"
                >
              </div>

              <div>
                <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  v-model="form.lastName"
                  type="text"
                  required
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
                  placeholder="Enter last name"
                  :disabled="loading"
                >
              </div>
            </div>

            <!-- Date of Birth -->
            <div>
              <label for="dateOfBirth" class="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                id="dateOfBirth"
                v-model="form.dateOfBirth"
                type="date"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
                :disabled="loading"
              >
            </div>

            <!-- Optional Fields -->
            <div class="pt-6 border-t border-gray-200">
              <h3 class="text-sm font-medium text-gray-700 mb-4">
                Additional Information (Optional)
              </h3>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="ssn" class="block text-sm font-medium text-gray-700 mb-2">
                    Social Security Number
                  </label>
                  <input
                    id="ssn"
                    v-model="form.ssn"
                    type="text"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
                    placeholder="XXX-XX-XXXX (optional)"
                    maxlength="11"
                    :disabled="loading"
                    @input="formatSSN"
                  >
                </div>

                <div>
                  <label for="medicaidId" class="block text-sm font-medium text-gray-700 mb-2">
                    Medicaid ID
                  </label>
                  <input
                    id="medicaidId"
                    v-model="form.medicaidId"
                    type="text"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-colors"
                    placeholder="If known (optional)"
                    :disabled="loading"
                  >
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <div class="pt-6">
              <button
                type="submit"
                class="w-full px-6 py-4 bg-stone-400 text-white text-base font-medium rounded-lg hover:bg-stone-500 transition-colors flex items-center justify-center space-x-2"
                :disabled="loading"
              >
                <span v-if="loading" class="loading-spinner"></span>
                <span>{{ loading ? 'Checking eligibility...' : 'Check Eligibility' }}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div class="loading-spinner mx-auto mb-4"></div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Verifying Eligibility...</h3>
        <p class="text-gray-600">Contacting Office Ally clearinghouse</p>
        <p class="text-sm text-gray-500 mt-2">This typically takes less than 1 second</p>
      </div>

      <!-- Results -->
      <div v-if="result && !loading" class="bg-white rounded-2xl border border-gray-200 p-8">
        <!-- Success Header -->
        <div v-if="result.enrolled" class="flex items-center space-x-4 mb-8">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 class="text-2xl font-medium text-gray-900">Patient is Enrolled!</h3>
            <p class="text-gray-600">{{ result.program }}</p>
          </div>
        </div>

        <!-- Error Header -->
        <div v-else class="flex items-center space-x-4 mb-8">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 class="text-2xl font-medium text-gray-900">Patient Not Enrolled</h3>
            <p class="text-gray-600">{{ result.error }}</p>
          </div>
        </div>

        <!-- Plan Details -->
        <div v-if="result.enrolled" class="space-y-6">
          <!-- Primary Plan Information -->
          <div class="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <h4 class="text-lg font-medium text-orange-900 mb-4">Primary Plan Information</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div class="text-sm font-medium text-orange-700">Plan Type</div>
                <div class="text-orange-900 font-medium">{{ result.planType || 'Standard Medicaid' }}</div>
              </div>
              <div v-if="result.medicaidId">
                <div class="text-sm font-medium text-orange-700">Medicaid ID</div>
                <div class="text-orange-900 font-mono text-sm">{{ result.medicaidId }}</div>
              </div>
              <div>
                <div class="text-sm font-medium text-orange-700">Effective Date</div>
                <div class="text-orange-900 font-medium">{{ result.effectiveDate }}</div>
              </div>
            </div>
          </div>

          <!-- Address Information -->
          <div v-if="result.address && result.address.street" class="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h4 class="text-sm font-medium text-gray-700 mb-3">Address on File</h4>
            <div class="text-gray-900">
              <div>{{ result.address.street }}</div>
              <div>{{ result.address.city }}, {{ result.address.state }} {{ result.address.zip }}</div>
            </div>
          </div>

          <!-- Coverage Details -->
          <div v-if="result.coverage && result.coverage.length > 0">
            <h4 class="text-lg font-medium text-gray-900 mb-4">Active Coverage Details</h4>
            <div class="space-y-3">
              <div 
                v-for="(coverage, index) in result.coverage.filter(c => c.isActive)" 
                :key="index"
                class="bg-green-50 border border-green-200 rounded-xl p-4"
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

          <!-- Transportation -->
          <div v-if="result.transportation" class="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <h4 class="text-sm font-medium text-yellow-800 mb-2">Transportation Provider</h4>
            <div class="text-yellow-900">
              <strong>{{ result.transportation.company }}</strong>
              <span v-if="result.transportation.id" class="ml-2 text-sm">(ID: {{ result.transportation.id }})</span>
            </div>
          </div>
        </div>

        <!-- System Details -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-gray-200">
          <div class="text-center">
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wide">Patient</div>
            <div class="text-sm text-gray-900 font-medium mt-1">{{ form.firstName }} {{ form.lastName }}</div>
          </div>
          
          <div class="text-center">
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wide">Response Time</div>
            <div class="text-sm text-gray-900 font-medium mt-1">{{ responseTime }}ms</div>
          </div>
          
          <div class="text-center">
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</div>
            <div class="text-sm text-gray-900 font-medium mt-1">{{ result.verified ? 'Office Ally' : 'Simulation' }}</div>
          </div>
          
          <div class="text-center">
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wide">Cost</div>
            <div class="text-sm text-gray-900 font-medium mt-1">${{ result.verified ? '0.10' : '0.00' }}</div>
          </div>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="mt-12 text-center">
        <p class="text-gray-600 text-sm leading-relaxed">
          Can't find what you're looking for? We're always adding new features.
        </p>
        <p class="text-gray-600 text-sm">
          Contact us at <a href="mailto:hello@trymoonlit.com" class="text-orange-600 hover:text-orange-700">hello@trymoonlit.com</a> for assistance.
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
.loading-spinner {
  @apply inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin;
}
</style>