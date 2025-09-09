<template>
  <div class="max-w-4xl mx-auto">
    <!-- Enhanced Patient Form with Insurance Guidance -->
    <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
      <form @submit.prevent="checkEligibility">
        <div class="space-y-6">
          <!-- Personal Information Section -->
          <div class="border-b border-stone-200 pb-6">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">Personal Information</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label for="firstName" class="block text-sm font-medium text-slate-700 mb-2">
                  First Name *
                </label>
                <input
                  id="firstName"
                  v-model="form.firstName"
                  type="text"
                  required
                  class="w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200"
                  placeholder="Enter first name"
                  :disabled="loading"
                >
              </div>

              <div>
                <label for="lastName" class="block text-sm font-medium text-slate-700 mb-2">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  v-model="form.lastName"
                  type="text"
                  required
                  class="w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200"
                  placeholder="Enter last name"
                  :disabled="loading"
                >
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label for="dateOfBirth" class="block text-sm font-medium text-slate-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  id="dateOfBirth"
                  v-model="form.dateOfBirth"
                  type="date"
                  required
                  class="w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200"
                  :disabled="loading"
                >
              </div>

              <div>
                <label for="gender" class="block text-sm font-medium text-slate-700 mb-2">
                  Gender
                </label>
                <select
                  id="gender"
                  v-model="form.gender"
                  class="w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200"
                  :disabled="loading"
                >
                  <option value="">Select (Optional)</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="U">Prefer not to specify</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Insurance Information Section -->
          <div class="border-b border-stone-200 pb-6">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">Insurance Information</h3>
            
            <!-- Insurance Type Selector -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-slate-700 mb-3">
                What type of insurance do you have? *
              </label>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  v-for="insurance in insuranceTypes" 
                  :key="insurance.id"
                  @click="selectInsuranceType(insurance)"
                  :class="[\n                    'border-2 rounded-xl p-4 cursor-pointer transition-all duration-200',\n                    selectedInsuranceType?.id === insurance.id\n                      ? 'border-orange-300 bg-orange-50'\n                      : 'border-stone-200 hover:border-orange-200 bg-white'\n                  ]\"\n                >\n                  <div class=\"text-center\">\n                    <div class=\"text-2xl mb-2\">{{ insurance.icon }}</div>\n                    <h4 class=\"font-semibold text-slate-800 mb-1\">{{ insurance.name }}</h4>\n                    <p class=\"text-sm text-slate-600\">{{ insurance.description }}</p>\n                    <div v-if=\"insurance.networkStatus\" class=\"mt-2\">\n                      <span :class=\"[\n                        'text-xs px-2 py-1 rounded-full',\n                        insurance.networkStatus === 'in-network' \n                          ? 'bg-green-100 text-green-800'\n                          : insurance.networkStatus === 'pending'\n                          ? 'bg-yellow-100 text-yellow-800' \n                          : 'bg-gray-100 text-gray-800'\n                      ]\">\n                        {{ insurance.networkStatus === 'in-network' ? '✅ In Network' : \n                           insurance.networkStatus === 'pending' ? '⏳ Pending' : '❓ Unknown' }}\n                      </span>\n                    </div>\n                  </div>\n                </div>\n              </div>\n            </div>\n\n            <!-- Insurance Details Fields -->\n            <div v-if=\"selectedInsuranceType\" class=\"space-y-4\">\n              <div>\n                <label for=\"insuranceName\" class=\"block text-sm font-medium text-slate-700 mb-2\">\n                  Insurance Plan Name\n                </label>\n                <input\n                  id=\"insuranceName\"\n                  v-model=\"form.insuranceName\"\n                  type=\"text\"\n                  class=\"w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200\"\n                  :placeholder=\"selectedInsuranceType.placeholder\"\n                  :disabled=\"loading\"\n                >\n              </div>\n\n              <div>\n                <label for=\"memberId\" class=\"block text-sm font-medium text-slate-700 mb-2\">\n                  Member/Policy ID\n                  <span class=\"text-slate-500 font-normal\">({{ selectedInsuranceType.idRequired ? 'required' : 'recommended' }})</span>\n                </label>\n                <input\n                  id=\"memberId\"\n                  v-model=\"form.memberId\"\n                  type=\"text\"\n                  class=\"w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200\"\n                  placeholder=\"Enter your member ID from insurance card\"\n                  :disabled=\"loading\"\n                  :required=\"selectedInsuranceType.idRequired\"\n                >\n              </div>\n            </div>\n          </div>\n\n          <!-- Contact Information (Optional for Booking) -->\n          <div class=\"pb-6\">\n            <h3 class=\"text-lg font-semibold text-slate-800 mb-4\">\n              Contact Information \n              <span class=\"text-sm font-normal text-slate-600\">(for appointment booking)</span>\n            </h3>\n            <div class=\"grid grid-cols-1 md:grid-cols-2 gap-6\">\n              <div>\n                <label for=\"email\" class=\"block text-sm font-medium text-slate-700 mb-2\">\n                  Email Address\n                </label>\n                <input\n                  id=\"email\"\n                  v-model=\"form.email\"\n                  type=\"email\"\n                  class=\"w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200\"\n                  placeholder=\"your@email.com\"\n                  :disabled=\"loading\"\n                >\n              </div>\n\n              <div>\n                <label for=\"phone\" class=\"block text-sm font-medium text-slate-700 mb-2\">\n                  Phone Number\n                </label>\n                <input\n                  id=\"phone\"\n                  v-model=\"form.phone\"\n                  type=\"tel\"\n                  class=\"w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-4 px-6 text-lg text-slate-800 placeholder-slate-500 focus:outline-none focus:border-orange-300 focus:bg-white transition-all duration-200\"\n                  placeholder=\"(555) 123-4567\"\n                  :disabled=\"loading\"\n                >\n              </div>\n            </div>\n          </div>\n\n          <!-- Submit Button -->\n          <div class=\"pt-6\">\n            <button\n              type=\"submit\"\n              class=\"w-full px-6 py-4 bg-[#BF9C73] text-white text-lg font-semibold rounded-xl hover:bg-[#A8875F] transition-colors flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed\"\n              :disabled=\"loading || !canSubmit\"\n            >\n              <svg v-if=\"loading\" class=\"animate-spin h-5 w-5 text-white\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\">\n                <circle class=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" stroke-width=\"4\"></circle>\n                <path class=\"opacity-75\" fill=\"currentColor\" d=\"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z\"></path>\n              </svg>\n              <span>{{ loading ? 'Checking your coverage...' : 'Check My Insurance Coverage' }}</span>\n            </button>\n          </div>\n        </div>\n      </form>\n    </div>\n\n    <!-- Loading State -->\n    <div v-if=\"loading\" class=\"bg-white rounded-2xl shadow-xl p-8 text-center mb-8\">\n      <div class=\"flex justify-center mb-4\">\n        <svg class=\"animate-spin h-12 w-12 text-orange-400\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24\">\n          <circle class=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" stroke-width=\"4\"></circle>\n          <path class=\"opacity-75\" fill=\"currentColor\" d=\"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z\"></path>\n        </svg>\n      </div>\n      <h3 class=\"text-xl font-semibold text-slate-800 mb-2\">Verifying your coverage...</h3>\n      <p class=\"text-slate-600\">Checking with Office Ally real-time verification system</p>\n      <p class=\"text-sm text-slate-500 mt-2\">This usually takes just a moment</p>\n    </div>\n\n    <!-- Results Display -->\n    <div v-if=\"result && !loading\">\n      <EligibilityResult \n        :result=\"result\" \n        :patient-info=\"form\"\n        @book-appointment=\"$emit('book-appointment', $event)\"\n        @request-help=\"handleRequestHelp\"\n      />\n    </div>\n  </div>\n</template>\n\n<script>\nimport { ref, computed } from 'vue'\nimport EligibilityResult from './EligibilityResult.vue'\n\nexport default {\n  name: 'PatientEligibilityForm',\n  components: {\n    EligibilityResult\n  },\n  emits: ['result', 'book-appointment'],\n  setup(props, { emit }) {\n    const form = ref({\n      firstName: '',\n      lastName: '',\n      dateOfBirth: '',\n      gender: '',\n      insuranceName: '',\n      memberId: '',\n      email: '',\n      phone: ''\n    })\n\n    const loading = ref(false)\n    const result = ref(null)\n    const selectedInsuranceType = ref(null)\n    \n    const insuranceTypes = [\n      {\n        id: 'medicaid',\n        name: 'Utah Medicaid',\n        icon: '🏥',\n        description: 'State Medicaid program',\n        placeholder: 'Utah Medicaid',\n        networkStatus: 'in-network',\n        idRequired: true\n      },\n      {\n        id: 'molina',\n        name: 'Molina Healthcare',\n        icon: '🔷',\n        description: 'Medicaid managed care',\n        placeholder: 'Molina Healthcare of Utah',\n        networkStatus: 'in-network',\n        idRequired: true\n      },\n      {\n        id: 'selecthealth',\n        name: 'SelectHealth',\n        icon: '💠',\n        description: 'Private insurance',\n        placeholder: 'SelectHealth Community Care',\n        networkStatus: 'pending',\n        idRequired: false\n      },\n      {\n        id: 'anthem',\n        name: 'Anthem',\n        icon: '🔹',\n        description: 'Blue Cross Blue Shield',\n        placeholder: 'Anthem Blue Cross',\n        networkStatus: 'unknown',\n        idRequired: false\n      },\n      {\n        id: 'other',\n        name: 'Other Insurance',\n        icon: '📋',\n        description: 'Other insurance plans',\n        placeholder: 'Enter your insurance name',\n        networkStatus: 'unknown',\n        idRequired: false\n      }\n    ]\n\n    const canSubmit = computed(() => {\n      return form.value.firstName.trim() && \n             form.value.lastName.trim() && \n             form.value.dateOfBirth &&\n             selectedInsuranceType.value &&\n             form.value.insuranceName.trim() &&\n             (!selectedInsuranceType.value.idRequired || form.value.memberId.trim())\n    })\n\n    const selectInsuranceType = (insurance) => {\n      selectedInsuranceType.value = insurance\n      form.value.insuranceName = insurance.placeholder\n    }\n\n    const checkEligibility = async () => {\n      loading.value = true\n      result.value = null\n      \n      try {\n        const startTime = Date.now()\n        \n        const eligibilityResponse = await fetch('/api/medicaid/check', {\n          method: 'POST',\n          headers: {\n            'Content-Type': 'application/json',\n          },\n          body: JSON.stringify({\n            first: form.value.firstName,\n            last: form.value.lastName,\n            dob: form.value.dateOfBirth,\n            medicaidId: form.value.memberId,\n            gender: form.value.gender,\n            insuranceName: form.value.insuranceName,\n            insuranceType: selectedInsuranceType.value.id\n          })\n        })\n        \n        const eligibilityData = await eligibilityResponse.json()\n        const responseTime = Date.now() - startTime\n\n        // Enhanced result processing\n        const enhancedResult = {\n          ...eligibilityData,\n          insuranceType: selectedInsuranceType.value,\n          responseTime,\n          canSchedule: eligibilityData.enrolled || selectedInsuranceType.value.networkStatus === 'in-network',\n          networkStatus: selectedInsuranceType.value.networkStatus,\n          patientInfo: {\n            firstName: form.value.firstName,\n            lastName: form.value.lastName,\n            dob: form.value.dateOfBirth,\n            email: form.value.email,\n            phone: form.value.phone\n          }\n        }\n        \n        result.value = enhancedResult\n        emit('result', enhancedResult)\n        \n      } catch (error) {\n        console.error('Error checking eligibility:', error)\n        result.value = {\n          enrolled: false,\n          error: 'Unable to verify coverage right now. Please contact our team for assistance.',\n          canSchedule: false,\n          contactRecommended: true\n        }\n      } finally {\n        loading.value = false\n      }\n    }\n\n    const handleRequestHelp = () => {\n      // Open help modal or contact form\n      console.log('Patient requested help with eligibility')\n    }\n\n    return {\n      form,\n      loading,\n      result,\n      selectedInsuranceType,\n      insuranceTypes,\n      canSubmit,\n      selectInsuranceType,\n      checkEligibility,\n      handleRequestHelp\n    }\n  }\n}\n</script>\n\n<style scoped>\n/* Enhanced form styling */\ninput:focus, select:focus {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(191, 156, 115, 0.15);\n}\n\n.insurance-card:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\n}\n</style>