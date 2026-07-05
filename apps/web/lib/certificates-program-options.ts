export type CertificateProgramOption = {
  faculty: string
  educationLevel: "S1" | "S.Tr" | "Profesi"
  studyProgram: string
  degreeTitle: string
}

export const certificateProgramOptions: CertificateProgramOption[] = [
  // Hukum [cite: 1]
  {
    faculty: "Fakultas Hukum",
    educationLevel: "S1",
    studyProgram: "Hukum",
    degreeTitle: "Sarjana Hukum (S.H.)",
  },

  // Ekonomika dan Bisnis 
  {
    faculty: "Fakultas Ekonomika dan Bisnis",
    educationLevel: "S1",
    studyProgram: "Akuntansi",
    degreeTitle: "Sarjana Akuntansi (S.Ak.)",
  },
  {
    faculty: "Fakultas Ekonomika dan Bisnis",
    educationLevel: "S1",
    studyProgram: "Ilmu Ekonomi",
    degreeTitle: "Sarjana Ekonomi (S.E.)",
  },
  {
    faculty: "Fakultas Ekonomika dan Bisnis",
    educationLevel: "S1",
    studyProgram: "Manajemen",
    degreeTitle: "Sarjana Manajemen (S.M.)",
  },
  {
    faculty: "Fakultas Ekonomika dan Bisnis",
    educationLevel: "S1",
    studyProgram: "Ekonomi Islam",
    degreeTitle: "Sarjana Ekonomi (S.E.)",
  },
  {
    faculty: "Fakultas Ekonomika dan Bisnis",
    educationLevel: "S1",
    studyProgram: "Bisnis Digital",
    degreeTitle: "Sarjana Bisnis Digital (S.Bd.)",
  },

  // Ilmu Sosial dan Ilmu Politik (FISIP) [cite: 3]
  {
    faculty: "Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)",
    educationLevel: "S1",
    studyProgram: "Administrasi Bisnis",
    degreeTitle: "Sarjana Administrasi Bisnis (S.A.B.)",
  },
  {
    faculty: "Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)",
    educationLevel: "S1",
    studyProgram: "Administrasi Publik",
    degreeTitle: "Sarjana Administrasi Publik (S.A.P.)",
  },
  {
    faculty: "Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)",
    educationLevel: "S1",
    studyProgram: "Ilmu Pemerintahan",
    degreeTitle: "Sarjana Ilmu Pemerintahan (S.I.P.)",
  },
  {
    faculty: "Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)",
    educationLevel: "S1",
    studyProgram: "Ilmu Komunikasi",
    degreeTitle: "Sarjana Ilmu Komunikasi (S.I.Kom.)",
  },
  {
    faculty: "Fakultas Ilmu Sosial dan Ilmu Politik (FISIP)",
    educationLevel: "S1",
    studyProgram: "Hubungan Internasional",
    degreeTitle: "Sarjana Hubungan Internasional (S.Sos.)",
  },

  // Ilmu Budaya (FIB) [cite: 3, 4]
  {
    faculty: "Fakultas Ilmu Budaya (FIB)",
    educationLevel: "S1",
    studyProgram: "Sastra Inggris",
    degreeTitle: "Sarjana Sastra (S.S.)",
  },
  {
    faculty: "Fakultas Ilmu Budaya (FIB)",
    educationLevel: "S1",
    studyProgram: "Indonesia",
    degreeTitle: "Sarjana Sastra (S.S.)",
  },
  {
    faculty: "Fakultas Ilmu Budaya (FIB)",
    educationLevel: "S1",
    studyProgram: "Sejarah",
    degreeTitle: "Sarjana Humaniora (S.Hum.)",
  },
  {
    faculty: "Fakultas Ilmu Budaya (FIB)",
    educationLevel: "S1",
    studyProgram: "Ilmu Perpustakaan",
    degreeTitle: "Sarjana Humaniora (S.Hum.)",
  },
  {
    faculty: "Fakultas Ilmu Budaya (FIB)",
    educationLevel: "S1",
    studyProgram: "Antropologi Sosial",
    degreeTitle: "Sarjana Sosial (S.Sos.)",
  },
  {
    faculty: "Fakultas Ilmu Budaya (FIB)",
    educationLevel: "S1",
    studyProgram: "Bahasa dan Kebudayaan Jepang",
    degreeTitle: "Sarjana Linguistik (S.Li.)",
  },

  // Kedokteran (FK) [cite: 4, 5, 6]
  {
    faculty: "Fakultas Kedokteran (FK)",
    educationLevel: "S1",
    studyProgram: "Kedokteran",
    degreeTitle: "Sarjana Kedokteran (S.Ked.)",
  },
  {
    faculty: "Fakultas Kedokteran (FK)",
    educationLevel: "Profesi",
    studyProgram: "Profesi Dokter",
    degreeTitle: "Dokter (dr.)",
  },
  {
    faculty: "Fakultas Kedokteran (FK)",
    educationLevel: "S1",
    studyProgram: "Ilmu Gizi",
    degreeTitle: "Sarjana Gizi (S.Gz.)",
  },
  {
    faculty: "Fakultas Kedokteran (FK)",
    educationLevel: "S1",
    studyProgram: "Keperawatan",
    degreeTitle: "Sarjana Keperawatan (S.Kep.)",
  },
  {
    faculty: "Fakultas Kedokteran (FK)",
    educationLevel: "Profesi",
    studyProgram: "Profesi Ners",
    degreeTitle: "Ners (Ns)",
  },
  {
    faculty: "Fakultas Kedokteran (FK)",
    educationLevel: "S1",
    studyProgram: "Farmasi",
    degreeTitle: "Sarjana Farmasi (S.Farm.)",
  },
  {
    faculty: "Fakultas Kedokteran (FK)",
    educationLevel: "S1",
    studyProgram: "Kedokteran Gigi",
    degreeTitle: "Sarjana Kedokteran Gigi (S.K.G.)",
  },
  {
    faculty: "Fakultas Kedokteran (FK)",
    educationLevel: "Profesi",
    studyProgram: "Profesi Dokter Gigi",
    degreeTitle: "Dokter Gigi (drg.)",
  },

  // Kesehatan Masyarakat (FKM) [cite: 6]
  {
    faculty: "Fakultas Kesehatan Masyarakat (FKM)",
    educationLevel: "S1",
    studyProgram: "Kesehatan Masyarakat",
    degreeTitle: "Sarjana Kesehatan Masyarakat (S.K.M.)",
  },
  {
    faculty: "Fakultas Kesehatan Masyarakat (FKM)",
    educationLevel: "S1",
    studyProgram: "Keselamatan dan Kesehatan Kerja",
    degreeTitle: "Sarjana Keselamatan dan Kesehatan Kerja (S.KKK.)",
  },

  // Perikanan dan Kelautan (FPIK) [cite: 6, 7]
  {
    faculty: "Fakultas Perikanan dan Kelautan (FPIK)",
    educationLevel: "S1",
    studyProgram: "Akuakultur",
    degreeTitle: "Sarjana Perikanan (S.Pi.)",
  },
  {
    faculty: "Fakultas Perikanan dan Kelautan (FPIK)",
    educationLevel: "S1",
    studyProgram: "Ilmu Kelautan",
    degreeTitle: "Sarjana Sains (S.Si.)",
  },
  {
    faculty: "Fakultas Perikanan dan Kelautan (FPIK)",
    educationLevel: "S1",
    studyProgram: "Manajemen Sumberdaya Perairan",
    degreeTitle: "Sarjana Perikanan (S.Pi.)",
  },
  {
    faculty: "Fakultas Perikanan dan Kelautan (FPIK)",
    educationLevel: "S1",
    studyProgram: "Oseanografi",
    degreeTitle: "Sarjana Sains (S.Si.)",
  },
  {
    faculty: "Fakultas Perikanan dan Kelautan (FPIK)",
    educationLevel: "S1",
    studyProgram: "Perikanan Tangkap",
    degreeTitle: "Sarjana Perikanan (S.Pi.)",
  },
  {
    faculty: "Fakultas Perikanan dan Kelautan (FPIK)",
    educationLevel: "S1",
    studyProgram: "Teknologi Hasil Perikanan",
    degreeTitle: "Sarjana Perikanan (S.Pi.)",
  },

  // Peternakan dan Pertanian (FPP) [cite: 7, 8]
  {
    faculty: "Fakultas Peternakan dan Pertanian (FPP)",
    educationLevel: "S1",
    studyProgram: "Peternakan",
    degreeTitle: "Sarjana Peternakan (S.Pt.)",
  },
  {
    faculty: "Fakultas Peternakan dan Pertanian (FPP)",
    educationLevel: "S1",
    studyProgram: "Agribisnis",
    degreeTitle: "Sarjana Pertanian (S.P.)",
  },
  {
    faculty: "Fakultas Peternakan dan Pertanian (FPP)",
    educationLevel: "S1",
    studyProgram: "Agroekoteknologi",
    degreeTitle: "Sarjana Pertanian (S.P.)",
  },
  {
    faculty: "Fakultas Peternakan dan Pertanian (FPP)",
    educationLevel: "S1",
    studyProgram: "Teknologi Pangan",
    degreeTitle: "Sarjana Teknologi Pangan (S.T.P.)",
  },

  // Psikologi (FPSI) [cite: 8]
  {
    faculty: "Fakultas Psikologi (FPSI)",
    educationLevel: "S1",
    studyProgram: "Psikologi",
    degreeTitle: "Sarjana Psikologi (S.Psi.)",
  },

  // Sains dan Matematika (FSM) [cite: 8, 9]
  {
    faculty: "Fakultas Sains dan Matematika (FSM)",
    educationLevel: "S1",
    studyProgram: "Matematika",
    degreeTitle: "Sarjana Matematika (S.Mat.)",
  },
  {
    faculty: "Fakultas Sains dan Matematika (FSM)",
    educationLevel: "S1",
    studyProgram: "Biologi",
    degreeTitle: "Sarjana Sains (S.Si.)",
  },
  {
    faculty: "Fakultas Sains dan Matematika (FSM)",
    educationLevel: "S1",
    studyProgram: "Kimia",
    degreeTitle: "Sarjana Sains (S.Si.)",
  },
  {
    faculty: "Fakultas Sains dan Matematika (FSM)",
    educationLevel: "S1",
    studyProgram: "Fisika",
    degreeTitle: "Sarjana Sains (S.Si.)",
  },
  {
    faculty: "Fakultas Sains dan Matematika (FSM)",
    educationLevel: "S1",
    studyProgram: "Statistika",
    degreeTitle: "Sarjana Statistika (S.Stat.)",
  },
  {
    faculty: "Fakultas Sains dan Matematika (FSM)",
    educationLevel: "S1",
    studyProgram: "Bioteknologi",
    degreeTitle: "Sarjana Sains (S.Si.)",
  },
  {
    faculty: "Fakultas Sains dan Matematika (FSM)",
    educationLevel: "S1",
    studyProgram: "Informatika",
    degreeTitle: "Sarjana Informatika (S.Kom.)",
  },

  // Teknik [cite: 9, 10, 11]
  {
    faculty: "Fakultas Teknik",
    educationLevel: "S1",
    studyProgram: "Teknik Komputer",
    degreeTitle: "Sarjana Teknik (S.T.)",
  },
  {
    faculty: "Fakultas Teknik",
    educationLevel: "S1",
    studyProgram: "Teknik Geodesi",
    degreeTitle: "Sarjana Teknik (S.T.)",
  },
  {
    faculty: "Fakultas Teknik",
    educationLevel: "S1",
    studyProgram: "Teknik Geologi",
    degreeTitle: "Sarjana Teknik (S.T.)",
  },
  {
    faculty: "Fakultas Teknik",
    educationLevel: "S1",
    studyProgram: "Teknik Perkapalan",
    degreeTitle: "Sarjana Teknik (S.T.)",
  },
  {
    faculty: "Fakultas Teknik",
    educationLevel: "S1",
    studyProgram: "Teknik Lingkungan",
    degreeTitle: "Sarjana Teknik (S.T.)",
  },
  {
    faculty: "Fakultas Teknik",
    educationLevel: "S1",
    studyProgram: "Teknik Industri",
    degreeTitle: "Sarjana Teknik (S.T.)",
  },
  {
    faculty: "Fakultas Teknik",
    educationLevel: "S1",
    studyProgram: "Teknik Elektro",
    degreeTitle: "Sarjana Teknik (S.T.)",
  },
  {
    faculty: "Fakultas Teknik",
    educationLevel: "S1",
    studyProgram: "Teknik Mesin",
    degreeTitle: "Sarjana Teknik (S.T.)",
  },
  {
    faculty: "Fakultas Teknik",
    educationLevel: "S1",
    studyProgram: "Teknik Kimia",
    degreeTitle: "Sarjana Teknik (S.T.)",
  },
  {
    faculty: "Fakultas Teknik",
    educationLevel: "S1",
    studyProgram: "Arsitektur",
    degreeTitle: "Sarjana Arsitektur (S.Ars.)",
  },
  {
    faculty: "Fakultas Teknik",
    educationLevel: "S1",
    studyProgram: "Perencanaan Wilayah dan Kota",
    degreeTitle: "Sarjana Perencanaan Wilayah dan Kota (S.P.W.K.)",
  },

  // Sekolah Vokasi [cite: 11, 12, 13]
  {
    faculty: "Sekolah Vokasi",
    educationLevel: "S.Tr",
    studyProgram: "Teknik Infrastruktur Sipil dan Perencanaan Arsitektur",
    degreeTitle: "Sarjana Terapan Teknik (S.Tr.T.)",
  },
  {
    faculty: "Sekolah Vokasi",
    educationLevel: "S.Tr",
    studyProgram: "Perencanaan Tata Ruang dan Pertanahan",
    degreeTitle: "Sarjana Terapan Teknik (S.Tr.T.)",
  },
  {
    faculty: "Sekolah Vokasi",
    educationLevel: "S.Tr",
    studyProgram: "Teknologi Rekayasa Kimia Industri",
    degreeTitle: "Sarjana Terapan Teknik (S.Tr.T.)",
  },
  {
    faculty: "Sekolah Vokasi",
    educationLevel: "S.Tr",
    studyProgram: "Rekayasa Perancangan Mekanik",
    degreeTitle: "Sarjana Terapan Teknik (S.Tr.T.)",
  },
  {
    faculty: "Sekolah Vokasi",
    educationLevel: "S.Tr",
    studyProgram: "Teknologi Rekayasa Otomasi",
    degreeTitle: "Sarjana Terapan Teknik (S.Tr.T.)",
  },
  {
    faculty: "Sekolah Vokasi",
    educationLevel: "S.Tr",
    studyProgram: "Teknologi Rekayasa Konstruksi Perkapalan",
    degreeTitle: "Sarjana Terapan Teknik (S.Tr.T.)",
  },
  {
    faculty: "Sekolah Vokasi",
    educationLevel: "S.Tr",
    studyProgram: "Teknik Listrik Industri",
    degreeTitle: "Sarjana Terapan Teknik (S.Tr.T.)",
  },
  {
    faculty: "Sekolah Vokasi",
    educationLevel: "S.Tr",
    studyProgram: "Akuntansi Perpajakan",
    degreeTitle: "Sarjana Terapan Akuntansi (S.Tr.Ak.)",
  },
  {
    faculty: "Sekolah Vokasi",
    educationLevel: "S.Tr",
    studyProgram: "Manajemen dan Administrasi Logistik",
    degreeTitle: "Sarjana Terapan Manajemen (S.Tr.M.)",
  },
  {
    faculty: "Sekolah Vokasi",
    educationLevel: "S.Tr",
    studyProgram: "Bahasa Asing Terapan",
    degreeTitle: "Sarjana Terapan Linguistik (S.Tr.Li.)",
  },
  {
    faculty: "Sekolah Vokasi",
    educationLevel: "S.Tr",
    studyProgram: "Informasi dan Hubungan Masyarakat",
    degreeTitle: "Sarjana Terapan Sistem Informasi (S.Tr.S.I.)",
  },
]