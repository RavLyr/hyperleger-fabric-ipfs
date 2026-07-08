import { Suspense } from "react"
import { redirect } from "next/navigation"
import LoginForm from "./login-form"
import { getAuthSession } from "@/lib/auth/session"

export default async function LoginPage() {
  const session = await getAuthSession()

  if (session) {
    redirect("/admin/ijazah")
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
