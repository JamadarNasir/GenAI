import api from './api';

export async function generateCode(features: any[]) {
  const { data } = await api.post('/generate-code', { features });
  return data;
}
