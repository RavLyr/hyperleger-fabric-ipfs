import Link from "next/link"
import RegisterIssuerForm from "./register-issuer-form"
import PublicShell from "@/components/ui/public-shell"
import Footer from "@/components/ui/footer"

export default function RegisterPage() {
  return (
    <PublicShell>
      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-6 py-16">
        <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0px_20px_60px_-15px_rgba(37,99,235,0.18)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="bg-slate-950 p-8 text-white md:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-300">
              Issuer Registration
            </p>

            <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">
              Daftarkan Institusi Penerbit Ijazah
            </h1>

            <p className="mt-4 text-sm leading-6 text-slate-300">
              Registrasi ini digunakan untuk mendaftarkan institusi penerbit
              ijazah ke sistem verifikasi berbasis Hyperledger Fabric.
            </p>

            <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              <p className="font-semibold text-white">Data yang dibutuhkan:</p>

              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>Issuer ID unik</li>
                <li>Nama organisasi atau universitas</li>
                <li>Departemen atau fakultas</li>
                <li>MSP ID organisasi Fabric</li>
              </ul>
            </div>

            <div className="mt-6 rounded-xl border border-blue-300/20 bg-blue-300/10 p-5 text-sm leading-6 text-blue-100">
              Data issuer yang berhasil didaftarkan akan digunakan saat proses
              penerbitan ijazah digital dan pencatatan metadata sertifikat ke
              ledger.
            </div>

            <p className="mt-8 text-sm text-slate-300">
              Sudah punya akun?{" "}
              <Link href="/login" className="font-bold text-blue-300">
                Login di sini
              </Link>
            </p>
          </section>

          <section className="p-8 md:p-10">
            <RegisterIssuerForm />
          </section>
        </div>
      </main>

      <Footer />
    </PublicShell>
  )
}