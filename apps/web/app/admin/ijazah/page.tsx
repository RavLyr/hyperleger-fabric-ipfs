import Dashboard from "./dashboard"

type DashboardPageProps = {
  searchParams?: Promise<{
    q?: string
    status?: string
    page?: string
    perPage?: string
  }>
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  return <Dashboard searchParams={searchParams} />
}