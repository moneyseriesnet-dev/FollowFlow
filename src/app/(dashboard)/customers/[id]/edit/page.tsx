import CustomerForm from '@/components/customers/customer-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCustomerPage({ params }: PageProps) {
  const { id } = await params
  
  return (
    <div className="py-6">
      <CustomerForm customerId={id} />
    </div>
  )
}
