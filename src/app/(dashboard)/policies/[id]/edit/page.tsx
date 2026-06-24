import { Suspense } from 'react'
import PolicyForm from '@/components/policies/policy-form'
import { Loader2 } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditPolicyPage({ params }: PageProps) {
  const { id } = await params
  
  return (
    <div className="py-6">
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        }
      >
        <PolicyForm policyId={id} />
      </Suspense>
    </div>
  )
}
