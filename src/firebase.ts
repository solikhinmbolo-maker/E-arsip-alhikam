// Firebase disabled per user preference (Server switched exclusively to Supabase Cloud)
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export async function testFirestoreConnection(): Promise<boolean> {
  return true;
}

export function subscribeToArsip(onUpdate: (items: any[]) => void) {
  return () => {};
}

export function subscribeToMasterSiswa(onUpdate: (items: any[]) => void) {
  return () => {};
}

export function subscribeToMasterGuru(onUpdate: (items: any[]) => void) {
  return () => {};
}

export async function saveArsipToFirestore(item: any): Promise<boolean> {
  return true;
}

export async function deleteArsipFromFirestore(id: string): Promise<boolean> {
  return true;
}

export async function saveSiswaToFirestore(siswa: any): Promise<boolean> {
  return true;
}

export async function deleteSiswaFromFirestore(id: string): Promise<boolean> {
  return true;
}

export async function saveGuruToFirestore(guru: any): Promise<boolean> {
  return true;
}

export async function deleteGuruFromFirestore(id: string): Promise<boolean> {
  return true;
}

