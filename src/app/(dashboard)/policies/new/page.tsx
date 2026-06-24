import { Suspense } from 'react'
import PolicyForm from '@/components/policies/policy-form'
import { Loader2 } from 'lucide-react'

export default function NewPolicyPage() {
  return (
    <div className="py-6">
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        }
      >
        <PolicyForm />
      </Suspense>
    </div>
  )
}
