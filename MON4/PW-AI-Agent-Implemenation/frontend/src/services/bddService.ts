import api from './api';

export async function generateBdd(testCases: any[]) {
  const { data } = await api.post('/generate-bdd', { testCases });
  return data;
}
