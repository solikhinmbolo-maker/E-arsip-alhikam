export interface ArsipItem {
  id: string;
  tanggal: string;
  tahun: string;
  identitas: string;
  subjek: string;
  kategori: string;
  kategoriUtama: 'Arsip Siswa' | 'Arsip Guru' | 'Arsip Lainnya';
  namaFileAsli: string;
  ukuran?: string;
  linkDrive?: string;
  uploader: string;
  fileDataUrl?: string;
  isTrash?: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MasterSiswa {
  id: string;
  nisn: string;
  nama: string;
  tahun: string;
  jenisKelamin: string;
  tanggalTerdaftar?: string;
}

export interface MasterGuru {
  id: string;
  nuptk: string;
  nama: string;
  jabatan: string;
  tanggalTerdaftar?: string;
}
