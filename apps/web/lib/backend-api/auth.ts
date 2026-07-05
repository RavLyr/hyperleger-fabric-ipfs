import { backendFetch } from "./client"
import type {
  LoginInput,
  LoginResponse,
  RegisterIssuerAdminInput,
} from "./types"

export async function loginIssuerAdmin(input: LoginInput) {
  return backendFetch(
    "/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identifier: input.identifier,
        password: input.password,
      }),
    },
    { auth: false }
  ) as Promise<LoginResponse>
}

export async function registerIssuerAdmin(input: RegisterIssuerAdminInput) {
  const response = await backendFetch(
    "/auth/register",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    { auth: false }
  )

  return response
}